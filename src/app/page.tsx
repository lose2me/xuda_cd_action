import StudentPage from '@/components/student/StudentPage';
import { getLang } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function Home() {
  const lang = getLang();
  return <StudentPage lang={lang} />;
}
