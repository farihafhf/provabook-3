'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { 
  Package, 
  LayoutDashboard, 
  ShoppingCart, 
  Beaker, 
  DollarSign,
  Factory,
  AlertTriangle,
  Truck,
  Bell,
  LogOut,
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      // Silently fail - user might not be authenticated yet
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Samples', href: '/samples', icon: Beaker },
    { name: 'Financials', href: '/financials', icon: DollarSign },
    { name: 'Production', href: '/production', icon: Factory },
    { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
    { name: 'Shipments', href: '/shipments', icon: Truck },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <Package className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-xl">Provabook</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors relative">
                <item.icon className="h-5 w-5" />
                {sidebarOpen && <span className="flex-1">{item.name}</span>}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`${
                    sidebarOpen 
                      ? 'bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full' 
                      : 'absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {sidebarOpen && user && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium">{user.fullName}</p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
          )}
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            {sidebarOpen && 'Logout'}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
