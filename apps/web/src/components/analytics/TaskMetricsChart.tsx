import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface TasksByTypeData {
  type: string;
  label: string;
  pending: number;
  completed: number;
}

interface TaskMetricsChartProps {
  data: TasksByTypeData[];
  height?: number;
}

export function TaskMetricsChart({ data, height = 200 }: TaskMetricsChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pending = payload.find((p: any) => p.dataKey === 'pending')?.value || 0;
      const completed = payload.find((p: any) => p.dataKey === 'completed')?.value || 0;
      const total = pending + completed;
      const rate = total > 0 ? ((completed / total) * 100).toFixed(0) : 0;

      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-muted-foreground">
            Pending: <span className="font-medium text-foreground">{pending}</span>
          </p>
          <p className="text-muted-foreground">
            Completed: <span className="font-medium text-foreground">{completed}</span>
          </p>
          <p className="text-muted-foreground">
            Rate: <span className="font-medium text-foreground">{rate}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No task data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={30}
          className="text-muted-foreground"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) => <span className="text-muted-foreground capitalize">{value}</span>}
        />
        <Bar dataKey="pending" name="Pending" fill="#94a3b8" stackId="stack" radius={[0, 0, 0, 0]} />
        <Bar dataKey="completed" name="Completed" fill="#22c55e" stackId="stack" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Yield variance chart
interface YieldVarianceData {
  product: string;
  expected: number;
  actual: number;
  variance: number;
}

interface YieldVarianceChartProps {
  data: YieldVarianceData[];
  maxItems?: number;
}

export function YieldVarianceChart({ data, maxItems = 5 }: YieldVarianceChartProps) {
  const chartData = data.slice(0, maxItems);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No yield data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {chartData.map((item) => {
        const isOver = item.variance >= 0;
        const absVariance = Math.abs(item.variance);
        const barWidth = Math.min(absVariance, 100);

        return (
          <div key={item.product} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[150px]">{item.product}</span>
              <span className={isOver ? 'text-green-600' : 'text-red-600'}>
                {isOver ? '+' : ''}{item.variance.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
              {/* Variance bar */}
              <div
                className={`absolute top-0 bottom-0 rounded-full transition-all ${
                  isOver ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{
                  left: isOver ? '50%' : `${50 - barWidth / 2}%`,
                  width: `${barWidth / 2}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Expected: {item.expected.toFixed(0)} oz</span>
              <span>Actual: {item.actual.toFixed(0)} oz</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Completion rate gauge
interface CompletionGaugeProps {
  rate: number;
  size?: number;
}

export function CompletionGauge({ rate, size = 120 }: CompletionGaugeProps) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  const getColor = () => {
    if (rate >= 90) return '#22c55e';
    if (rate >= 70) return '#facc15';
    return '#ef4444';
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={10}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{rate.toFixed(0)}%</span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}
