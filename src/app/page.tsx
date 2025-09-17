
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { auth, googleProvider, signInWithPopup, db, doc, setDoc, serverTimestamp, getAdditionalUserInfo, onSnapshot, updateDoc } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { FirebaseError } from 'firebase/app';
import { Logo } from '@/components/logo';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [user, loading] = useAuthState(auth);
  const listenerAttached = useRef(false);

  useEffect(() => {
    const checkoutSuccess = searchParams.get('checkout_success');
    const sessionId = searchParams.get('session_id');

    if (checkoutSuccess && sessionId && user && !listenerAttached.current) {
      console.log(`[Login Page] Detected checkout success with session_id: ${sessionId} for user: ${user.uid}`);
      listenerAttached.current = true; // Prevents attaching multiple listeners
      
      const sessionDocRef = doc(db, 'customers', user.uid, 'checkout_sessions', sessionId);
      console.log(`[Login Page] Attaching snapshot listener to: ${sessionDocRef.path}`);

      const unsubscribe = onSnapshot(sessionDocRef, async (snap) => {
        console.log('[Login Page] Snapshot listener fired.');
        
        if (!snap.exists()) {
          console.log('[Login Page] Document does not exist yet. Waiting for Stripe webhook...');
          return;
        }

        const data = snap.data();
        const error = data?.error;
        const url = data?.url;
        console.log('[Login Page] Snapshot data:', data);

        if (error) {
          console.log('[Login Page] Detected error in session document:', error.message);
          unsubscribe();
          toast({
            variant: "destructive",
            title: "Checkout Error",
            description: error.message,
          });
          router.replace('/dashboard');
        } else if (url) {
            console.log('[Login Page] Session confirmed with URL. Preparing to update user tier.');
            unsubscribe();
            
            const userDocRef = doc(db, 'users', user.uid);
            console.log(`[Login Page] Attempting to update tier to 'pro' for user ID: ${user.uid}`);
            
            try {
                await updateDoc(userDocRef, {
                    tier: 'pro'
                });
                
                console.log('[Login Page] Successfully updated user tier in Firestore.');
                toast({
                    title: "Upgrade Successful!",
                    description: `Welcome to the Pro plan! UID: ${user.uid}, Email: ${user.email}`,
                });
            } catch (updateError) {
                console.error("[Login Page] Failed to update user tier:", updateError);
                toast({
                    variant: "destructive",
                    title: "Update Failed",
                    description: "Your payment was successful, but we failed to update your account. Please contact support.",
                });
            } finally {
                console.log('[Login Page] Redirecting to dashboard.');
                router.replace('/dashboard');
            }
        } else {
             console.log('[Login Page] Document exists, but `url` is not yet present. Waiting for next snapshot.');
        }
      }, (err) => {
          console.error("[Login Page] Snapshot listener error:", err);
          unsubscribe();
          router.replace('/dashboard');
      });
    }
  }, [searchParams, user, loading, router, toast]);


  const handleGoogleSignIn = async () => {
    console.log('[Login Step 1] Initiating Google Sign-In.');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('[Login Step 2] Received user credential from Google:', user);
      
      const additionalUserInfo = getAdditionalUserInfo(result);
      console.log('[Login Step 3] Checking if user is new. isNewUser:', additionalUserInfo?.isNewUser);

      if (additionalUserInfo?.isNewUser) {
        console.log('[Login Step 4] New user detected. Preparing to create database entry.');
        const userDocRef = doc(db, 'users', user.uid);
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // padStart for '09'
        const currentMonthKey = `${year}-${month}`;

        const userData = {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          tier: 'standard',
          recommendationUsage: {
            [currentMonthKey]: 0,
          },
        };
        console.log('[Login Step 5] User data to be saved:', userData);
        await setDoc(userDocRef, userData);
        console.log('[Login Step 6] Successfully created user document in Firestore.');
      } else {
        console.log('[Login Step 4] Existing user detected. Skipping database creation.');
      }
      
      console.log('[Login Step 7] Navigating to dashboard.');
      router.push('/dashboard');
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error('[Login Error] An error occurred during sign-in:', firebaseError);
      
      // Don't show an error toast if the user closes the popup
      if (firebaseError.code === 'auth/cancelled-popup-request' || firebaseError.code === 'auth/popup-closed-by-user') {
        console.log('[Login Info] Sign-in popup closed by user.');
        return;
      }
      
      toast({
        variant: "destructive",
        title: "Sign-In Failed",
        description: "Could not sign in with Google. Please try again.",
      });
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <Image
        src="/bg.png"
        alt="Background"
        data-ai-hint="cinema background"
        fill
        sizes="100vw"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
      />
      <div className="absolute top-8">
        <Logo />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button onClick={handleGoogleSignIn} className="w-full bg-accent hover:bg-accent/90">
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
