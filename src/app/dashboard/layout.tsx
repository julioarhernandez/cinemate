
"use client";

import type { ReactNode } from 'react';
import { SidebarProvider, Sidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardNav } from '@/components/dashboard-nav';
import { UserProfile } from '@/components/user-profile';
import { DashboardProvider } from '@/components/dashboard-provider';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

function CheckoutListener() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const listenerAttached = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (user && sessionId && !listenerAttached.current) {
      console.log(`[CheckoutListener] Detected session_id: ${sessionId} for user: ${user.uid}`);
      listenerAttached.current = true; // Prevents attaching multiple listeners

      const sessionDocRef = doc(db, 'customers', user.uid, 'checkout_sessions', sessionId);
      console.log(`[CheckoutListener] Attaching snapshot listener to: ${sessionDocRef.path}`);

      const unsubscribe = onSnapshot(sessionDocRef, async (snap) => {
        console.log('[CheckoutListener] Snapshot listener fired.');
        
        if (!snap.exists()) {
          console.log('[CheckoutListener] Document does not exist yet. Waiting for Stripe webhook...');
          return;
        }

        const data = snap.data();
        const error = data?.error;
        const url = data?.url;
        console.log('[CheckoutListener] Snapshot data:', data);

        if (error) {
          console.log('[CheckoutListener] Detected error in session document:', error.message);
          unsubscribe();
          toast({
            variant: "destructive",
            title: "Checkout Error",
            description: error.message,
          });
          router.replace('/dashboard');
        } else if (url) {
          console.log('[CheckoutListener] Session confirmed with URL. Preparing to update user tier.');
          unsubscribe();
            
          const userDocRef = doc(db, 'users', user.uid);
          console.log(`[CheckoutListener] Attempting to update tier to 'pro' for user ID: ${user.uid}`);
            
          try {
              await updateDoc(userDocRef, {
                  tier: 'pro'
              });
                
              console.log('[CheckoutListener] Successfully updated user tier in Firestore.');
              toast({
                  title: "Upgrade Successful!",
                  description: `Welcome to the Pro plan! UID: ${user.uid}, Email: ${user.email}`,
              });
          } catch (updateError) {
              console.error("[CheckoutListener] Failed to update user tier:", updateError);
              toast({
                  variant: "destructive",
                  title: "Update Failed",
                  description: "Your payment was successful, but we failed to update your account. Please contact support.",
              });
          } finally {
              console.log('[CheckoutListener] Redirecting to clean up URL.');
              router.replace('/dashboard');
          }
        } else {
             console.log('[CheckoutListener] Document exists, but `url` is not yet present. Waiting for next snapshot.');
        }
      }, (err) => {
          console.error("[CheckoutListener] Snapshot listener error:", err);
          unsubscribe();
          router.replace('/dashboard');
      });

      return () => {
        console.log('[CheckoutListener] Cleaning up snapshot listener.');
        unsubscribe();
      };
    }
  }, [searchParams, user, router, toast]);

  return null; // This component does not render anything
}


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
       <CheckoutListener />
      <div className="flex min-h-screen">
        <Sidebar collapsible="icon" className="bg-sidebar text-sidebar-foreground">
          <DashboardNav />
        </Sidebar>
        <div className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm md:justify-end">
            <SidebarTrigger className="md:hidden" />
            <UserProfile />
          </header>
          <main className="p-4 sm:p-6 lg:p-8">
            <DashboardProvider>
                {children}
            </DashboardProvider>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
