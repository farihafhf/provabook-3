"use client";

import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface MerchandiserWorkloadChartProps {
  data: { name: string; value: number }[];
}

// Custom tooltip component with Shadcn/Tailwind styling
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm text-gray-900">{payload[0].payload.name}</p>
        <p className="text-sm text-gray-600">
          Orders: <span className="font-semibold">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function MerchandiserWorkloadChart({ data }: MerchandiserWorkloadChartProps) {
  const router = useRouter();

  const handleBarClick = (barData: any) => {
    if (!barData || !barData.name) return;

    // Search by merchandiser name, showing ALL orders (both local and foreign, all statuses)
    const params = new URLSearchParams();
    params.set("search", barData.name);
    params.set("order_type", "all"); // Show both local and foreign orders

    router.push(`/orders?${params.toString()}`);
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
      <p className="text-xs text-gray-500 mb-2 text-center">Click on a bar to view orders</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="value" 
            fill="#8884d8" 
            name="Orders" 
            radius={[8, 8, 0, 0]}
            onClick={handleBarClick}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
