"use client";

import { useState } from "react";
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
import { OrdersModal } from "../OrdersModal";
import { api } from "@/lib/api";

interface MerchandiserWorkloadChartProps {
  data: { name: string; value: number }[];
}

interface Order {
  id: string;
  order_number: string;
  style: string;
  buyer: string;
  customer: string;
  quantity: number;
  unit: string;
  status: string;
  current_stage: string;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMerchandiser, setSelectedMerchandiser] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const handleBarClick = async (data: any) => {
    if (!data || !data.name) return;
    
    setSelectedMerchandiser(data.name);
    setModalOpen(true);
    setLoading(true);
    
    try {
      const response = await api.get('/dashboard/orders-by-merchandiser', {
        params: { 
          merchandiser_name: data.name,
          _t: Date.now() 
        }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Failed to fetch merchandiser orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
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
    <>
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

      <OrdersModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        merchandiserName={selectedMerchandiser}
        orders={orders}
        loading={loading}
      />
    </>
  );
}
