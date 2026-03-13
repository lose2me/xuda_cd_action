import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Use China timezone for "today" calculation
    const nowInChina = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
    nowInChina.setHours(0, 0, 0, 0);
    const today = nowInChina;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalCheckins, todayCheckins] = await Promise.all([
      prisma.checkIn.count(),
      prisma.checkIn.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
    ]);

    return NextResponse.json({ totalCheckins, todayCheckins });
  } catch (error) {
    return NextResponse.json({
      totalCheckins: 0,
      todayCheckins: 0,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
