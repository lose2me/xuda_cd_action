import { getLang } from '@/lib/config';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = getLang();
  return <AdminLayout lang={lang}>{children}</AdminLayout>;
}
