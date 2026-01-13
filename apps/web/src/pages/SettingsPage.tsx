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
} from '@/lib/api-client';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { currentFarmId, setCurrentFarm } = useFarmStore();
  const { data: farm } = useFarm(currentFarmId ?? undefined);
  const updateFarm = useUpdateFarm(currentFarmId ?? '');
  const deleteFarm = useDeleteFarm();

  // Payment settings hooks
  const { data: paymentSettings, isLoading: paymentSettingsLoading } = usePaymentSettings(currentFarmId ?? undefined);
  const stripeConnect = useStripeConnect(currentFarmId ?? '');
  const { data: stripeStatus, refetch: refetchStripeStatus } = useStripeStatus(currentFarmId ?? undefined);
  const stripeDisconnect = useStripeDisconnect(currentFarmId ?? '');

  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [weightUnit, setWeightUnit] = useState('oz');
  const [lengthUnit, setLengthUnit] = useState('in');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Contact information
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Contact validation errors
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [websiteError, setWebsiteError] = useState('');

  // Phone country codes with expected digit counts
  const phoneCountryCodes = [
    { code: '+1', country: 'US/CA', digits: 10 },
    { code: '+44', country: 'UK', digits: 10 },
    { code: '+61', country: 'AU', digits: 9 },
    { code: '+33', country: 'FR', digits: 9 },
    { code: '+49', country: 'DE', digits: 10 },
    { code: '+81', country: 'JP', digits: 10 },
    { code: '+86', country: 'CN', digits: 11 },
    { code: '+91', country: 'IN', digits: 10 },
    { code: '+52', country: 'MX', digits: 10 },
  ];

  // Validation functions
  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('');
      return true; // Email is optional (user already provided email during account creation)
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePhone = (value: string): boolean => {
    if (!value) {
      setPhoneError('');
      return true; // Phone is optional
    }
    const digitsOnly = value.replace(/\D/g, '');
    const countryConfig = phoneCountryCodes.find(c => c.code === phoneCountryCode);
    const expectedDigits = countryConfig?.digits || 10;
    if (digitsOnly.length !== expectedDigits) {
      setPhoneError(`Phone number should be ${expectedDigits} digits for ${countryConfig?.country || 'this country'}`);
      return false;
    }
    setPhoneError('');
    return true;
  };

  const validateWebsite = (value: string): boolean => {
    if (!value) {
      setWebsiteError('');
      return true; // Website is optional
    }
    try {
      const url = new URL(value.startsWith('http') ? value : `https://${value}`);
      if (!url.hostname.includes('.')) {
        setWebsiteError('Please enter a valid website URL');
        return false;
      }
      setWebsiteError('');
      return true;
    } catch {
      setWebsiteError('Please enter a valid website URL');
      return false;
    }
  };

  // Format phone number as user types
  const handlePhoneChange = (value: string) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    setPhone(digitsOnly);
    if (digitsOnly) {
      validatePhone(digitsOnly);
    } else {
      setPhoneError('');
    }
  };

  // Format phone for display
  const formatPhoneDisplay = (digits: string): string => {
    if (!digits) return '';
    if (phoneCountryCode === '+1') {
      // US/CA format: (555) 123-4567
      if (digits.length <= 3) return `(${digits}`;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    // Default: just show digits with spaces every 3-4 digits
    return digits.replace(/(\d{3,4})(?=\d)/g, '$1 ').trim();
  };

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

  // Country to currency mapping
  const countryCurrencyMap: Record<string, string> = {
    US: 'USD',
    CA: 'CAD',
    GB: 'GBP',
    AU: 'AUD',
  };

  // Auto-set currency when country changes
  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    const suggestedCurrency = countryCurrencyMap[newCountry];
    if (suggestedCurrency) {
      setCurrency(suggestedCurrency);
    }
  };

  // Populate form when farm data loads
  useEffect(() => {
    if (farm) {
      setName(farm.name || '');
      setTimezone(farm.timezone || 'UTC');
      setCurrency(farm.currency || 'USD');
      setWeightUnit(farm.weightUnit || 'oz');
      setLengthUnit(farm.lengthUnit || 'in');
      // Contact info - parse phone with country code
      if (farm.phone) {
        // Try to extract country code from stored phone
        const phoneMatch = farm.phone.match(/^(\+\d{1,3})\s*(.*)$/);
        if (phoneMatch) {
          const [, code, number] = phoneMatch;
          // Check if we have this country code
          const knownCode = phoneCountryCodes.find(c => c.code === code);
          if (knownCode) {
            setPhoneCountryCode(code);
          }
          // Extract just digits from the number part
          setPhone(number.replace(/\D/g, ''));
        } else {
          // No country code found, just use digits
          setPhone(farm.phone.replace(/\D/g, ''));
        }
      } else {
        setPhone('');
      }
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

  // Handle Stripe redirect after onboarding
  useEffect(() => {
    const stripeOnboarding = searchParams.get('stripe_onboarding');
    if (stripeOnboarding === 'complete') {
      refetchStripeStatus();
      showToast('success', 'Stripe account connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (stripeOnboarding === 'refresh') {
      showToast('error', 'Stripe onboarding was interrupted. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, refetchStripeStatus, showToast]);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('error', 'Farm name is required');
      return;
    }

    // Validate contact information
    const isEmailValid = validateEmail(email);
    const isPhoneValid = validatePhone(phone);
    const isWebsiteValid = validateWebsite(website);

    if (!isEmailValid || !isPhoneValid || !isWebsiteValid) {
      showToast('error', 'Please fix the validation errors before saving');
      return;
    }

    // Format phone with country code for storage
    const formattedPhone = phone ? `${phoneCountryCode} ${formatPhoneDisplay(phone)}` : undefined;

    try {
      await updateFarm.mutateAsync({
        name: name.trim(),
        timezone,
        currency,
        weightUnit: weightUnit as 'oz' | 'g' | 'lb' | 'kg',
        lengthUnit: lengthUnit as 'in' | 'ft' | 'cm' | 'm',
        // Contact info
        phone: formattedPhone,
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
      showToast('success', 'Settings saved successfully');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const handleDelete = async () => {
    if (!currentFarmId) return;

    try {
      await deleteFarm.mutateAsync(currentFarmId);
      setCurrentFarm(null);
      navigate('/');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to delete farm');
    }
  };

  const handleStripeConnect = async () => {
    try {
      const result = await stripeConnect.mutateAsync();
      // Redirect to Stripe onboarding
      window.location.href = result.url;
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to start Stripe connection');
    }
  };

  const handleStripeDisconnect = async () => {
    try {
      await stripeDisconnect.mutateAsync();
      refetchStripeStatus();
      showToast('success', 'Stripe account disconnected');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to disconnect Stripe');
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

      {/* Farm details */}
      <div className="border rounded-lg p-6 bg-card space-y-4" data-tutorial="farm-info">
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
      </div>

      {/* Business Address */}
      <div className="border rounded-lg p-6 bg-card space-y-4" data-tutorial="farm-location">
        <h2 className="text-lg font-semibold">Business Address</h2>
        <p className="text-sm text-muted-foreground">
          Your business address will appear on invoices, packing slips, and other documents.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Address Line 1</label>
            <AddressAutocomplete
              value={addressLine1}
              onChange={setAddressLine1}
              onAddressSelect={(address) => {
                setAddressLine1(address.addressLine1);
                setAddressLine2(address.addressLine2);
                setCity(address.city);
                setState(address.state);
                setPostalCode(address.postalCode);
                handleCountryChange(address.country);
              }}
              placeholder="Start typing an address..."
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
                onChange={(e) => handleCountryChange(e.target.value)}
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
      </div>

      {/* Contact Information */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Contact Information</h2>
        <p className="text-sm text-muted-foreground">
          Contact details that will appear on documents and be available to customers.
        </p>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              placeholder="orders@yourfarm.com"
              className={`w-full px-3 py-2 border rounded-md bg-background ${emailError ? 'border-destructive' : ''}`}
            />
            {emailError && (
              <p className="text-xs text-destructive mt-1">{emailError}</p>
            )}
          </div>

          {/* Phone with Country Code */}
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <div className="flex gap-2">
              <select
                value={phoneCountryCode}
                onChange={(e) => {
                  setPhoneCountryCode(e.target.value);
                  if (phone) validatePhone(phone);
                }}
                className="px-3 py-2 border rounded-md bg-background w-28"
              >
                {phoneCountryCodes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.country})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={formatPhoneDisplay(phone)}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={() => validatePhone(phone)}
                placeholder={phoneCountryCode === '+1' ? '(555) 123-4567' : 'Phone number'}
                className={`flex-1 px-3 py-2 border rounded-md bg-background ${phoneError ? 'border-destructive' : ''}`}
              />
            </div>
            {phoneError && (
              <p className="text-xs text-destructive mt-1">{phoneError}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => {
                setWebsite(e.target.value);
                if (websiteError) validateWebsite(e.target.value);
              }}
              onBlur={() => validateWebsite(website)}
              placeholder="https://yourfarm.com"
              className={`w-full px-3 py-2 border rounded-md bg-background ${websiteError ? 'border-destructive' : ''}`}
            />
            {websiteError && (
              <p className="text-xs text-destructive mt-1">{websiteError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Timezone & Currency */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Timezone & Currency</h2>
        <p className="text-sm text-muted-foreground">
          Set your timezone for scheduling and your preferred currency for pricing.
        </p>

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
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
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
              <option value="AUD">AUD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preferred Unit of Measurement */}
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Preferred Unit of Measurement</h2>
        <p className="text-sm text-muted-foreground">
          Set your preferred units for product weights and lengths. You can change these at any point.
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

            {/* Platform Fee Info */}
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                A {paymentSettings?.applicationFeePercent || 2.5}% platform fee is applied to each transaction to support Rooted Planner.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save / Cancel Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={updateFarm.isPending}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {updateFarm.isPending ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={() => {
            // Reset form to original values
            if (farm) {
              setName(farm.name || '');
              setTimezone(farm.timezone || 'UTC');
              setCurrency(farm.currency || 'USD');
              setWeightUnit(farm.weightUnit || 'oz');
              setLengthUnit(farm.lengthUnit || 'in');
              if (farm.phone) {
                const phoneMatch = farm.phone.match(/^(\+\d{1,3})\s*(.*)$/);
                if (phoneMatch) {
                  const [, code, number] = phoneMatch;
                  const knownCode = phoneCountryCodes.find(c => c.code === code);
                  if (knownCode) setPhoneCountryCode(code);
                  setPhone(number.replace(/\D/g, ''));
                } else {
                  setPhone(farm.phone.replace(/\D/g, ''));
                }
              } else {
                setPhone('');
              }
              setEmail(farm.email || '');
              setWebsite(farm.website || '');
              setAddressLine1(farm.addressLine1 || '');
              setAddressLine2(farm.addressLine2 || '');
              setCity(farm.city || '');
              setState(farm.state || '');
              setPostalCode(farm.postalCode || '');
              setCountry(farm.country || 'US');
              setInvoicePrefix(farm.invoicePrefix || 'INV');
              setNextInvoiceNumber(farm.nextInvoiceNumber || 1);
              setInvoiceFooterNotes(farm.invoiceFooterNotes || '');
            }
            // Clear validation errors
            setEmailError('');
            setPhoneError('');
            setWebsiteError('');
          }}
          className="px-6 py-2 border rounded-md hover:bg-accent"
        >
          Cancel
        </button>
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
