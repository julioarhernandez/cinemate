
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

        setLoading(true);

        try {
            const successUrl = `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = window.location.href;

            // Call the API route to create the checkout session
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
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
            
            if (!sessionId) {
                throw new Error('Did not receive a session ID from the server.');
            }

            // Listen for the checkout session URL on the CORRECT path
            const sessionDocRef = doc(db, 'customers', user.uid, 'checkout_sessions', sessionId);
            
            const unsubscribe = onSnapshot(sessionDocRef, (snap) => {
                const data = snap.data();
                const error = data?.error;
                const url = data?.url;

                if (error) {
                    unsubscribe();
                    setLoading(false);
                    console.error('Stripe Checkout Error:', error.message);
                    toast({ 
                        variant: 'destructive', 
                        title: 'Checkout Error', 
                        description: error.message 
                    });
                } else if (url) {
                    unsubscribe();
                    // Redirect to Stripe Checkout
                    window.location.assign(url);
                    // setLoading(false) is not needed here as the page will redirect
                }
            }, (error) => {
                // This will catch Firestore permission errors
                unsubscribe();
                setLoading(false);
                console.error('Firestore listener error:', error);
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not retrieve checkout session. Please check permissions.',
                });
            });

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
