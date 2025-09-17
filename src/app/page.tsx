
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginPageClient } from './login-page-client';

function LoginPageFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
