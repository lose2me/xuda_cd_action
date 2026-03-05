import AdminDashboard from '@/components/admin/AdminDashboard';
import { getLang } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  const lang = getLang();
  return <AdminDashboard lang={lang} />;
}
