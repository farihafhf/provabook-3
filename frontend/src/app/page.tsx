'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Beaker, 
  DollarSign,
  Factory,
  AlertTriangle,
  Truck,
  Bell,
  Package,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      setShowLanding(true);
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const menuItems = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      description: 'Overview and analytics',
      gradient: 'from-indigo-500 to-blue-500'
    },
    { 
      name: 'Orders', 
      href: '/orders', 
      icon: ShoppingCart,
      description: 'Manage all orders',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      name: 'Samples', 
      href: '/samples', 
      icon: Beaker,
      description: 'Track sample status',
      gradient: 'from-cyan-500 to-teal-500'
    },
    { 
      name: 'Financials', 
      href: '/financials', 
      icon: DollarSign,
      description: 'Financial tracking',
      gradient: 'from-emerald-500 to-green-500'
    },
    { 
      name: 'Local Orders', 
      href: '/production', 
      icon: Factory,
      description: 'Local Orders metrics',
      gradient: 'from-orange-500 to-amber-500'
    },
    { 
      name: 'Incidents', 
      href: '/incidents', 
      icon: AlertTriangle,
      description: 'Incident management',
      gradient: 'from-red-500 to-rose-500'
    },
    { 
      name: 'Shipments', 
      href: '/shipments', 
      icon: Truck,
      description: 'Shipment tracking',
      gradient: 'from-blue-500 to-indigo-500'
    },
    { 
      name: 'Notifications', 
      href: '/notifications', 
      icon: Bell,
      description: 'View notifications',
      gradient: 'from-violet-500 to-purple-500'
    },
  ];

  if (!showLanding) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 p-2 shadow-lg">
                <Package className="h-7 w-7 text-white" />
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                ProvaBook
              </span>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16 space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              Welcome to ProvaBook!
            </h1>
            <Sparkles className="h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your all-in-one platform for managing foreign orders, local orders, and operations
          </p>
        </div>

        {/* Menu Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {menuItems.map((item) => (
            <Card
              key={item.name}
              className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-indigo-200 hover:scale-105 overflow-hidden"
              onClick={() => router.push(item.href)}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Icon with gradient background */}
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} p-3 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Card Content */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>

                  {/* Arrow indicator on hover */}
                  <div className="flex items-center text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-sm font-medium">Open</span>
                    <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Access Button */}
        <div className="mt-16 text-center">
          <Button
            size="lg"
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-6 text-lg"
          >
            <LayoutDashboard className="mr-2 h-5 w-5" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
