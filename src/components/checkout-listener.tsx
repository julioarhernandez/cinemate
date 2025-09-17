
"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function CheckoutListener() {
  const [user] = useAuthState(auth);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.has('session_id') && user) {
      const sessionId = searchParams.get('session_id');
      console.log(`[CheckoutListener] Detected session_id: ${sessionId} for user: ${user.uid}`);

      const sessionDocRef = doc(db, 'customers', user.uid, 'checkout_sessions', sessionId!);
      console.log(`[CheckoutListener] Attaching snapshot listener to: ${sessionDocRef.path}`);
      
      const unsubscribe = onSnapshot(sessionDocRef, async (snap) => {
        console.log('[CheckoutListener] Snapshot listener fired.');
        
        if (!snap.exists()) {
            console.log('[CheckoutListener] Document does not exist yet. Waiting for Stripe webhook...');
            return; // Wait for the next snapshot
        }

        const data = snap.data();
        console.log('[CheckoutListener] Snapshot data:', data);

        const error = data?.error;
        const url = data?.url;

        if (error) {
          console.log('[CheckoutListener] Detected error in session document:', error.message);
          unsubscribe();
          toast({
            variant: "destructive",
            title: "Checkout Error",
            description: error.message,
          });
          console.error("Stripe Checkout Error:", error.message);
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
                console.log('[CheckoutListener] Cleaning up URL.');
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

      // Cleanup listener on component unmount
      return () => {
        console.log('[CheckoutListener] Cleaning up snapshot listener.');
        unsubscribe();
      };
    }
  }, [searchParams, user, toast, router]);

  return null;
}
