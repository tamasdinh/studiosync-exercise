'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RootPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const routes = { owner: '/admin/calendar', instructor: '/admin/classes', member: '/home' };
      router.replace(routes[user.role]);
    } else {
      router.replace('/login');
    }
  }, [user, router]);

  return null;
}
