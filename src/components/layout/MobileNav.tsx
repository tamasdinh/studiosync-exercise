'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  UsersIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

const roleNavItems = {
  owner: [
    { label: 'Instructors', href: '/admin/instructors', icon: UserGroupIcon },
    { label: 'Members', href: '/admin/members', icon: UsersIcon },
    { label: 'Calendar', href: '/admin/calendar', icon: CalendarDaysIcon },
    { label: 'Profile', href: '/profile', icon: UserCircleIcon },
  ],
  instructor: [
    { label: 'Calendar', href: '/admin/calendar', icon: CalendarDaysIcon },
    { label: 'Profile', href: '/profile', icon: UserCircleIcon },
  ],
  member: [
    { label: 'Home', href: '/home', icon: HomeIcon },
    { label: 'Explore', href: '/classes', icon: MagnifyingGlassIcon },
    { label: 'Profile', href: '/profile', icon: UserCircleIcon },
  ],
};

export default function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = roleNavItems[user.role];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
