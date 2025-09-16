
"use client";

import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useToast } from './use-toast';
import { createCheckoutSession } from '@/lib/create-checkout-session';

export function useCheckout() {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'You must be logged in to upgrade.' });
            return;
        }

        const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
        if (!priceId || priceId === 'your_stripe_price_id_here') {
            console.error('Stripe Price ID is not configured. Please set NEXT_PUBLIC_STRIPE_PRICE_ID in your .env file.');
            toast({ variant: 'destructive', title: 'Configuration Error', description: 'The payment system is not configured correctly.' });
            return;
        }

        setLoading(true);

        try {
            const successUrl = `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = window.location.href;

            const { sessionId } = await createCheckoutSession(priceId, user, successUrl, cancelUrl);

            const sessionDocRef = doc(db, 'users', user.uid, 'checkout_sessions', sessionId);

            const unsubscribe = onSnapshot(sessionDocRef, (snap) => {
                const data = snap.data();
                const error = data?.error;
                const url = data?.url;

                if (error) {
                    console.error('Stripe Checkout Error:', error.message);
                    toast({ variant: 'destructive', title: 'Checkout Error', description: error.message });
                    setLoading(false);
                    unsubscribe();
                } else if (url) {
                    // We have a Stripe Checkout URL, let's redirect.
                    window.location.assign(url);
                    // The setLoading(false) will not be reached because of the redirect.
                    // If the user cancels, they will be brought back to the `cancelUrl`.
                    unsubscribe();
                }
            });
        } catch (error) {
            console.error('Failed to create checkout session:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not initiate the upgrade process.' });
            setLoading(false);
        }
    };

    return { loading, handleCheckout };
}
