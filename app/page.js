'use client';

import { useState, useEffect } from 'react';
import { notes } from '@/data/notes';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async (note) => {
    setIsLoading(true);
    setError('');
    setSelectedNote(note);

    try {
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteId: note.id }),
      });
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: note.title,
        description: note.description,
        order_id: data.order_id,
        handler: async function (response) {
          const verifyResponse = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              noteId: note.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyData.success) {
            setPaymentSuccess(true);
            setDownloadUrl(verifyData.downloadUrl);
          } else {
            setError('Payment verification failed');
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#000000',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-6xl flex-col items-center py-16 px-8 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-black dark:text-zinc-50">
            Digital Notes Store
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Premium handwritten notes for programming and computer science concepts
          </p>
        </div>

        {paymentSuccess && selectedNote ? (
          <div className="w-full max-w-md flex flex-col items-center gap-6 p-8 bg-green-50 dark:bg-green-900/20 rounded-2xl border-2 border-green-600">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-400 text-center">
              Payment Successful!
            </h2>
            <p className="text-center text-zinc-700 dark:text-zinc-300">
              You now have access to: {selectedNote.title}
            </p>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-green-600 px-8 text-white text-lg font-medium transition-colors hover:bg-green-700"
            >
              Download PDF Now
            </a>
            <button
              onClick={() => {
                setPaymentSuccess(false);
                setSelectedNote(null);
                setDownloadUrl('');
              }}
              className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Browse other notes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {notes.map((note) => (
              <div
                key={note.id}
                className="flex flex-col p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {note.badge}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
                  {note.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 flex-1">
                  {note.description}
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg text-zinc-400 line-through">₹{note.originalPrice}</span>
                  <span className="text-2xl font-bold text-black dark:text-zinc-50">₹{note.price}</span>
                </div>
                <button
                  onClick={() => handlePayment(note)}
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 text-background text-base font-medium transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading && selectedNote?.id === note.id ? 'Processing...' : `Buy Now (₹${note.price})`}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
