'use client';

import { useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function IncidentsPage() {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Incidents</h1>
            <p className="text-gray-500 mt-2">Track and resolve production issues</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Report Incident
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-500">No incidents reported</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
