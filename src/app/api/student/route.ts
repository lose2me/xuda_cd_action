import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Missing phone' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      checkInCount: true,
      name: true,
      college: true,
      className: true,
    },
  });

  if (!user) {
    return NextResponse.json({ checkInCount: 0, found: false });
  }

  return NextResponse.json({
    checkInCount: user.checkInCount,
    name: user.name,
    college: user.college,
    className: user.className,
    found: true,
  });
}
