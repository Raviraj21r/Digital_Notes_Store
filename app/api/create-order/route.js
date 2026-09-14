import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { notes } from '@/data/notes';

export async function POST(request) {
  try {
    const { noteId } = await request.json();

    if (!noteId) {
      return NextResponse.json(
        { error: 'noteId is required' },
        { status: 400 }
      );
    }

    const note = notes.find((n) => n.id === noteId);
    if (!note) {
      return NextResponse.json(
        { error: 'Invalid noteId' },
        { status: 404 }
      );
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay API keys are missing');
      return NextResponse.json(
        { error: 'Server configuration error: Razorpay keys not configured' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const amountInPaise = note.price * 100;

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${noteId}_${Date.now()}`,
      notes: {
        noteId: noteId,
      },
    };

    console.log(`Creating order for note: ${noteId}, amount: ₹${note.price}`);

    const order = await razorpay.orders.create(options);

    console.log(`Order created successfully: ${order.id}`);

    return NextResponse.json({ 
      order_id: order.id, 
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Error creating order:', error);
    
    if (error.error && error.error.description) {
      console.error('Razorpay error description:', error.error.description);
      return NextResponse.json(
        { error: `Razorpay error: ${error.error.description}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
