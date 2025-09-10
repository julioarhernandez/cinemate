
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
import { useFriendRequestCount } from '@/hooks/use-friend-request-count';


const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/movies', icon: Film, label: 'Movies' },
  { href: '/dashboard/collections', icon: Library, label: 'My Collection' },
  { href: '/dashboard/watchlist', icon: Bookmark, label: 'Watchlist' },
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
  const friendRequestCount = useFriendRequestCount();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
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
                isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                onClick={handleLinkClick}
                className={cn(
                  'justify-start',
                   (pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')) &&
                    'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/20 dark:text-white'
                )}
                tooltip={item.label}
              >
                <Link href={item.href} className="relative">
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                   {item.href === '/dashboard/friends' && friendRequestCount > 0 && (
                     <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {friendRequestCount}
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
