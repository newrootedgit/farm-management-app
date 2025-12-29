export default function Dashboard() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Farm Management Platform
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your complete solution for farm operations, inventory, and planning.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
          <FeatureCard title="Farm Layout" description="Interactive 2D canvas" />
          <FeatureCard title="Inventory" description="Track products & stock" />
          <FeatureCard title="Employees" description="Scheduling & time tracking" />
          <FeatureCard title="Financials" description="Budgets & projections" />
          <FeatureCard title="Wiki/SOPs" description="Documentation system" />
          <FeatureCard title="Planning" description="Seasonal crop planning" />
          <FeatureCard title="Zones" description="Production tracking" />
          <FeatureCard title="Reports" description="Insights & analytics" />
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Run <code className="bg-muted px-2 py-1 rounded">pnpm install</code> then{' '}
          <code className="bg-muted px-2 py-1 rounded">pnpm dev</code> to start developing.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-card-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
