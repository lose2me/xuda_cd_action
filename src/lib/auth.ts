import { NextRequest, NextResponse } from 'next/server';
import { getAdminSecret } from '@/lib/config';
import { getLanguages } from '@/lib/languages';

export function verifyAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  if (!auth) return false;

  try {
    const token = auth.replace('Bearer ', '');
    const decoded = Buffer.from(token, 'base64').toString();
    const secret = decoded.split(':')[0];
    return secret === getAdminSecret();
  } catch {
    return false;
  }
}
