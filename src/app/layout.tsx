import type { Metadata } from 'next';
import './globals.css';
import { getLang } from '@/lib/config';

export function generateMetadata(): Metadata {
  const lang = getLang();
  return {
    title: lang.common.app_title,
    description: lang.common.app_description,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-brutal antialiased">{children}</body>
    </html>
  );
}
