import { NextResponse } from 'next/server';
import { getLang } from '@/lib/config';

export async function GET() {
  const lang = getLang();
  return NextResponse.json(lang);
}
