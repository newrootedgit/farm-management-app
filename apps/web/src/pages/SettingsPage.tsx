import { useFarmStore } from '@/stores/farm-store';
import { useFarm } from '@/lib/api-client';

export default function SettingsPage() {
  const { currentFarmId } = useFarmStore();
  const { data: farm } = useFarm(currentFarmId ?? undefined);

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
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-lg font-semibold">Farm Details</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Farm Name</label>
          <input
            type="text"
            defaultValue={farm?.name || ''}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            type="text"
            defaultValue={farm?.slug || ''}
            className="w-full px-3 py-2 border rounded-md bg-background"
            disabled
          />
          <p className="text-xs text-muted-foreground mt-1">Used in URLs</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Timezone</label>
            <select className="w-full px-3 py-2 border rounded-md bg-background">
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select className="w-full px-3 py-2 border rounded-md bg-background">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>

        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Save Changes
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

      {/* Danger zone */}
      <div className="border border-destructive/50 rounded-lg p-6 bg-destructive/5 space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          These actions are irreversible. Please be certain.
        </p>
        <button className="px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground">
          Delete Farm
        </button>
      </div>
    </div>
  );
}
