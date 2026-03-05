import { NextRequest, NextResponse } from 'next/server';
import { getAdminSecret } from '@/lib/config';
import { getLanguages } from '@/lib/languages';

export async function POST(request: NextRequest) {
  const lang = getLanguages();

  try {
    const { password } = await request.json();
    const secret = getAdminSecret();

    if (password !== secret) {
      return NextResponse.json(
        { error: lang.admin.login_error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      token: Buffer.from(`${secret}:${Date.now()}`).toString('base64'),
    });
  } catch {
    return NextResponse.json(
      { error: lang.common.error },
      { status: 500 }
    );
  }
}
