'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export interface AlertsWidgetOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  etd?: string | null;
}

export interface AlertsWidgetProps {
  orders?: AlertsWidgetOrder[];
}

function getEtdRiskBadge(etd?: string | null) {
  if (!etd) {
    return null;
  }

  const now = new Date();
  const etdDate = new Date(etd);
  if (Number.isNaN(etdDate.getTime())) {
    return null;
  }

  const diffMs = etdDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0 || diffDays <= 5) {
    return {
      label: diffDays < 0 ? 'Overdue' : '0-5 days',
      className: 'bg-red-100 text-red-700 border border-red-200',
    };
  }

  if (diffDays <= 10) {
    return {
      label: '6-10 days',
      className: 'bg-amber-100 text-amber-700 border border-amber-200',
    };
  }

  return null;
}

export function AlertsWidget({ orders }: AlertsWidgetProps) {
  const data = (orders ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Upcoming Deliveries (Risk)</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No upcoming deliveries at risk.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex text-xs text-gray-500 px-2">
              <div className="w-2/5">Order</div>
              <div className="w-2/5">Customer</div>
              <div className="w-1/5 text-right">ETD</div>
            </div>
            {data.map((order) => {
              const risk = getEtdRiskBadge(order.etd);

              return (
                <Link key={order.id} href={`/orders/${order.id}`} className="block">
                  <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 cursor-pointer transition-colors">
                    <div className="w-2/5">
                      <p className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</p>
                    </div>
                    <div className="w-2/5 pr-2">
                      <p className="text-sm text-gray-700 truncate">{order.customerName}</p>
                    </div>
                    <div className="w-1/5 flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-600">
                        {order.etd ? formatDate(order.etd) : '-'}
                      </span>
                      {risk && (
                        <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 ${risk.className}`}>
                          {risk.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
