
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
  Bookmark,
  Activity,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { UserProfile } from '@/components/user-profile';
import { useFriendRequestCount } from '@/hooks/use-friend-request-count';
import { Logo } from '@/components/logo';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/movies', icon: Film, label: 'Browse Media' },
  { href: '/dashboard/collections', icon: Library, label: 'My Library' },
  { href: '/dashboard/friends', icon: Users, label: 'Friends' },
  { href: '/dashboard/activity', icon: Activity, label: 'Friend Activity' },
  {
    href: '/dashboard/ai-recommender',
    icon: Bot,
    label: 'AI Recommender',
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();
  const { incomingCount } = useFriendRequestCount();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Logo className="group-data-[collapsible=icon]:hidden" />
              <Clapperboard className="h-8 w-8 text-primary hidden group-data-[collapsible=icon]:block" />
            </Link>
          <SidebarTrigger className="md:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                size="lg"
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                onClick={handleLinkClick}
                className={cn(
                  'justify-start',
                   (pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')) &&
                    'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                tooltip={item.label}
              >
                <Link href={item.href} className="relative">
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                   {item.href === '/dashboard/friends' && incomingCount > 0 && (
                     <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {incomingCount}
                    </span>
                  )}
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
