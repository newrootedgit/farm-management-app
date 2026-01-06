import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFarmStore } from '@/stores/farm-store';
import {
  useFarm,
  useUpdateFarm,
  useDeleteFarm,
  usePaymentSettings,
  useStripeConnect,
  useStripeStatus,
  useStripeDisconnect,
  useUpdatePaymentSettings,
} from '@/lib/api-client';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentFarmId, setCurrentFarm } = useFarmStore();
  const { data: farm } = useFarm(currentFarmId ?? undefined);
  const updateFarm = useUpdateFarm(currentFarmId ?? '');
  const deleteFarm = useDeleteFarm();

  // Payment settings hooks
  const { data: paymentSettings, isLoading: paymentSettingsLoading } = usePaymentSettings(currentFarmId ?? undefined);
  const stripeConnect = useStripeConnect(currentFarmId ?? '');
  const { data: stripeStatus, refetch: refetchStripeStatus } = useStripeStatus(currentFarmId ?? undefined);
  const stripeDisconnect = useStripeDisconnect(currentFarmId ?? '');
  const updatePaymentSettings = useUpdatePaymentSettings(currentFarmId ?? '');

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [weightUnit, setWeightUnit] = useState('oz');
  const [lengthUnit, setLengthUnit] = useState('in');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [paymentTiming, setPaymentTiming] = useState('UPFRONT');

  // Contact information
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Business address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

  // Document settings
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(1);
  const [invoiceFooterNotes, setInvoiceFooterNotes] = useState('');

  // Populate form when farm data loads
  useEffect(() => {
    if (farm) {
      setName(farm.name || '');
      setTimezone(farm.timezone || 'UTC');
      setCurrency(farm.currency || 'USD');
      setWeightUnit(farm.weightUnit || 'oz');
      setLengthUnit(farm.lengthUnit || 'in');
      // Contact info
      setPhone(farm.phone || '');
      setEmail(farm.email || '');
      setWebsite(farm.website || '');
      // Address
      setAddressLine1(farm.addressLine1 || '');
      setAddressLine2(farm.addressLine2 || '');
      setCity(farm.city || '');
      setState(farm.state || '');
      setPostalCode(farm.postalCode || '');
      setCountry(farm.country || 'US');
      // Document settings
      setInvoicePrefix(farm.invoicePrefix || 'INV');
      setNextInvoiceNumber(farm.nextInvoiceNumber || 1);
      setInvoiceFooterNotes(farm.invoiceFooterNotes || '');
    }
  }, [farm]);

  // Sync payment timing with settings
  useEffect(() => {
    if (paymentSettings?.paymentTiming) {
      setPaymentTiming(paymentSettings.paymentTiming);
    }
  }, [paymentSettings]);

  // Handle Stripe redirect after onboarding
  useEffect(() => {
    const stripeOnboarding = searchParams.get('stripe_onboarding');
    if (stripeOnboarding === 'complete') {
      refetchStripeStatus();
      setSuccess('Stripe account connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (stripeOnboarding === 'refresh') {
      setError('Stripe onboarding was interrupted. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, refetchStripeStatus]);

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Farm name is required');
      return;
    }

    try {
      await updateFarm.mutateAsync({
        name: name.trim(),
        timezone,
        currency,
        weightUnit: weightUnit as 'oz' | 'g' | 'lb' | 'kg',
        lengthUnit: lengthUnit as 'in' | 'ft' | 'cm' | 'm',
        // Contact info
        phone: phone || undefined,
        email: email || undefined,
        website: website || undefined,
        // Address
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        country,
        // Document settings
        invoicePrefix,
        nextInvoiceNumber,
        invoiceFooterNotes: invoiceFooterNotes || null,
      });
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const handleDelete = async () => {
    if (!currentFarmId) return;

    try {
      await deleteFarm.mutateAsync(currentFarmId);
      setCurrentFarm(null);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete farm');
    }
  };

  const handleStripeConnect = async () => {
    setError('');
    try {
      const result = await stripeConnect.mutateAsync();
      // Redirect to Stripe onboarding
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Stripe connection');
    }
  };

  const handleStripeDisconnect = async () => {
    setError('');
    try {
      await stripeDisconnect.mutateAsync();
      refetchStripeStatus();
      setSuccess('Stripe account disconnected');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Stripe');
    }
  };

  const handlePaymentTimingChange = async (newTiming: string) => {
    setPaymentTiming(newTiming);
    try {
      await updatePaymentSettings.mutateAsync({ paymentTiming: newTiming });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment settings');
      // Revert on error
      setPaymentTiming(paymentSettings?.paymentTiming || 'UPFRONT');
    }
  };

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to manage settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage farm settings and preferences</p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/50 text-destructive rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/50 text-green-600 rounded-md">
          {success}
        </div>
      )}

      {/* Farm details */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Farm Details</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Farm Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            type="text"
            value={farm?.slug || ''}
            className="w-full px-3 py-2 border rounded-md bg-background text-muted-foreground"
            disabled
          />
          <p className="text-xs text-muted-foreground mt-1">Used in URLs (cannot be changed)</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateFarm.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {updateFarm.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Units of Measurement */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Units of Measurement</h2>
        <p className="text-sm text-muted-foreground">
          Set your preferred units for product weights and lengths. These settings apply throughout the app except for Farm Layout (which uses feet/inches for room dimensions).
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Product Weight Unit</label>
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="oz">Ounces (oz)</option>
              <option value="g">Grams (g)</option>
              <option value="lb">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Length Unit</label>
            <select
              value={lengthUnit}
              onChange={(e) => setLengthUnit(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="in">Inches (in)</option>
              <option value="ft">Feet (ft)</option>
              <option value="cm">Centimeters (cm)</option>
              <option value="m">Meters (m)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateFarm.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {updateFarm.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Business Address */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Business Address</h2>
        <p className="text-sm text-muted-foreground">
          Your business address will appear on invoices, packing slips, and other documents.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 1</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="123 Farm Road"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 2</label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite 100 (optional)"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State / Province</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="CA"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="12345"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateFarm.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {updateFarm.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Contact Information */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Contact Information</h2>
        <p className="text-sm text-muted-foreground">
          Contact details that will appear on documents and be available to customers.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@yourfarm.com"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourfarm.com"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateFarm.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {updateFarm.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Document Settings */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Document Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure how invoices and other documents are generated.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV"
                maxLength={10}
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                e.g., INV-0001, FARM-0001
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Next Invoice Number</label>
              <input
                type="number"
                value={nextInvoiceNumber}
                onChange={(e) => setNextInvoiceNumber(parseInt(e.target.value) || 1)}
                min={1}
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-increments after each invoice
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Invoice Footer Notes</label>
            <textarea
              value={invoiceFooterNotes}
              onChange={(e) => setInvoiceFooterNotes(e.target.value)}
              placeholder="Thank you for your business! Payment is due within 30 days."
              rows={3}
              className="w-full px-3 py-2 border rounded-md bg-background resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Appears at the bottom of all invoices
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateFarm.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {updateFarm.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Team */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Team Members</h2>
          <button className="text-sm text-primary hover:underline">Invite Member</button>
        </div>
        <p className="text-muted-foreground">Manage who has access to this farm.</p>
        <div className="text-center py-6 text-muted-foreground">
          Team management requires Clerk authentication setup.
        </div>
      </div>

      {/* Payment Settings */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Payment Settings</h2>
        <p className="text-muted-foreground">Configure how you accept payments from customers.</p>

        {paymentSettingsLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading payment settings...</div>
        ) : (
          <div className="space-y-6">
            {/* Stripe Connection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Stripe</h3>
                  <p className="text-sm text-muted-foreground">
                    Accept credit card payments via Stripe Connect
                  </p>
                </div>
                {stripeStatus?.status === 'CONNECTED' ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      Connected
                    </span>
                    <button
                      onClick={handleStripeDisconnect}
                      disabled={stripeDisconnect.isPending}
                      className="text-sm text-destructive hover:underline disabled:opacity-50"
                    >
                      {stripeDisconnect.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                ) : stripeStatus?.status === 'PENDING' ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                      Pending
                    </span>
                    <button
                      onClick={handleStripeConnect}
                      disabled={stripeConnect.isPending}
                      className="text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      {stripeConnect.isPending ? 'Loading...' : 'Complete Setup'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStripeConnect}
                    disabled={stripeConnect.isPending}
                    className="px-4 py-2 bg-[#635BFF] text-white rounded-md hover:bg-[#5851DB] disabled:opacity-50 text-sm font-medium"
                  >
                    {stripeConnect.isPending ? 'Connecting...' : 'Connect Stripe'}
                  </button>
                )}
              </div>
              {stripeStatus?.status === 'CONNECTED' && stripeStatus.accountId && (
                <p className="text-xs text-muted-foreground">
                  Account ID: {stripeStatus.accountId}
                </p>
              )}
            </div>

            <hr />

            {/* PayPal */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">PayPal</h3>
                <p className="text-sm text-muted-foreground">
                  Accept PayPal payments
                </p>
              </div>
              <span className="text-sm text-muted-foreground">Coming soon</span>
            </div>

            <hr />

            {/* Payment Timing */}
            <div className="space-y-2">
              <label className="block font-medium">Payment Timing</label>
              <p className="text-sm text-muted-foreground">
                When should customers pay for their orders?
              </p>
              <select
                value={paymentTiming}
                onChange={(e) => handlePaymentTimingChange(e.target.value)}
                disabled={updatePaymentSettings.isPending}
                className="w-full max-w-xs px-3 py-2 border rounded-md bg-background disabled:opacity-50"
              >
                <option value="UPFRONT">Payment upfront (when order placed)</option>
                <option value="ON_READY">Payment on ready (when order is ready for pickup)</option>
              </select>
            </div>

            {/* Platform Fee Info */}
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                A {paymentSettings?.applicationFeePercent || 2.5}% platform fee is applied to each transaction to support Rooted Planner.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="border border-destructive/50 rounded-lg p-6 bg-destructive/5 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          These actions are irreversible. Please be certain.
        </p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground"
          >
            Delete Farm
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-destructive">
              Are you sure you want to delete "{farm?.name}"? This will permanently delete all zones, employees, inventory, and other data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteFarm.isPending}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteFarm.isPending ? 'Deleting...' : 'Yes, Delete Farm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
