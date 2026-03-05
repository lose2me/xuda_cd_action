import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/auth';
import { getLanguages } from '@/lib/languages';

export async function GET(request: NextRequest) {
  const lang = getLanguages();

  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: lang.admin.login_error }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalCheckins,
      todayCheckins,
      pendingCount,
      approvedCount,
      flaggedCount,
      rankings,
    ] = await Promise.all([
      prisma.checkIn.count(),
      prisma.checkIn.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.checkIn.count({ where: { status: 'PENDING' } }),
      prisma.checkIn.count({ where: { status: 'APPROVED' } }),
      prisma.checkIn.count({ where: { isFlagged: true } }),
      prisma.user.findMany({
        where: { checkInCount: { gt: 0 } },
        orderBy: { checkInCount: 'desc' },
        take: 50,
        select: {
          id: true,
          phone: true,
          name: true,
          college: true,
          className: true,
          checkInCount: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalCheckins,
      todayCheckins,
      pendingCount,
      approvedCount,
      flaggedCount,
      rankings,
    });
  } catch {
    return NextResponse.json({ error: lang.common.error }, { status: 500 });
  }
}
