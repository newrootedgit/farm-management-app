import { useFarmStore } from '@/stores/farm-store';
import { useFarmLayout, useZones } from '@/lib/api-client';

export default function FarmLayout() {
  const { currentFarmId } = useFarmStore();
  const { data: layout, isLoading: layoutLoading } = useFarmLayout(currentFarmId ?? undefined);
  const { data: zones, isLoading: zonesLoading } = useZones(currentFarmId ?? undefined);

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to view the layout.</p>
        </div>
      </div>
    );
  }

  if (layoutLoading || zonesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Farm Layout</h1>
          <p className="text-muted-foreground">Interactive 2D view of your farm</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
            Toggle Grid
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Add Zone
          </button>
        </div>
      </div>

      {/* Canvas placeholder - Konva.js will go here */}
      <div className="border rounded-lg bg-muted/20 h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🗺️</div>
          <h3 className="text-lg font-semibold">Farm Canvas</h3>
          <p className="text-muted-foreground">Konva.js canvas will render here</p>
          <p className="text-sm text-muted-foreground mt-2">
            {zones?.length || 0} zones defined • Canvas: {layout?.canvasData?.width}x{layout?.canvasData?.height}
          </p>
        </div>
      </div>

      {/* Zone list */}
      {zones && zones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Zones ({zones.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => (
              <div key={zone.id} className="border rounded-lg p-4 bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: zone.color }}
                  />
                  <div>
                    <h3 className="font-medium">{zone.name}</h3>
                    <p className="text-sm text-muted-foreground">{zone.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
