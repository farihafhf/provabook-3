'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface ApprovalQueueOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  stage?: string | null;
}

export interface ApprovalQueueProps {
  orders?: ApprovalQueueOrder[];
}

export function ApprovalQueue({ orders }: ApprovalQueueProps) {
  const data = (orders ?? []).slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No orders waiting for approval.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex text-xs text-gray-500 px-2">
              <div className="w-3/5">Order</div>
              <div className="w-2/5 text-right">Stage</div>
            </div>
            {data.map((order) => {
              const stageLabel = order.stage && order.stage.trim().length > 0 ? order.stage : 'Pending';

              return (
                <Link key={order.id} href={`/orders/${order.id}`} className="block">
                  <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 cursor-pointer transition-colors">
                    <div className="w-3/5 pr-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{order.orderNumber}</p>
                      <p className="text-xs text-gray-600 truncate">{order.customerName}</p>
                    </div>
                    <div className="w-2/5 flex justify-end">
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {stageLabel}
                      </Badge>
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
