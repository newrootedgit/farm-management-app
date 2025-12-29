import { useEffect, useState, useRef, useCallback } from 'react';
import { useFarmStore } from '@/stores/farm-store';
import { useCanvasStore, CanvasZone } from '@/stores/canvas-store';
import { useFarmLayout, useUpdateFarmLayout, useZones } from '@/lib/api-client';
import { FarmCanvas, CanvasToolbar, PropertiesPanel } from '@/components/farm-canvas';

export default function FarmLayout() {
  const { currentFarmId } = useFarmStore();
  const { data: layout, isLoading: layoutLoading } = useFarmLayout(currentFarmId ?? undefined);
  const { data: apiZones, isLoading: zonesLoading } = useZones(currentFarmId ?? undefined);
  const updateLayout = useUpdateFarmLayout(currentFarmId ?? '');

  const { zones, setZones, selectedId, setDirty } = useCanvasStore();
  const [selectedZone, setSelectedZone] = useState<CanvasZone | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync API zones to canvas store on load
  useEffect(() => {
    if (apiZones) {
      const canvasZones: CanvasZone[] = apiZones.map((z) => ({
        id: z.id,
        name: z.name,
        type: z.type,
        color: z.color,
        x: z.positionX ?? 50,
        y: z.positionY ?? 50,
        width: z.width ?? 150,
        height: z.height ?? 100,
      }));
      setZones(canvasZones);
    }
  }, [apiZones, setZones]);

  // Update canvas size based on container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({
          width: rect.width,
          height: Math.max(500, rect.height),
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Find selected zone
  useEffect(() => {
    if (selectedId) {
      const zone = zones.find((z) => z.id === selectedId);
      setSelectedZone(zone ?? null);
    } else {
      setSelectedZone(null);
    }
  }, [selectedId, zones]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentFarmId) return;

    // Save layout canvas data
    await updateLayout.mutateAsync({
      width: layout?.canvasData?.width ?? 1200,
      height: layout?.canvasData?.height ?? 800,
      backgroundColor: '#f5f5f5',
      gridSize: 20,
    });

    // TODO: Also save zone positions to backend
    // This would require zone update API calls

    setDirty(false);
  }, [currentFarmId, layout, updateLayout, setDirty]);

  // Handle zone selection from canvas
  const handleZoneSelect = useCallback((zone: CanvasZone | null) => {
    setSelectedZone(zone);
  }, []);

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
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Farm Layout</h1>
        <p className="text-muted-foreground">Interactive 2D view of your farm</p>
      </div>

      <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card">
        <CanvasToolbar onSave={handleSave} isSaving={updateLayout.isPending} />

        <div className="flex-1 flex">
          {/* Canvas container */}
          <div ref={containerRef} className="flex-1">
            <FarmCanvas
              width={canvasSize.width}
              height={canvasSize.height}
              onZoneSelect={handleZoneSelect}
            />
          </div>

          {/* Properties panel */}
          <PropertiesPanel zone={selectedZone} />
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-muted-foreground">
        <strong>Tips:</strong> Use the toolbar to switch between Select and Draw Zone modes.
        Scroll to zoom, drag zones to move them. Click a zone to edit its properties.
      </div>
    </div>
  );
}
