import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { notes } from '@/data/notes';

export async function POST(request) {
  try {
    const { noteId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    console.log('=== Payment Verification Debug ===');
    console.log('noteId:', noteId);
    console.log('razorpay_order_id:', razorpay_order_id);
    console.log('razorpay_payment_id:', razorpay_payment_id);
    console.log('razorpay_signature:', razorpay_signature);

    if (!noteId) {
      return NextResponse.json(
        { success: false, reason: 'noteId is required' },
        { status: 400 }
      );
    }

    const note = notes.find((n) => n.id === noteId);
    if (!note) {
      return NextResponse.json(
        { success: false, reason: 'Invalid noteId' },
        { status: 404 }
      );
    }

    console.log('Found note:', note.title);

    // Check if secret is defined
    const secret = process.env.RAZORPAY_KEY_SECRET;
    console.log('RAZORPAY_KEY_SECRET defined:', !!secret);
    
    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not defined in environment variables');
      return NextResponse.json(
        { success: false, reason: 'Server configuration error: RAZORPAY_KEY_SECRET not configured' },
        { status: 500 }
      );
    }

    const trimmedSecret = secret.trim();
    console.log('Secret trimmed successfully');

    // Match HMAC SHA256 signature using order_id + "|" + payment_id
    const generatedSignature = crypto
      .createHmac('sha256', trimmedSecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    console.log('Generated signature:', generatedSignature);
    console.log('Received signature:', razorpay_signature);
    console.log('Signatures match:', generatedSignature === razorpay_signature);

    if (generatedSignature === razorpay_signature) {
      console.log(`Payment verified successfully for note: ${noteId}`);
      
      // Get the actual PDF URL from environment variable
      const downloadUrl = process.env[note.pdfUrlEnv];
      console.log('Environment variable name:', note.pdfUrlEnv);
      console.log('PDF URL found:', !!downloadUrl);
      
      if (!downloadUrl) {
        console.error(`PDF URL not configured for note: ${noteId}. Environment variable: ${note.pdfUrlEnv}`);
        return NextResponse.json(
          { success: false, reason: 'PDF URL not configured. Please contact support.' },
          { status: 500 }
        );
      }
      
      console.log('Returning download URL');
      return NextResponse.json({
        success: true,
        downloadUrl: downloadUrl,
        noteTitle: note.title,
      });
    } else {
      console.error('Signature mismatch - payment verification failed');
      return NextResponse.json(
        { success: false, reason: 'Signature mismatch or missing URL' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, reason: `Failed to verify payment: ${error.message}` },
      { status: 500 }
    );
  }
}
