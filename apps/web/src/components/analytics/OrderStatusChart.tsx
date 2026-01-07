import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface OrderStatusChartProps {
  data: { status: string; count: number; percentage: number }[];
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#facc15', // yellow
  IN_PROGRESS: '#3b82f6', // blue
  READY: '#22c55e', // green
  DELIVERED: '#a855f7', // purple
  CANCELLED: '#ef4444', // red
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  READY: 'Ready',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function OrderStatusChart({ data, height = 250 }: OrderStatusChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium">{STATUS_LABELS[item.status] || item.status}</p>
          <p className="text-muted-foreground">
            Count: <span className="font-medium text-foreground">{item.count}</span>
          </p>
          <p className="text-muted-foreground">
            Percentage: <span className="font-medium text-foreground">{item.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {STATUS_LABELS[entry.value] || entry.value}
            </span>
            <span className="font-medium">({entry.payload.count})</span>
          </div>
        ))}
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
        No orders yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={50}
          outerRadius={80}
          dataKey="count"
          nameKey="status"
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={STATUS_COLORS[entry.status] || '#6b7280'}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderLegend} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Simple status badge list (alternative to pie chart)
interface StatusListProps {
  data: { status: string; count: number; percentage: number }[];
}

export function StatusList({ data }: StatusListProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.status} className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[item.status] || '#6b7280' }}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span>{STATUS_LABELS[item.status] || item.status}</span>
              <span className="font-medium">{item.count}</span>
            </div>
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                  backgroundColor: STATUS_COLORS[item.status] || '#6b7280',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
