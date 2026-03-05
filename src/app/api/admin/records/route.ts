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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || undefined;
    const phone = searchParams.get('phone') || undefined;

    const where: any = {};
    if (status) where.status = status;
    if (phone) where.user = { phone: { contains: phone } };

    const [records, total] = await Promise.all([
      prisma.checkIn.findMany({
        where,
        include: {
          user: {
            select: {
              phone: true,
              name: true,
              college: true,
              className: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.checkIn.count({ where }),
    ]);

    return NextResponse.json({
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch {
    return NextResponse.json({ error: lang.common.error }, { status: 500 });
  }
}
