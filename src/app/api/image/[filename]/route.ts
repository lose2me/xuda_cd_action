import { NextRequest, NextResponse } from 'next/server';
import { getUploadDir } from '@/lib/config';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize filename to prevent path traversal
  const sanitized = path.basename(filename);
  if (sanitized !== filename || filename.includes('..')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const uploadDir = getUploadDir();
  const filePath = path.join(process.cwd(), uploadDir, sanitized);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
