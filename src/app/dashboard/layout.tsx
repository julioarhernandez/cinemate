import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNav } from '@/components/dashboard-nav';
import { UserProfile } from '@/components/user-profile';

export default function DashboardLayout({ children }: { children: ReactNode }) {
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
