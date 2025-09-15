
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { auth, googleProvider, signInWithPopup, db, doc, setDoc, serverTimestamp, getAdditionalUserInfo } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { FirebaseError } from 'firebase/app';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

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
        
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        const userData = {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          tier: 'standard',
          recommendationUsage: {
            [currentMonth]: 0,
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
        src="https://picsum.photos/1920/1080"
        alt="Background"
        data-ai-hint="cinema background"
        fill
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
