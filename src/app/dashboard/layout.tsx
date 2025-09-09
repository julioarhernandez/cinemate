
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { SidebarProvider, Sidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNav } from '@/components/dashboard-nav';
import { UserProfile } from '@/components/user-profile';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    // If auth state is done loading and there's no user, redirect to login
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // While loading, show a full-screen loader to prevent flashing of content
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If user is logged in, render the dashboard layout
  if (user) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar
            collapsible="icon"
            className="border-r bg-background"
          >
            <DashboardNav />
          </Sidebar>
          <div className="flex-1">
            <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm md:justify-end">
                <SidebarTrigger className="md:hidden" />
                <UserProfile />
              </header>
            <main className="p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Return null or a loader while redirecting or if user is not available post-loading
  return null;
}
