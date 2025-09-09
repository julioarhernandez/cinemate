
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot,
  Clapperboard,
  Film,
  LayoutDashboard,
  Users,
  Library,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { UserProfile } from '@/components/user-profile';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/movies', icon: Film, label: 'Movies' },
  { href: '/dashboard/collections', icon: Library, label: 'My Collection' },
  { href: '/dashboard/friends', icon: Users, label: 'Friends' },
  {
    href: '/dashboard/ai-recommender',
    icon: Bot,
    label: 'AI Recommender',
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { open, setOpen, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpen(false);
    }
  };
  
  return (
    <>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <Clapperboard className="h-6 w-6 text-primary" />
                </Link>
              </Button>
              <h2 className="font-headline text-xl font-bold">CineMate</h2>
            </div>
          <SidebarTrigger className="md:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                onClick={handleLinkClick}
                className={cn(
                  'justify-start',
                  pathname === item.href &&
                    'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/20 dark:text-white'
                )}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t md:hidden">
        <UserProfile />
      </SidebarFooter>
    </>
  );
}
