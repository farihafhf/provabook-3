"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { FileText, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface PendingLC {
  id: number;
  lc_number: string;
  customer: string;
  amount: number;
  currency: string;
  issue_date: string | null;
  expiry_date: string | null;
  order_number: string;
}

interface FinancialData {
  potential: number;
  secured: number;
  pending_lcs: PendingLC[];
  metrics: {
    potential_orders_value: number;
    secured_orders_value: number;
    confirmed_lcs_value: number;
  };
}

export function PendingLCs() {
  const [pendingLCs, setPendingLCs] = useState<PendingLC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingLCs();
  }, []);

  const fetchPendingLCs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/financials/analytics/pipeline/', {
        params: { _t: Date.now() }
      });
      const data: FinancialData = response.data;
      setPendingLCs(data.pending_lcs || []);
    } catch (err: any) {
      console.error('Failed to fetch pending LCs:', err);
      setError('Unable to load pending LCs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending Letters of Credit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-gray-500 text-sm">Loading pending LCs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending Letters of Credit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pending Letters of Credit
          </span>
          <Badge variant="outline" className="text-sm">
            {pendingLCs.length} Pending
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingLCs.length === 0 ? (
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-gray-500 text-sm">No pending letters of credit</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {pendingLCs.map((lc) => (
              <div 
                key={lc.id} 
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{lc.lc_number}</p>
                    <p className="text-sm text-gray-600">{lc.customer}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {lc.order_number}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="text-sm font-medium text-gray-900">
                        {lc.amount.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })} {lc.currency}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Expiry Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(lc.expiry_date)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
