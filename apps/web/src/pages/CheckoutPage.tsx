import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import {
  usePaymentLinkDetails,
  usePaymentLinkPay,
  usePayPalConfig,
  usePayPalCreateOrder,
  usePayPalCaptureOrder,
} from '@/lib/api-client';

// Initialize Stripe (will be null if no key configured)
const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

type PaymentMethod = 'stripe' | 'paypal';

// Stripe Payment form component
function StripePaymentForm({ onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href + '?success=true',
      },
    });

    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

// PayPal Buttons component
function PayPalPaymentButtons({
  linkId,
  onSuccess,
}: {
  linkId: string;
  onSuccess: () => void;
}) {
  const createOrderMutation = usePayPalCreateOrder(linkId);
  const captureOrderMutation = usePayPalCaptureOrder(linkId);
  const [error, setError] = useState<string | null>(null);

  const createOrder = async () => {
    try {
      setError(null);
      const result = await createOrderMutation.mutateAsync();
      return result.orderId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PayPal order');
      throw err;
    }
  };

  const onApprove = async (data: { orderID: string }) => {
    try {
      setError(null);
      await captureOrderMutation.mutateAsync(data.orderID);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture payment');
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}
      <PayPalButtons
        style={{ layout: 'vertical', shape: 'rect' }}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={(err) => setError(err.toString())}
      />
    </div>
  );
}

// Main checkout page
export default function CheckoutPage() {
  const { linkId } = useParams<{ linkId: string }>();
  const { data: paymentDetails, isLoading, error: fetchError } = usePaymentLinkDetails(linkId);
  const { data: paypalConfig } = usePayPalConfig(linkId);
  const payMutation = usePaymentLinkPay(linkId || '');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  // Check for success in URL params (after Stripe redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true' || urlParams.get('payment_intent')) {
      setPaymentSuccess(true);
    }
  }, []);

  // Determine available payment methods
  const stripeAvailable = !!stripePromise;
  const paypalAvailable = !!paypalConfig?.isConfigured && !!paypalConfig?.clientId;

  // Auto-select method if only one is available
  useEffect(() => {
    if (!selectedMethod) {
      if (stripeAvailable && !paypalAvailable) {
        setSelectedMethod('stripe');
      } else if (paypalAvailable && !stripeAvailable) {
        setSelectedMethod('paypal');
      }
    }
  }, [stripeAvailable, paypalAvailable, selectedMethod]);

  // Initialize Stripe payment when selected
  const initializeStripePayment = async () => {
    if (!linkId) return;

    try {
      const result = await payMutation.mutateAsync();
      setClientSecret(result.clientSecret);
    } catch (err) {
      setInitError(err instanceof Error ? err.message : 'Failed to initialize payment');
    }
  };

  // Format currency
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Payment Link Not Found</h1>
          <p className="text-gray-600">
            This payment link may have expired or is invalid.
          </p>
        </div>
      </div>
    );
  }

  // Handle already paid status
  if (paymentDetails?.status === 'ALREADY_PAID' || paymentSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-green-500 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for your payment. A confirmation has been sent to your email.
          </p>
          <p className="text-sm text-gray-500">
            You can close this page.
          </p>
        </div>
      </div>
    );
  }

  // Check if expired
  if (paymentDetails?.expiresAt && new Date(paymentDetails.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-amber-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Payment Link Expired</h1>
          <p className="text-gray-600">
            This payment link has expired. Please contact the seller for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (!paymentDetails) {
    return null;
  }

  const showMethodSelector = stripeAvailable && paypalAvailable;
  const noPaymentMethods = !stripeAvailable && !paypalAvailable;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{paymentDetails.farmName}</h1>
          <p className="text-gray-600">Order #{paymentDetails.orderNumber}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Order Summary */}
          <div className="p-6 border-b">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-2">
              {paymentDetails.items.map((item: { productName: string; quantityOz: number; lineTotal: number | null }, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.productName} ({item.quantityOz} oz)</span>
                  {item.lineTotal && (
                    <span className="font-medium">
                      {formatAmount(item.lineTotal, paymentDetails.currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatAmount(paymentDetails.amount, paymentDetails.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form Section */}
          <div className="p-6">
            {noPaymentMethods ? (
              <div className="text-center text-gray-500 py-8">
                <p>Payment processing is not configured.</p>
                <p className="text-sm">Please contact the seller.</p>
              </div>
            ) : (
              <>
                {/* Payment Method Selector */}
                {showMethodSelector && !clientSecret && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedMethod('stripe')}
                        className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                          selectedMethod === 'stripe'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
                        </svg>
                        <span className="text-sm font-medium">Card</span>
                      </button>
                      <button
                        onClick={() => setSelectedMethod('paypal')}
                        className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                          selectedMethod === 'paypal'
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="#003087">
                          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                        </svg>
                        <span className="text-sm font-medium">PayPal</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Stripe Payment */}
                {selectedMethod === 'stripe' && stripeAvailable && (
                  <>
                    {!clientSecret ? (
                      <div className="space-y-4">
                        {paymentDetails.customerEmail && (
                          <p className="text-sm text-gray-600">
                            Receipt will be sent to: <strong>{paymentDetails.customerEmail}</strong>
                          </p>
                        )}
                        {initError && (
                          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                            {initError}
                          </div>
                        )}
                        <button
                          onClick={initializeStripePayment}
                          disabled={payMutation.isPending}
                          className="w-full py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                          {payMutation.isPending ? 'Loading...' : 'Continue to Card Payment'}
                        </button>
                      </div>
                    ) : (
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret,
                          appearance: {
                            theme: 'stripe',
                            variables: {
                              colorPrimary: '#16a34a',
                            },
                          },
                        }}
                      >
                        <StripePaymentForm
                          clientSecret={clientSecret}
                          onSuccess={() => setPaymentSuccess(true)}
                        />
                      </Elements>
                    )}
                  </>
                )}

                {/* PayPal Payment */}
                {selectedMethod === 'paypal' && paypalAvailable && paypalConfig?.clientId && (
                  <PayPalScriptProvider
                    options={{
                      clientId: paypalConfig.clientId,
                      currency: paymentDetails.currency.toUpperCase(),
                    }}
                  >
                    <PayPalPaymentButtons
                      linkId={linkId!}
                      onSuccess={() => setPaymentSuccess(true)}
                    />
                  </PayPalScriptProvider>
                )}

                {/* No method selected */}
                {!selectedMethod && showMethodSelector && (
                  <p className="text-center text-gray-500 text-sm">
                    Please select a payment method above
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Secure payment processing.</p>
          {paymentDetails.expiresAt && (
            <p className="mt-1">
              Link expires: {new Date(paymentDetails.expiresAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
