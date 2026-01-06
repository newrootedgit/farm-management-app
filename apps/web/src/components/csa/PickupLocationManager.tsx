import { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MapPinIcon, ClockIcon, PhoneIcon } from '@heroicons/react/24/outline';
import type { CsaPickupLocation } from '@farm/shared';

interface PickupLocationManagerProps {
  locations: CsaPickupLocation[];
  onAdd: (location: Omit<CsaPickupLocation, 'id' | 'programId'>) => Promise<void>;
  onUpdate: (id: string, location: Partial<CsaPickupLocation>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

interface LocationFormData {
  name: string;
  address: string;
  pickupDay: number | null;
  pickupTimeStart: string;
  pickupTimeEnd: string;
  contactName: string;
  contactPhone: string;
  notes: string;
  isActive: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const initialFormData: LocationFormData = {
  name: '',
  address: '',
  pickupDay: null,
  pickupTimeStart: '',
  pickupTimeEnd: '',
  contactName: '',
  contactPhone: '',
  notes: '',
  isActive: true,
};

export function PickupLocationManager({
  locations,
  onAdd,
  onUpdate,
  onDelete,
  isLoading = false,
  disabled = false,
}: PickupLocationManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const handleEdit = (location: CsaPickupLocation) => {
    setFormData({
      name: location.name,
      address: location.address,
      pickupDay: location.pickupDay,
      pickupTimeStart: location.pickupTimeStart || '',
      pickupTimeEnd: location.pickupTimeEnd || '',
      contactName: location.contactName || '',
      contactPhone: location.contactPhone || '',
      notes: location.notes || '',
      isActive: location.isActive,
    });
    setEditingId(location.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) return;

    setSaving(true);
    try {
      const locationData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        pickupDay: formData.pickupDay,
        pickupTimeStart: formData.pickupTimeStart || null,
        pickupTimeEnd: formData.pickupTimeEnd || null,
        contactName: formData.contactName.trim() || null,
        contactPhone: formData.contactPhone.trim() || null,
        notes: formData.notes.trim() || null,
        isActive: formData.isActive,
      };

      if (editingId) {
        await onUpdate(editingId, locationData);
      } else {
        await onAdd(locationData);
      }

      handleCancel();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pickup location?')) return;
    await onDelete(id);
  };

  const activeLocations = locations.filter((l) => l.isActive);
  const inactiveLocations = locations.filter((l) => !l.isActive);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Pickup Locations</h3>
          <p className="text-sm text-gray-500">
            Manage where members can pick up their shares
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={disabled}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-4 w-4" />
            Add Location
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Main Farm, Downtown Market"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Farm Road, City, State 12345"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Day
              </label>
              <select
                value={formData.pickupDay ?? ''}
                onChange={(e) => setFormData({ ...formData, pickupDay: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Not set</option>
                {DAYS.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Start Time
              </label>
              <input
                type="time"
                value={formData.pickupTimeStart}
                onChange={(e) => setFormData({ ...formData, pickupTimeStart: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup End Time
              </label>
              <input
                type="time"
                value={formData.pickupTimeEnd}
                onChange={(e) => setFormData({ ...formData, pickupTimeEnd: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Site coordinator name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Parking instructions, building access, etc."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active (available for member selection)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim() || !formData.address.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : editingId ? 'Update Location' : 'Add Location'}
            </button>
          </div>
        </form>
      )}

      {/* Locations List */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading locations...</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          No pickup locations yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {activeLocations.length > 0 && (
            <div className="space-y-2">
              {activeLocations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  onEdit={() => handleEdit(location)}
                  onDelete={() => handleDelete(location.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          )}

          {inactiveLocations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Inactive Locations</h4>
              <div className="space-y-2 opacity-60">
                {inactiveLocations.map((location) => (
                  <LocationCard
                    key={location.id}
                    location={location}
                    onEdit={() => handleEdit(location)}
                    onDelete={() => handleDelete(location.id)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LocationCard({
  location,
  onEdit,
  onDelete,
  disabled,
}: {
  location: CsaPickupLocation;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const hasSchedule = location.pickupDay !== null || location.pickupTimeStart;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{location.name}</h4>
            {!location.isActive && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                Inactive
              </span>
            )}
          </div>

          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-gray-400" />
              {location.address}
            </div>

            {hasSchedule && (
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                {location.pickupDay !== null && DAYS[location.pickupDay]}
                {location.pickupTimeStart && ` ${location.pickupTimeStart}`}
                {location.pickupTimeEnd && ` - ${location.pickupTimeEnd}`}
              </div>
            )}

            {location.contactPhone && (
              <div className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
                {location.contactName && `${location.contactName}: `}
                {location.contactPhone}
              </div>
            )}

            {location.notes && (
              <p className="text-gray-500 italic">{location.notes}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
