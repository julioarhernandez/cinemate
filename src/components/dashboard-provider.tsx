
"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const listenerAttached = useRef(false);

  useEffect(() => {
    // Wait until the auth state is fully resolved.
    if (loading) {
      return;
    }

    // If auth is resolved and there's no user, redirect to login.
    if (!user) {
      router.push("/");
      return;
    }

    // If we have a user, proceed with the checkout listener logic.
    const sessionId = searchParams.get('session_id');

    if (sessionId && !listenerAttached.current) {
      console.log(`[DashboardProvider] Detected session_id: ${sessionId} for user: ${user.uid}`);
      listenerAttached.current = true; // Prevents attaching multiple listeners for the same session

      const sessionDocRef = doc(db, 'customers', user.uid, 'checkout_sessions', sessionId);
      console.log(`[DashboardProvider] Attaching snapshot listener to: ${sessionDocRef.path}`);

      const unsubscribe = onSnapshot(sessionDocRef, async (snap) => {
        console.log('[DashboardProvider] Snapshot listener fired.');
        
        if (!snap.exists()) {
          console.log('[DashboardProvider] Document does not exist yet. Waiting for Stripe webhook...');
          return;
        }

        const data = snap.data();
        const error = data?.error;
        const url = data?.url;
        console.log('[DashboardProvider] Snapshot data:', data);

        if (error) {
          console.log('[DashboardProvider] Detected error in session document:', error.message);
          unsubscribe();
          toast({
            variant: "destructive",
            title: "Checkout Error",
            description: error.message,
          });
          router.replace('/dashboard');
        } else if (url) {
          console.log('[DashboardProvider] Session confirmed with URL. Preparing to update user tier.');
          unsubscribe();
            
          const userDocRef = doc(db, 'users', user.uid);
          console.log(`[DashboardProvider] Attempting to update tier to 'pro' for user ID: ${user.uid}`);
            
          try {
              await updateDoc(userDocRef, {
                  tier: 'pro'
              });
                
              console.log('[DashboardProvider] Successfully updated user tier in Firestore.');
              toast({
                  title: "Upgrade Successful!",
                  description: "Welcome to the Pro plan!",
              });
          } catch (updateError) {
              console.error("[DashboardProvider] Failed to update user tier:", updateError);
              toast({
                  variant: "destructive",
                  title: "Update Failed",
                  description: "Your payment was successful, but we failed to update your account. Please contact support.",
              });
          } finally {
              console.log('[DashboardProvider] Redirecting to clean up URL.');
              router.replace('/dashboard');
          }
        } else {
             console.log('[DashboardProvider] Document exists, but `url` is not yet present. Waiting for next snapshot.');
        }
      }, (err) => {
          console.error("[DashboardProvider] Snapshot listener error:", err);
          unsubscribe();
          router.replace('/dashboard');
      });

      return () => {
        console.log('[DashboardProvider] Cleaning up snapshot listener.');
        unsubscribe();
        listenerAttached.current = false; // Reset ref on cleanup
      };
    }
  }, [user, loading, router, searchParams, toast]);


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    // While redirecting, render nothing.
    return null;
  }

  return <>{children}</>;
}
