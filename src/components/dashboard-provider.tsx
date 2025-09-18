
"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useCheckoutListener } from "@/hooks/use-checkout-listener";

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  // This custom hook now contains all the checkout session listening logic.
  // It will only activate itself when the `user` object is available.
  useCheckoutListener(user);

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
