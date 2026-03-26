'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from './Header';
import ToastContainer from '@/components/ui/Toast';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user && pathname !== '/login') {
      router.replace('/login');
    }
    if (user && pathname === '/login') {
      const defaultRoutes = { owner: '/admin/calendar', instructor: '/admin/classes', member: '/home' };
      router.replace(defaultRoutes[user.role]);
    }
  }, [user, pathname, router, mounted]);

  // Return consistent empty shell during SSR and initial hydration
  if (!mounted) return null;

  if (!user && pathname !== '/login') return null;
  if (pathname === '/login') return <>{children}</>;

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="pb-4">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
