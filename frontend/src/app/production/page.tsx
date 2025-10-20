'use client';

import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function ProductionPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Production</h1>
          <p className="text-gray-500 mt-2">Track production metrics and daily output</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Production Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500">No production data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
