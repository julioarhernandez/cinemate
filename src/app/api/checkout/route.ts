
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('API route called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { uid, successUrl, cancelUrl } = body;
    const priceId = process.env.STRIPE_PRICE_ID;

    // Validate priceId from server environment
    if (!priceId || priceId === 'your_stripe_price_id_here') {
      console.error('Stripe Price ID not provided or not configured on the server.');
      return NextResponse.json(
        { error: 'Stripe Price ID is not configured.' },
        { status: 500 }
      );
    }
    
    if (!uid || !successUrl || !cancelUrl) {
      console.log('Missing parameters:', { 
        priceId: !!priceId, 
        uid: !!uid, 
        successUrl: !!successUrl, 
        cancelUrl: !!cancelUrl 
      });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Creating checkout session for user:', uid, 'with price:', priceId);

    // Create checkout session document
    const checkoutSessionRef = await addDoc(
      collection(db, 'customers', uid, 'checkout_sessions'),
      {
        price: priceId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }
    );

    console.log('Checkout session created successfully:', checkoutSessionRef.id);

    return NextResponse.json({ sessionId: checkoutSessionRef.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
