// This is a server-side file and should not be exposed to the client.
'use server';

import { doc, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from 'firebase/auth';

interface CreateCheckoutSessionResponse {
  sessionId: string;
  error?: string;
}

/**
 * Creates a checkout session for the user and listens for the session URL.
 * 
 * @param priceId - The ID of the Stripe price to subscribe to.
 * @param user - The Firebase authenticated user.
 * @param successUrl - The URL to redirect to on successful payment.
 * @param cancelUrl - The URL to redirect to on canceled payment.
 */
export async function createCheckoutSession(
  priceId: string,
  user: User,
  successUrl: string,
  cancelUrl: string
): Promise<CreateCheckoutSessionResponse> {

  if (!user) {
    throw new Error('User must be authenticated to create a checkout session.');
  }

  // 1. Create a new document in the `checkout_sessions` collection.
  const checkoutSessionRef = await addDoc(
    collection(db, 'users', user.uid, 'checkout_sessions'),
    {
      price: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // You can add `automatic_tax: true` if you have Stripe Tax configured
    }
  );

  return { sessionId: checkoutSessionRef.id };
}

