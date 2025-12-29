import { useFarmStore } from '@/stores/farm-store';
import { useZones } from '@/lib/api-client';

export default function ZonesPage() {
  const { currentFarmId } = useFarmStore();
  const { data: zones, isLoading } = useZones(currentFarmId ?? undefined);

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to manage zones.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zones</h1>
          <p className="text-muted-foreground">Manage farm zones and production areas</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Add Zone
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : zones && zones.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Area</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: zone.color }} />
                      {zone.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{zone.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{zone.area ? `${zone.area} m²` : '-'}</td>
                  <td className="px-4 py-3">
                    <button className="text-sm text-primary hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">📍</div>
          <h3 className="text-lg font-semibold">No zones yet</h3>
          <p className="text-muted-foreground">Create your first zone to start organizing your farm.</p>
        </div>
      )}
    </div>
  );
}
