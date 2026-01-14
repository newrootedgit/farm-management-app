import { useEffect, useRef, useState, useCallback } from 'react';

interface AddressComponents {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: AddressComponents) => void;
  placeholder?: string;
  className?: string;
}

// Declare google types
declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces?: () => void;
  }
}

let isScriptLoaded = false;
let isScriptLoading = false;
const callbacks: (() => void)[] = [];

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    // Check if script tag already exists (from another component)
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript && window.google?.maps?.places) {
      isScriptLoaded = true;
      resolve();
      return;
    }

    if (isScriptLoading) {
      callbacks.push(() => resolve());
      return;
    }

    // If google maps is already on window but places isn't loaded, wait for it
    if (window.google?.maps) {
      const checkPlaces = () => {
        if (window.google?.maps?.places) {
          isScriptLoaded = true;
          resolve();
        } else {
          setTimeout(checkPlaces, 100);
        }
      };
      checkPlaces();
      return;
    }

    isScriptLoading = true;

    // Set up callback
    window.initGooglePlaces = () => {
      isScriptLoaded = true;
      isScriptLoading = false;
      callbacks.forEach((cb) => cb());
      callbacks.length = 0;
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      isScriptLoading = false;
      reject(new Error('Failed to load Google Places script'));
    };

    document.head.appendChild(script);
  });
}

function parseAddressComponents(
  place: google.maps.places.PlaceResult
): AddressComponents {
  const components: AddressComponents = {
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
  };

  if (!place.address_components) {
    return components;
  }

  let streetNumber = '';
  let route = '';

  for (const component of place.address_components) {
    const types = component.types;

    if (types.includes('street_number')) {
      streetNumber = component.long_name || '';
    } else if (types.includes('route')) {
      route = component.long_name || '';
    } else if (types.includes('subpremise')) {
      components.addressLine2 = component.long_name || '';
    } else if (types.includes('locality')) {
      components.city = component.long_name || '';
    } else if (types.includes('administrative_area_level_1')) {
      components.state = component.short_name || '';
    } else if (types.includes('postal_code')) {
      components.postalCode = component.long_name || '';
    } else if (types.includes('country')) {
      components.country = component.short_name || 'US';
    }
  }

  components.addressLine1 = [streetNumber, route].filter(Boolean).join(' ');

  return components;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Start typing an address...',
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  // Store callbacks in refs to avoid closure issues
  const onAddressSelectRef = useRef(onAddressSelect);
  onAddressSelectRef.current = onAddressSelect;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Handle place selection
  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();

    if (place && place.address_components) {
      const parsed = parseAddressComponents(place);
      // Update the input to show just the street address
      onChangeRef.current(parsed.addressLine1);
      // Call the callback with all parsed components
      onAddressSelectRef.current(parsed);
    }
  }, []);

  // Load the Google Places script
  useEffect(() => {
    if (!apiKey) {
      setError('Google Places API key not configured');
      return;
    }

    loadGooglePlacesScript(apiKey)
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [apiKey]);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address'],
      });

      autocomplete.addListener('place_changed', handlePlaceChanged);
      autocompleteRef.current = autocomplete;
    } catch (err) {
      console.error('Error creating Autocomplete:', err);
      setError('Failed to initialize address autocomplete');
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, handlePlaceChanged]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Fallback input when API key is not configured
  if (!apiKey) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className || 'w-full px-3 py-2 border rounded-md bg-white'}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Address autocomplete requires a Google Places API key
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className || 'w-full px-3 py-2 border rounded-md bg-white'}
        />
        <p className="text-xs text-destructive mt-1">{error}</p>
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleInputChange}
      placeholder={isLoaded ? placeholder : 'Loading...'}
      disabled={!isLoaded}
      className={className || 'w-full px-3 py-2 border rounded-md bg-white'}
      style={{ backgroundColor: 'white' }}
    />
  );
}
