import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUploadDir, getMaxTimeDiffMinutes, getMinThoughtsLength } from '@/lib/config';
import { getLanguages } from '@/lib/languages';
import sharp from 'sharp';
import ExifReader from 'exifreader';
import fs from 'fs';
import path from 'path';

function parseExifDate(dateStr: string): Date | null {
  try {
    // EXIF format: "YYYY:MM:DD HH:MM:SS"
    const cleaned = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    const d = new Date(cleaned);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface WatermarkInfo {
  uploadTime: string;
  phone: string;
  name: string;
  college: string;
}

async function addWatermark(inputBuffer: Buffer, info: WatermarkInfo): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  const fontSize = Math.max(14, Math.floor(width / 35));
  const lineHeight = Math.floor(fontSize * 1.4);
  const padding = Math.floor(fontSize * 0.6);

  const lines = [
    escapeXml(info.uploadTime),
    escapeXml(`${info.phone} ${info.name}`),
    escapeXml(info.college),
  ];

  const blockHeight = lineHeight * lines.length + padding * 2;
  const maxLineChars = Math.max(...lines.map(l => l.length));
  const blockWidth = Math.floor(fontSize * maxLineChars * 0.55 + padding * 2);

  const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .wm {
          fill: white;
          font-size: ${fontSize}px;
          font-family: Arial, Helvetica, sans-serif;
          font-weight: bold;
        }
        .wm-bg {
          fill: rgba(0,0,0,0.5);
        }
      </style>
      <rect x="${width - blockWidth}" y="${height - blockHeight}"
            width="${blockWidth}" height="${blockHeight}"
            class="wm-bg" rx="0"/>
      ${lines.map((line, i) =>
        `<text x="${width - padding}" y="${height - blockHeight + padding + lineHeight * (i + 1) - Math.floor(fontSize * 0.3)}"
               text-anchor="end" class="wm">${line}</text>`
      ).join('\n')}
    </svg>`;

  return image
    .composite([{
      input: Buffer.from(svgText),
      gravity: 'southeast',
    }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  const lang = getLanguages();

  try {
    const formData = await request.formData();
    const phone = formData.get('phone') as string;
    const className = formData.get('className') as string;
    const name = formData.get('name') as string;
    const college = formData.get('college') as string;
    const thoughts = formData.get('thoughts') as string;
    const file = formData.get('photo') as File;

    if (!phone || !name || !college || !className || !thoughts || !file) {
      return NextResponse.json(
        { error: lang.student.fill_all_fields },
        { status: 400 }
      );
    }

    if (!/^\d{5,15}$/.test(phone)) {
      return NextResponse.json(
        { error: lang.student.phone_invalid },
        { status: 400 }
      );
    }

    if (thoughts.length < getMinThoughtsLength()) {
      return NextResponse.json(
        { error: lang.student.thoughts_too_short },
        { status: 400 }
      );
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      const todayCheckin = await prisma.checkIn.findFirst({
        where: {
          userId: existingUser.id,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });
      if (todayCheckin) {
        return NextResponse.json(
          { error: lang.student.already_checked_in },
          { status: 400 }
        );
      }
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const isLiveCapture = formData.get('liveCapture') === 'true';

    // Parse EXIF & determine flag status
    let exifTime: Date | null = null;
    let isFlagged = false;

    if (isLiveCapture) {
      // Live camera capture — photo is taken in real-time, auto-approve
      exifTime = new Date();
    } else {
      try {
        const tags = ExifReader.load(buffer);
        const dateTag = tags['DateTimeOriginal'];
        if (dateTag && dateTag.description) {
          exifTime = parseExifDate(dateTag.description);
        }
      } catch {
        // EXIF parsing failed
      }

      const maxDiff = getMaxTimeDiffMinutes();

      if (!exifTime) {
        isFlagged = true;
      } else {
        const now = new Date();
        const diffMs = now.getTime() - exifTime.getTime();
        const diffMinutes = diffMs / (1000 * 60);
        if (diffMinutes > maxDiff || diffMinutes < 0) {
          isFlagged = true;
        }
      }
    }

    const status = isFlagged ? 'PENDING' : 'APPROVED';

    // Add watermark
    const now = new Date();
    const uploadTimeStr = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const watermarkedBuffer = await addWatermark(buffer, {
      uploadTime: uploadTimeStr,
      phone,
      name,
      college,
    });

    // Create or update user first to get current check-in count
    // If user already exists, keep original name and college
    const user = await prisma.user.upsert({
      where: { phone },
      update: {},
      create: { phone, className, name, college, checkInCount: 0 },
    });

    // Count existing check-ins for this user to determine sequence number
    const existingCount = await prisma.checkIn.count({
      where: { userId: user.id },
    });
    const seq = existingCount + 1;

    // Save file with phone_seq naming
    const uploadDir = getUploadDir();
    const fullUploadDir = path.join(process.cwd(), uploadDir);
    if (!fs.existsSync(fullUploadDir)) {
      fs.mkdirSync(fullUploadDir, { recursive: true });
    }

    const filename = `${phone}_${seq}.jpg`;
    const filePath = path.join(fullUploadDir, filename);
    fs.writeFileSync(filePath, watermarkedBuffer);

    const imageUrl = `/${uploadDir.replace(/^public[\\/]/, '')}/${filename}`;

    await prisma.checkIn.create({
      data: {
        userId: user.id,
        imageUrl,
        thoughts,
        status,
        isFlagged,
        exifTime,
      },
    });

    // Update check-in count if approved
    if (status === 'APPROVED') {
      await prisma.user.update({
        where: { id: user.id },
        data: { checkInCount: { increment: 1 } },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return NextResponse.json({
      success: true,
      status,
      isFlagged,
      message: isFlagged ? lang.student.checkin_flagged : lang.student.checkin_success,
      checkInCount: updatedUser?.checkInCount || 0,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: lang.common.error },
      { status: 500 }
    );
  }
}
