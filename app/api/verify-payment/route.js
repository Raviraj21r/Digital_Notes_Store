import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { notes } from '@/data/notes';

export async function POST(request) {
  try {
    const { noteId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

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

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature === razorpay_signature) {
      console.log(`Payment verified successfully for note: ${noteId}`);
      
      // Get the actual PDF URL from environment variable
      const downloadUrl = process.env[note.pdfUrlEnv];
      
      if (!downloadUrl) {
        console.error(`PDF URL not configured for note: ${noteId}. Environment variable: ${note.pdfUrlEnv}`);
        return NextResponse.json(
          { error: 'PDF URL not configured. Please contact support.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({
        success: true,
        downloadUrl: downloadUrl,
        noteTitle: note.title,
      });
    } else {
      console.error('Invalid signature for payment verification');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
