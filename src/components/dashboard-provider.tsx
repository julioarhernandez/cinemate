
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

  console.log('[DashboardProvider] Component rendered.', { 
    loading, 
    user: user ? { uid: user.uid, email: user.email } : null 
  });

  useEffect(() => {
    // This effect's only job is to redirect if auth is resolved and there's no user.
    if (!loading && !user) {
      console.log('[DashboardProvider] No user found after loading. Redirecting to login.');
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    // Only proceed if we have a user, a session ID, and haven't attached a listener yet.
    if (user && sessionId && !listenerAttached.current) {
      console.log(`[DashboardProvider] Conditions met. Attaching listener for session: ${sessionId}, user: ${user.uid}`);
      listenerAttached.current = true; // Mark as attached immediately.

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

        // Check for payment success (indicated by the `url` field)
        if (url) {
            console.log('[DashboardProvider] Session confirmed with URL. Preparing to update user tier.');
          
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
                console.log('[DashboardProvider] Payment processed. Cleaning up URL and unsubscribing.');
                unsubscribe(); // Stop listening
                router.replace('/dashboard'); // Clean URL
            }
        } else if (error) {
            // Check for a payment error
            console.log('[DashboardProvider] Detected error in session document:', error.message);
            toast({
              variant: "destructive",
              title: "Checkout Error",
              description: error.message,
            });
            unsubscribe(); // Stop listening
            router.replace('/dashboard'); // Clean URL
        } else {
             console.log('[DashboardProvider] Document exists, but no `url` or `error`. Waiting for next snapshot.');
        }
      }, (err) => {
          console.error("[DashboardProvider] Snapshot listener error:", err);
          unsubscribe();
          router.replace('/dashboard');
      });

      // This cleanup function is crucial. It runs if the component unmounts for any reason.
      return () => {
        console.log('[DashboardProvider] useEffect cleanup. Unsubscribing from snapshot listener.');
        unsubscribe();
        listenerAttached.current = false; // Reset for potential future navigation.
      };
    }
  // We only want this effect to re-run if the user object or search params change.
  }, [user, searchParams, router, toast]);


  if (loading) {
    console.log('[DashboardProvider] Rendering loading spinner.');
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    console.log('[DashboardProvider] Rendering null while redirecting.');
    // While redirecting, render nothing.
    return null;
  }

  console.log('[DashboardProvider] Auth complete. Rendering children.');
  return <>{children}</>;
}
