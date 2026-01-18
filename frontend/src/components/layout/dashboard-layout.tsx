'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  X,
  ChevronRight,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { api } from '@/lib/api';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  // Helper function to check if a nav item is active
  const isNavItemActive = (item: typeof navigation[0]) => {
    // Check if we're on an order detail page from production by checking URL
    if (pathname?.startsWith('/orders/')) {
      const isLocalOrderDetail = searchParams?.get('from') === 'production';
      
      // Special case: Local order detail pages should highlight Local Orders
      if (isLocalOrderDetail && item.href === '/production') {
        return true;
      }
      // Special case: Prevent Foreign Orders from being highlighted on local order details
      if (isLocalOrderDetail && item.href === '/orders') {
        return false;
      }
    }
    // Default: match by pathname prefix
    return pathname?.startsWith(item.href);
  };

  // Get current page name for mobile header
  const currentPage = navigation.find(item => isNavItemActive(item))?.name || 'Provabook';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-amber-50 via-orange-50 to-white shadow-xl transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-amber-100/80">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary p-1.5 shadow-sm">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">Provabook</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = isNavItemActive(item);
              return (
                <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 shadow-sm' : 'text-gray-700 hover:bg-amber-50/70'}`}>
                    <item.icon className="h-5 w-5" />
                    <span className="flex-1 font-medium">{item.name}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Mobile User Section */}
          <div className="p-4 border-t border-amber-100 bg-gradient-to-b from-amber-50 to-orange-50">
            {user && (
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profilePictureUrl || undefined} alt={user.fullName} />
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm">
                    {user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <User className="h-4 w-4 mr-2" />
                  My Profile
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Tab - Only visible when menu is closed */}
      {!mobileMenuOpen && (
        <button
          className="md:hidden fixed top-3 left-3 z-30 flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-full shadow-lg active:scale-95 transition-transform"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-4 w-4" />
          <span className="text-xs font-medium">{currentPage}</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className={`hidden md:flex bg-gradient-to-b from-amber-50 via-orange-50/40 to-white border-r border-amber-100/80 flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-4 border-b border-amber-100/80">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2 shadow-sm">
              <Package className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-xl">Provabook</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = isNavItemActive(item);
            return (
              <Link key={item.name} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative ${isActive ? 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 shadow-sm' : 'text-gray-700 hover:bg-amber-50/70'}`}>
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
            );
          })}
        </nav>

        <div className="p-4 border-t border-amber-100/80 bg-gradient-to-b from-transparent to-amber-50/40">
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
        {/* Desktop Header - Hidden on mobile */}
        <header className="hidden md:block bg-gradient-to-r from-amber-50 via-orange-50/40 to-amber-50/60 border-b border-amber-100/80 px-6 py-4">
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
                        <AvatarImage src={user.profilePictureUrl || undefined} alt={user.fullName} />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-sm">
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
                    <DropdownMenuItem className="flex items-center gap-2 text-gray-500">
                      <span className="text-xs">{user.email}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => router.push('/profile')}
                    >
                      <User className="h-4 w-4" />
                      <span>My Profile</span>
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

        {/* Main content area - Reduced padding on mobile */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6 pt-14 md:pt-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
