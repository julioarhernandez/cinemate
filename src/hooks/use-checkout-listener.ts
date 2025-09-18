
"use client";

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'firebase/auth';

export function useCheckoutListener(user: User | null | undefined) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const listenerAttached = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    // Only proceed if we have a user, a session ID, and haven't attached a listener yet.
    if (user && sessionId && !listenerAttached.current) {
      console.log(`[useCheckoutListener] Conditions met. Attaching listener for session: ${sessionId}, user: ${user.uid}`);
      listenerAttached.current = true; // Mark as attached immediately.

      const sessionDocRef = doc(db, 'customers', user.uid, 'checkout_sessions', sessionId);
      console.log(`[useCheckoutListener] Attaching snapshot listener to: ${sessionDocRef.path}`);

      const unsubscribe = onSnapshot(sessionDocRef, async (snap) => {
        console.log('[useCheckoutListener] Snapshot listener fired.');
        
        if (!snap.exists()) {
          console.log('[useCheckoutListener] Document does not exist yet. Waiting for Stripe webhook...');
          return;
        }

        const data = snap.data();
        const error = data?.error;
        const url = data?.url;
        console.log('[useCheckoutListener] Snapshot data:', data);

        // Check for payment success (indicated by the `url` field)
        if (url) {
            console.log('[useCheckoutListener] Session confirmed with URL. Preparing to update user tier.');
          
            const userDocRef = doc(db, 'users', user.uid);
            console.log(`[useCheckoutListener] Attempting to update tier to 'pro' for user ID: ${user.uid}`);
            
            try {
                await updateDoc(userDocRef, {
                    tier: 'pro'
                });
                  
                console.log('[useCheckoutListener] Successfully updated user tier in Firestore.');
                toast({
                    title: "Upgrade Successful!",
                    description: "Welcome to the Pro plan!",
                });
            } catch (updateError) {
                console.error("[useCheckoutListener] Failed to update user tier:", updateError);
                toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: "Your payment was successful, but we failed to update your account. Please contact support.",
                });
            } finally {
                console.log('[useCheckoutListener] Payment processed. Cleaning up URL and unsubscribing.');
                unsubscribe(); // Stop listening
                router.replace('/dashboard'); // Clean URL
            }
        } else if (error) {
            // Check for a payment error
            console.log('[useCheckoutListener] Detected error in session document:', error.message);
            toast({
              variant: "destructive",
              title: "Checkout Error",
              description: error.message,
            });
            unsubscribe(); // Stop listening
            router.replace('/dashboard'); // Clean URL
        } else {
             console.log('[useCheckoutListener] Document exists, but no `url` or `error`. Waiting for next snapshot.');
        }
      }, (err) => {
          console.error("[useCheckoutListener] Snapshot listener error:", err);
          unsubscribe();
          router.replace('/dashboard');
      });

      // This cleanup function is crucial. It runs if the component unmounts for any reason.
      return () => {
        console.log('[useCheckoutListener] useEffect cleanup. Unsubscribing from snapshot listener.');
        unsubscribe();
        listenerAttached.current = false; // Reset for potential future navigation.
      };
    }
  // We only want this effect to re-run if the user object or search params change.
  }, [user, searchParams, router, toast]);
}
