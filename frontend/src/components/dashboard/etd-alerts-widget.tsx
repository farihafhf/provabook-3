'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface EtdAlert {
  id: string;
  orderNumber: string;
  customerName: string;
  etd: string | null;
  daysUntilEtd: number;
  severity: 'warning' | 'critical';
  alertType: 'approaching' | 'urgent' | 'overdue';
  currentStage: string;
}

interface EtdAlertsWidgetProps {
  alerts: EtdAlert[];
}

export function EtdAlertsWidget({ alerts }: EtdAlertsWidgetProps) {
  const router = useRouter();

  const getSeverityBadge = (severity: 'warning' | 'critical', alertType: string) => {
    if (severity === 'critical') {
      return (
        <Badge className="bg-red-600 hover:bg-red-700">
          {alertType === 'overdue' ? 'Overdue' : 'Urgent'}
        </Badge>
      );
    }
    return <Badge className="bg-yellow-600 hover:bg-yellow-700">Approaching</Badge>;
  };

  const getSeverityColor = (severity: 'warning' | 'critical') => {
    return severity === 'critical' ? 'text-red-600' : 'text-yellow-600';
  };

  const getSeverityBg = (severity: 'warning' | 'critical') => {
    return severity === 'critical'
      ? 'bg-red-50 hover:bg-red-100 border-red-200'
      : 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
  };

  const formatDaysMessage = (days: number) => {
    if (days < 0) {
      return `${Math.abs(days)} day(s) overdue`;
    } else if (days === 0) {
      return 'ETD is today';
    } else if (days === 1) {
      return '1 day until ETD';
    } else {
      return `${days} days until ETD`;
    }
  };

  const handleAlertClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            ETD Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No upcoming ETD alerts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          ETD Alerts
          <Badge variant="outline" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => handleAlertClick(alert.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${getSeverityBg(alert.severity)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className={`h-4 w-4 ${getSeverityColor(alert.severity)}`} />
                    <span className="font-semibold text-sm">{alert.orderNumber}</span>
                    {getSeverityBadge(alert.severity, alert.alertType)}
                  </div>
                  <p className="text-sm text-gray-700 truncate">{alert.customerName}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span className={`font-medium ${getSeverityColor(alert.severity)}`}>
                      {formatDaysMessage(alert.daysUntilEtd)}
                    </span>
                    {alert.etd && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(alert.etd).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
