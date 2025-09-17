
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { uid, successUrl, cancelUrl } = await request.json();
    const priceId = process.env.STRIPE_PRICE_ID;

    if (!priceId || priceId === 'your_stripe_price_id_here') {
      return NextResponse.json(
        { error: 'Stripe Price ID is not configured on the server.' },
        { status: 500 }
      );
    }
    
    if (!uid || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create checkout session document
    const checkoutSessionRef = await addDoc(
      collection(db, 'users', uid, 'checkout_sessions'),
      {
        price: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        created: new Date(),
      }
    );

    return NextResponse.json({ sessionId: checkoutSessionRef.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
