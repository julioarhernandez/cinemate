
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

      // Use onSnapshot to listen for the document to be updated by the Stripe extension
      const sessionDocRef = doc(db, 'customers', user.uid, 'checkout_sessions', sessionId!);
      
      const unsubscribe = onSnapshot(sessionDocRef, async (snap) => {
        const data = snap.data();
        const error = data?.error;
        const url = data?.url;

        // The Stripe extension has updated the document with an error
        if (error) {
          unsubscribe(); // Stop listening
          toast({
            variant: "destructive",
            title: "Checkout Error",
            description: error.message,
          });
          console.error("Stripe Checkout Error:", error.message);
           // Clean up the URL
          router.replace('/dashboard');
        }
        
        // The Stripe extension has successfully updated the document with a URL
        if (snap.exists() && !error) {
            unsubscribe(); // Stop listening, we have what we need.
            
            const userDocRef = doc(db, 'users', user.uid);
            
            try {
                await updateDoc(userDocRef, {
                    tier: 'pro'
                });
                
                toast({
                    title: "Upgrade Successful!",
                    description: `Welcome to the Pro plan! UID: ${user.uid}, Email: ${user.email}`,
                });
            } catch (updateError) {
                console.error("Failed to update user tier:", updateError);
                toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: "Your payment was successful, but we failed to update your account. Please contact support.",
                });
            } finally {
                // Clean up the URL by removing the session_id query parameter
                router.replace('/dashboard');
            }
        }
      }, (err) => {
          console.error("Snapshot listener error:", err);
          unsubscribe();
          router.replace('/dashboard');
      });

      // Cleanup listener on component unmount
      return () => unsubscribe();
    }
  }, [searchParams, user, toast, router]);

  return null; // This component does not render anything
}
