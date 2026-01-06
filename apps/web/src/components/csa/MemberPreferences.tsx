import { useState, useEffect } from 'react';
import { CheckIcon, HeartIcon, HandThumbUpIcon, HandThumbDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, HandThumbUpIcon as ThumbUpSolid, HandThumbDownIcon as ThumbDownSolid, ExclamationTriangleIcon as WarningSolid } from '@heroicons/react/24/solid';
import type { CsaMember, Product } from '@farm/shared';

type PreferenceType = 'LOVE' | 'LIKE' | 'DISLIKE' | 'ALLERGY';

interface MemberPreference {
  productId: string;
  preference: PreferenceType;
  notes?: string;
}

interface MemberPreferencesProps {
  member: CsaMember & {
    preferences?: Array<{
      productId: string;
      preference: PreferenceType;
      notes?: string;
    }>;
  };
  products: Product[];
  onSave: (preferences: MemberPreference[]) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

const preferenceConfig: Record<PreferenceType, { label: string; color: string; Icon: React.ComponentType<{ className?: string }>; SolidIcon: React.ComponentType<{ className?: string }> }> = {
  LOVE: { label: 'Love', color: 'text-pink-500', Icon: HeartIcon, SolidIcon: HeartSolid },
  LIKE: { label: 'Like', color: 'text-green-500', Icon: HandThumbUpIcon, SolidIcon: ThumbUpSolid },
  DISLIKE: { label: 'Dislike', color: 'text-orange-500', Icon: HandThumbDownIcon, SolidIcon: ThumbDownSolid },
  ALLERGY: { label: 'Allergy', color: 'text-red-500', Icon: ExclamationTriangleIcon, SolidIcon: WarningSolid },
};

export function MemberPreferences({
  member,
  products,
  onSave,
  isLoading = false,
  disabled = false,
}: MemberPreferencesProps) {
  const [preferences, setPreferences] = useState<Map<string, { preference: PreferenceType | null; notes: string }>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Initialize preferences from member data
  useEffect(() => {
    const prefMap = new Map<string, { preference: PreferenceType | null; notes: string }>();

    // Initialize all products with null preference
    products.forEach((p) => {
      prefMap.set(p.id, { preference: null, notes: '' });
    });

    // Set existing preferences
    member.preferences?.forEach((pref) => {
      prefMap.set(pref.productId, {
        preference: pref.preference,
        notes: pref.notes || '',
      });
    });

    setPreferences(prefMap);
    setHasChanges(false);
  }, [member, products]);

  const setPreference = (productId: string, preference: PreferenceType | null) => {
    const current = preferences.get(productId) || { preference: null, notes: '' };
    const newPref = current.preference === preference ? null : preference;

    setPreferences(new Map(preferences).set(productId, {
      ...current,
      preference: newPref,
    }));
    setHasChanges(true);
  };

  const setNotes = (productId: string, notes: string) => {
    const current = preferences.get(productId) || { preference: null, notes: '' };
    setPreferences(new Map(preferences).set(productId, {
      ...current,
      notes,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const prefsToSave: MemberPreference[] = [];

    preferences.forEach((value, productId) => {
      if (value.preference) {
        prefsToSave.push({
          productId,
          preference: value.preference,
          notes: value.notes || undefined,
        });
      }
    });

    await onSave(prefsToSave);
    setHasChanges(false);
  };

  // Group products by preference
  const groupedProducts = {
    ALLERGY: products.filter((p) => preferences.get(p.id)?.preference === 'ALLERGY'),
    DISLIKE: products.filter((p) => preferences.get(p.id)?.preference === 'DISLIKE'),
    LOVE: products.filter((p) => preferences.get(p.id)?.preference === 'LOVE'),
    LIKE: products.filter((p) => preferences.get(p.id)?.preference === 'LIKE'),
    none: products.filter((p) => !preferences.get(p.id)?.preference),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Product Preferences</h3>
          <p className="text-sm text-gray-500">
            Set preferences to customize share contents
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading || disabled}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckIcon className="h-4 w-4" />
            {isLoading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {(Object.entries(preferenceConfig) as Array<[PreferenceType, typeof preferenceConfig[PreferenceType]]>).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1">
            <config.SolidIcon className={`h-4 w-4 ${config.color}`} />
            <span className="text-gray-600">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Summary chips for non-neutral preferences */}
      {(groupedProducts.ALLERGY.length > 0 || groupedProducts.DISLIKE.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm font-medium text-amber-800 mb-2">Items to avoid:</p>
          <div className="flex flex-wrap gap-2">
            {groupedProducts.ALLERGY.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                <WarningSolid className="h-3 w-3" />
                {p.name}
              </span>
            ))}
            {groupedProducts.DISLIKE.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                <ThumbDownSolid className="h-3 w-3" />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Product list */}
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
        {products.map((product) => {
          const pref = preferences.get(product.id);
          const isExpanded = expandedProduct === product.id;

          return (
            <div key={product.id} className="p-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                  className="text-left flex-1"
                >
                  <span className="font-medium text-gray-900">{product.name}</span>
                  {pref?.notes && (
                    <span className="ml-2 text-xs text-gray-500">(has notes)</span>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  {(Object.entries(preferenceConfig) as Array<[PreferenceType, typeof preferenceConfig[PreferenceType]]>).map(([key, config]) => {
                    const isSelected = pref?.preference === key;
                    const IconComponent = isSelected ? config.SolidIcon : config.Icon;

                    return (
                      <button
                        key={key}
                        onClick={() => setPreference(product.id, key)}
                        disabled={disabled}
                        className={`p-1.5 rounded-full transition-colors ${
                          isSelected
                            ? `${config.color} bg-gray-100`
                            : 'text-gray-300 hover:text-gray-500'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={config.label}
                      >
                        <IconComponent className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2">
                  <textarea
                    value={pref?.notes || ''}
                    onChange={(e) => setNotes(product.id, e.target.value)}
                    disabled={disabled}
                    placeholder="Add notes (e.g., 'mild allergy', 'family doesn't like', etc.)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
                    rows={2}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
