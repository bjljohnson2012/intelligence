import { redirect } from 'next/navigation';
import { readRequestSession } from '@/lib/session';
import { LoginForm } from '@/app/login/login-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  if (readRequestSession()) redirect('/');
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <LoginForm />
    </main>
  );
}
