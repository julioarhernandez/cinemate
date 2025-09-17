// hooks/use-checkout.ts
import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function useCheckout() {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (!user) {
            toast({ 
                variant: 'destructive', 
                title: 'You must be logged in to upgrade.' 
            });
            return;
        }

        const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
        if (!priceId || priceId === 'your_stripe_price_id_here') {
            console.error('Stripe Price ID is not configured.');
            toast({ 
                variant: 'destructive', 
                title: 'Configuration Error', 
                description: 'The payment system is not configured correctly.' 
            });
            return;
        }

        setLoading(true);

        try {
            const successUrl = `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = window.location.href;

            console.log('Sending checkout request with:', { priceId, uid: user.uid });

            // Call the API route - NOW INCLUDING priceId
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId,        // ← ADDED: This was missing!
                    uid: user.uid,
                    successUrl,
                    cancelUrl,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`Failed to create checkout session: ${errorData.error || 'Unknown error'}`);
            }

            const { sessionId } = await response.json();
            console.log('Checkout session created:', sessionId);

            // Listen for the checkout session URL
            const sessionDocRef = doc(db, 'users', user.uid, 'checkout_sessions', sessionId);
            
            let unsubscribed = false;
            
            const unsubscribe = onSnapshot(sessionDocRef, (snap) => {
                if (unsubscribed) return;
                
                const data = snap.data();
                const error = data?.error;
                const url = data?.url;

                console.log('Checkout session data:', data);

                if (error) {
                    console.error('Stripe Checkout Error:', error.message);
                    toast({ 
                        variant: 'destructive', 
                        title: 'Checkout Error', 
                        description: error.message 
                    });
                    setLoading(false);
                    unsubscribed = true;
                    unsubscribe();
                } else if (url) {
                    console.log('Redirecting to Stripe:', url);
                    // Redirect to Stripe Checkout
                    window.location.assign(url);
                    unsubscribed = true;
                    unsubscribe();
                }
            });

            // Cleanup timeout in case something goes wrong
            setTimeout(() => {
                if (!unsubscribed) {
                    console.log('Checkout session timed out');
                    unsubscribed = true;
                    unsubscribe();
                    setLoading(false);
                    toast({
                        variant: 'destructive',
                        title: 'Timeout',
                        description: 'Checkout session creation timed out.',
                    });
                }
            }, 30000); // 30 second timeout

        } catch (error: any) {
            console.error('Failed to create checkout session:', error.message);
            toast({ 
                variant: 'destructive', 
                title: 'Error', 
                description: error.message || 'Could not initiate the upgrade process.' 
            });
            setLoading(false);
        }
    };

    return { loading, handleCheckout };
}