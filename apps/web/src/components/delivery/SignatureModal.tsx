import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { SignatureCapture } from './SignatureCapture';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { signatureData: string; signedBy: string }) => void;
  orderNumber: string;
  customerName?: string;
  isLoading?: boolean;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSubmit,
  orderNumber,
  customerName,
  isLoading = false,
}: SignatureModalProps) {
  const [signedBy, setSignedBy] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Close on ESC key
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const handleCapture = (data: string) => {
    setSignatureData(data);
    setError(null);
  };

  const handleClear = () => {
    setSignatureData(null);
  };

  const handleSubmit = () => {
    if (!signedBy.trim()) {
      setError('Please enter the recipient name');
      return;
    }
    if (!signatureData) {
      setError('Please provide a signature');
      return;
    }

    onSubmit({
      signatureData,
      signedBy: signedBy.trim(),
    });
  };

  const handleClose = () => {
    setSignedBy('');
    setSignatureData(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform rounded-xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Proof of Delivery
              </h2>
              <p className="text-sm text-gray-500">
                Order #{orderNumber}
                {customerName && ` - ${customerName}`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Recipient Name */}
            <div className="mb-4">
              <label
                htmlFor="signedBy"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Recipient Name
              </label>
              <input
                type="text"
                id="signedBy"
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                placeholder="Enter recipient's name"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-green-500 focus:ring-green-500"
                disabled={isLoading}
              />
            </div>

            {/* Signature Pad */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Signature
              </label>
              <SignatureCapture
                onCapture={handleCapture}
                onClear={handleClear}
                width={400}
                height={150}
                className="w-full"
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            {/* Status indicators */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    signedBy.trim() ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span>Name entered</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    signatureData ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span>Signature captured</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !signedBy.trim() || !signatureData}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-white font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Confirming...' : 'Confirm Delivery'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
