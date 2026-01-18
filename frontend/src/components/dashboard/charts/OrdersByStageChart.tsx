"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useRouter } from "next/navigation";

interface OrdersByStageChartProps {
  data: { name: string; value: number }[];
}

// Define colors for each stage
const COLORS: Record<string, string> = {
  Upcoming: "#3b82f6", // Blue
  "In Development": "#6366f1", // Indigo
  Running: "#f59e0b", // Amber
  Bulk: "#a855f7", // Purple
  Completed: "#10b981", // Green
  Archived: "#6b7280", // Gray
};

// Custom tooltip component with Shadcn/Tailwind styling
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-600">
          Orders: <span className="font-semibold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function OrdersByStageChart({ data }: OrdersByStageChartProps) {
  const router = useRouter();

  const handlePieClick = (entry: any) => {
    if (!entry || !entry.name) return;
    
    // Map the stage name to status for filtering
    const statusMap: Record<string, string> = {
      'Upcoming': 'upcoming',
      'In Development': 'in_development',
      'Running': 'running',
      'Bulk': 'bulk',
      'Completed': 'completed',
      'Archived': 'archived',
    };
    
    const status = statusMap[entry.name];
    if (status) {
      // Navigate to orders page with status filter and order_type=all to show both local and foreign orders
      router.push(`/orders?status=${status}&order_type=all`);
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="text-xs text-gray-500 mb-2 text-center">Click on a segment to view orders</p>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent, cx, x }) => {
              // Abbreviate "In Development" to "In Dev" for mobile
              const displayName = name === 'In Development' ? 'In Dev' : name;
              return `${displayName} ${(percent * 100).toFixed(0)}%`;
            }}
            outerRadius={70}
            fill="#8884d8"
            dataKey="value"
            onClick={handlePieClick}
            cursor="pointer"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || "#8884d8"} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
