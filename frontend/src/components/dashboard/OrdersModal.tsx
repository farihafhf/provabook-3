"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingBag, User } from "lucide-react";

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

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchandiserName: string;
  orders: Order[];
  loading: boolean;
}

export function OrdersModal({ 
  isOpen, 
  onClose, 
  merchandiserName, 
  orders, 
  loading 
}: OrdersModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="h-6 w-6 text-indigo-600" />
            Orders Handled by {merchandiserName}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Currently running orders
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Package className="h-16 w-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No running orders found</p>
            <p className="text-sm mt-1">This merchandiser has no orders in progress</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto pr-4">
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {order.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <ShoppingBag className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Style</p>
                        <p className="font-medium text-gray-900">{order.style}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-500 text-xs">Buyer</p>
                        <p className="font-medium text-gray-900">{order.buyer}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs">Customer</p>
                      <p className="font-medium text-gray-900">{order.customer}</p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs">Quantity</p>
                      <p className="font-medium text-gray-900">
                        {order.quantity.toLocaleString()} {order.unit}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-gray-500 text-xs">Current Stage</p>
                      <Badge variant="secondary" className="mt-1">
                        {order.current_stage}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-gray-500">
            Total: <span className="font-semibold text-gray-900">{orders.length}</span> orders
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
