'use client';

import { formatDate, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Order {
  id: string;
  poNumber: string;
  customerName: string;
  buyerName?: string;
  styleNumber?: string;
  fabricType: string;
  fabricSpecifications?: string;
  fabricComposition?: string;
  gsm?: number;
  finishType?: string;
  construction?: string;
  millName?: string;
  millPrice?: number;
  provaPrice?: number;
  currency?: string;
  quantity: number;
  unit: string;
  colorQuantityBreakdown?: Array<{ color: string; quantity: number }>;
  etd?: string;
  eta?: string;
  status: string;
  category: string;
  currentStage: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  notes?: string;
  merchandiser?: {
    fullName: string;
    email: string;
  };
}

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  category: string;
  subcategory?: string;
  uploadedByName: string;
  createdAt: string;
}

interface PrintableOrderProps {
  order: Order;
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  sample_requested: 'Sample Requested',
  sample_sent: 'Sample Sent',
  approval_pending: 'Approval Pending',
  approved: 'Approved',
  pi_issued: 'PI Issued',
  lc_received: 'LC Received',
  in_production: 'In Production',
  quality_check: 'Quality Check',
  ready_to_ship: 'Ready to Ship',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

const CATEGORY_LABELS: Record<string, string> = {
  running: 'Running Order',
  development: 'Development',
  sample: 'Sample Order',
};

const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  sample: 'Sample Photo',
  lc: 'LC Document',
  pi: 'PI Document',
  test_report: 'Test Report',
  email: 'Email',
  other: 'Other',
};

export function PrintableOrder({ order }: PrintableOrderProps) {
  return (
    <div className="printable-order hidden print:block bg-white">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-order, .printable-order * {
              visibility: visible;
            }
            .printable-order {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20mm;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          }
        `}
      </style>

      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Prova Fashion</h1>
        <p className="text-sm text-gray-600 mt-1">Textile Operations Management</p>
      </div>

      {/* Order Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Details</h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="font-semibold">{order.poNumber}</span>
          <span>•</span>
          <span>Generated: {formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Order Status & Category */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</p>
          <p className="text-base font-semibold">{STATUS_LABELS[order.status]}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Category</p>
          <p className="text-base font-semibold">{CATEGORY_LABELS[order.category]}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Current Stage</p>
          <p className="text-base font-semibold">{order.currentStage}</p>
        </div>
      </div>

      {/* Customer & Buyer Information */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
          Customer & Buyer Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Vendor Name</p>
            <p className="text-base">{order.customerName}</p>
          </div>
          {order.buyerName && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Buyer Name</p>
              <p className="text-base">{order.buyerName}</p>
            </div>
          )}
          {order.merchandiser && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Merchandiser</p>
              <p className="text-base">{order.merchandiser.fullName}</p>
              <p className="text-sm text-gray-600">{order.merchandiser.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Fabric Details */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
          Fabric Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {order.styleNumber && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Style Number</p>
              <p className="text-base">{order.styleNumber}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Fabric Type</p>
            <p className="text-base">{order.fabricType}</p>
          </div>
          {order.fabricSpecifications && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Fabric Specifications</p>
              <p className="text-base">{order.fabricSpecifications}</p>
            </div>
          )}
          {order.fabricComposition && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Fabric Composition</p>
              <p className="text-base">{order.fabricComposition}</p>
            </div>
          )}
          {order.gsm && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">GSM</p>
              <p className="text-base">{order.gsm}</p>
            </div>
          )}
          {order.finishType && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Finish Type</p>
              <p className="text-base">{order.finishType}</p>
            </div>
          )}
          {order.construction && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Construction</p>
              <p className="text-base">{order.construction}</p>
            </div>
          )}
          {order.millName && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Mill Name</p>
              <p className="text-base">{order.millName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Quantity & Pricing */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
          Quantity & Pricing
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Order Quantity</p>
            <p className="text-base font-semibold">
              {order.quantity.toLocaleString()} {order.unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Currency</p>
            <p className="text-base">{order.currency || 'USD'}</p>
          </div>
          {order.millPrice && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Mill Price</p>
              <p className="text-base">{formatCurrency(order.millPrice, order.currency || 'USD')}</p>
            </div>
          )}
          {order.provaPrice && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Prova Price</p>
              <p className="text-base">{formatCurrency(order.provaPrice, order.currency || 'USD')}</p>
            </div>
          )}
          {order.provaPrice && (
            <div className="col-span-2 p-4 bg-gray-100 border border-gray-300 rounded">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(order.provaPrice * order.quantity, order.currency || 'USD')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Color Breakdown */}
      {order.colorQuantityBreakdown && order.colorQuantityBreakdown.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Color Breakdown
          </h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Color</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-xs font-semibold">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {order.colorQuantityBreakdown.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{item.color}</td>
                  <td className="border border-gray-300 px-3 py-2 text-sm">{item.quantity.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
          Timeline
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {order.orderDate && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Order Date</p>
              <p className="text-base">{formatDate(order.orderDate)}</p>
            </div>
          )}
          {order.etd && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">ETD</p>
              <p className="text-base">{formatDate(order.etd)}</p>
            </div>
          )}
          {order.eta && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">ETA</p>
              <p className="text-base">{formatDate(order.eta)}</p>
            </div>
          )}
          {order.expectedDeliveryDate && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Expected Delivery</p>
              <p className="text-base">{formatDate(order.expectedDeliveryDate)}</p>
            </div>
          )}
          {order.actualDeliveryDate && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Actual Delivery</p>
              <p className="text-base">{formatDate(order.actualDeliveryDate)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-300 pb-2">
            Notes
          </h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
        <p>This document was generated by Prova Fashion - Textile Operations Management Platform</p>
        <p className="mt-1">
          PO Number: {order.poNumber} | Generated on: {formatDate(new Date().toISOString())}
        </p>
      </div>

      <style jsx>{`
        @media print {
          .page-break-before {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
}
