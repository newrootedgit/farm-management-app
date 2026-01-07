import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { formatWeight } from '@/hooks/useAnalytics';

interface TopCustomersChartProps {
  data: { name: string; totalOz: number; orderCount: number }[];
  height?: number;
  maxItems?: number;
}

// Color palette for customers
const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--primary) / 0.8)',
  'hsl(var(--primary) / 0.6)',
  'hsl(var(--primary) / 0.5)',
  'hsl(var(--primary) / 0.4)',
  'hsl(var(--primary) / 0.35)',
  'hsl(var(--primary) / 0.3)',
  'hsl(var(--primary) / 0.25)',
  'hsl(var(--primary) / 0.2)',
  'hsl(var(--primary) / 0.15)',
];

export function TopCustomersChart({ data, height = 300, maxItems = 5 }: TopCustomersChartProps) {
  const chartData = data.slice(0, maxItems);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium">{item.name}</p>
          <p className="text-muted-foreground">
            Volume: <span className="font-medium text-foreground">{formatWeight(item.totalOz)}</span>
          </p>
          <p className="text-muted-foreground">
            Orders: <span className="font-medium text-foreground">{item.orderCount}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Format Y axis
  const formatYAxis = (value: number) => {
    if (value >= 16) {
      return `${(value / 16).toFixed(0)}lb`;
    }
    return `${value}oz`;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No customer data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
      >
        <XAxis
          type="number"
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={100}
          className="text-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="totalOz" radius={[0, 4, 4, 0]} barSize={20}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index] || COLORS[COLORS.length - 1]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Simple list version for smaller spaces
interface CustomerListProps {
  data: { name: string; totalOz: number; orderCount: number }[];
  maxItems?: number;
}

export function TopCustomersList({ data, maxItems = 5 }: CustomerListProps) {
  const listData = data.slice(0, maxItems);
  const maxOz = Math.max(...listData.map((d) => d.totalOz), 1);

  if (listData.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No customer data
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listData.map((customer, index) => (
        <div key={customer.name} className="flex items-center gap-3">
          <span className="w-5 h-5 flex items-center justify-center text-xs font-medium bg-muted rounded-full">
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium truncate">{customer.name}</span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {formatWeight(customer.totalOz)}
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(customer.totalOz / maxOz) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
