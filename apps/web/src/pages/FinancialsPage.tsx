import { useFarmStore } from '@/stores/farm-store';

export default function FinancialsPage() {
  const { currentFarmId } = useFarmStore();

  if (!currentFarmId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Farm Selected</h2>
          <p className="text-muted-foreground">Select a farm from the sidebar to view financials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financials</h1>
          <p className="text-muted-foreground">Budgets, transactions, and financial projections</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80">
            Export Report
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Add Transaction
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Revenue (YTD)</p>
          <p className="text-2xl font-bold text-green-600">$0.00</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Expenses (YTD)</p>
          <p className="text-2xl font-bold text-red-600">$0.00</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className="text-2xl font-bold">$0.00</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Budget Used</p>
          <p className="text-2xl font-bold">0%</p>
        </div>
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-8 text-center bg-card">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold">Revenue vs Expenses</h3>
          <p className="text-muted-foreground">Monthly chart will appear here (Recharts)</p>
        </div>
        <div className="border rounded-lg p-8 text-center bg-card">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-lg font-semibold">Cash Flow</h3>
          <p className="text-muted-foreground">Cash flow projection will appear here</p>
        </div>
      </div>
    </div>
  );
}
