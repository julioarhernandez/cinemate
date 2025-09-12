
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { auth, googleProvider, signInWithPopup } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { FirebaseError } from 'firebase/app';
import { Logo } from '@/components/logo';


export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleGoogleSignUp = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/dashboard');
    } catch (error) {
      const firebaseError = error as FirebaseError;
      // Don't show an error toast if the user closes the popup
      if (firebaseError.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error("Google Sign-Up Error:", error);
      toast({
        variant: "destructive",
        title: "Sign-Up Failed",
        description: "Could not sign up with Google. Please try again.",
      });
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background">
      <Image
        src="https://picsum.photos/1920/1080?grayscale"
        alt="Background"
        data-ai-hint="cinema abstract"
        fill
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
      />
      <div className="absolute top-8">
        <Logo />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
          <CardDescription>
            Join MovieCircles and start your movie journey
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
           <Button onClick={handleGoogleSignUp} className="w-full bg-accent hover:bg-accent/90">
            Sign up with Google
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Sign In
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
