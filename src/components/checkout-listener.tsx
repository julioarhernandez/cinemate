
"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function CheckoutListener() {
  const [user] = useAuthState(auth);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.has('session_id') && user) {
      const sessionId = searchParams.get('session_id');

      const checkSession = async () => {
        const sessionDocRef = doc(db, 'customers', user.uid, 'checkout_sessions', sessionId!);
        const sessionDoc = await getDoc(sessionDocRef);

        if (sessionDoc.exists()) {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
            tier: 'pro'
          });
          
          toast({
            title: "Upgrade Successful!",
            description: "Welcome to the Pro plan! Your new features are now available.",
          });
          
          // Clean up the URL
          window.history.replaceState(null, '', '/dashboard');

        } else {
            console.warn("Could not find a matching checkout session.");
        }
      };

      checkSession();
    }
  }, [searchParams, user, toast]);

  return null; // This component does not render anything
}
