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
  Factory,
  AlertTriangle,
  Truck,
  Bell,
  LogOut,
  LogIn,
  Menu,
  User,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
    { name: 'Foreign Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Local Orders', href: '/production', icon: Factory },
    { name: 'Samples', href: '/samples', icon: Beaker },
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
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* User Menu / Auth Buttons */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-white text-sm">
                          {user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left hidden sm:block">
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{user.email}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="flex items-center gap-2 text-red-600 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/login">
                  <Button variant="default" size="sm" className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </Button>
                </Link>
              )}
            </div>
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
