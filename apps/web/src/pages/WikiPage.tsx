import { useFarmStore } from '@/stores/farm-store';

export default function WikiPage() {
  const { currentFarmId } = useFarmStore();

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to access the wiki.</p>
        </div>
      </div>
    );
  }

  const spaces = [
    { name: 'Standard Operating Procedures', icon: '📋', pages: 0 },
    { name: 'Training Materials', icon: '📚', pages: 0 },
    { name: 'Equipment Guides', icon: '🔧', pages: 0 },
    { name: 'Safety Protocols', icon: '⚠️', pages: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wiki & SOPs</h1>
          <p className="text-muted-foreground">Documentation, procedures, and internal knowledge base</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
            New Space
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            New Page
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search documentation..."
          className="w-full px-4 py-2 pl-10 border rounded-md bg-background"
        />
        <svg
          className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Spaces grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {spaces.map((space) => (
          <button
            key={space.name}
            className="border rounded-lg p-6 bg-card text-left hover:border-primary transition-colors"
          >
            <div className="text-3xl mb-3">{space.icon}</div>
            <h3 className="font-semibold">{space.name}</h3>
            <p className="text-sm text-muted-foreground">{space.pages} pages</p>
          </button>
        ))}
      </div>

      {/* Recent pages placeholder */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Pages</h2>
        <div className="border rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-semibold">No pages yet</h3>
          <p className="text-muted-foreground">Create your first page to start documenting.</p>
          <p className="text-sm text-muted-foreground mt-2">Uses TipTap rich text editor</p>
        </div>
      </div>
    </div>
  );
}
