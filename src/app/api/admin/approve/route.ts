import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';
import { getLanguages } from '@/lib/languages';

export async function POST(request: NextRequest) {
  const lang = getLanguages();

  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: lang.admin.login_error }, { status: 401 });
  }

  try {
    const { checkInId } = await request.json();

    const checkIn = await prisma.checkIn.findUnique({
      where: { id: checkInId },
    });

    if (!checkIn) {
      return NextResponse.json({ error: lang.admin.no_records }, { status: 404 });
    }

    if (checkIn.status === 'APPROVED') {
      return NextResponse.json({ error: lang.admin.approved }, { status: 400 });
    }

    await prisma.checkIn.update({
      where: { id: checkInId },
      data: { status: 'APPROVED' },
    });

    await prisma.user.update({
      where: { id: checkIn.userId },
      data: { checkInCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      message: lang.admin.approve_success,
    });
  } catch {
    return NextResponse.json({ error: lang.common.error }, { status: 500 });
  }
}
