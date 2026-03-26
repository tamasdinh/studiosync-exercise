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
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';

const roleNavItems = {
  owner: [
    { label: 'Manage Instructors', href: '/admin/instructors', icon: UserGroupIcon },
    { label: 'Manage Members', href: '/admin/members', icon: UsersIcon },
    { label: 'Studio Calendar', href: '/admin/calendar', icon: CalendarDaysIcon },
    { label: 'Profile', href: '/profile', icon: UserCircleIcon },
  ],
  instructor: [
    { label: 'Studio Calendar', href: '/admin/calendar', icon: CalendarDaysIcon },
    { label: 'Profile', href: '/profile', icon: UserCircleIcon },
  ],
  member: [
    { label: 'Home', href: '/home', icon: HomeIcon },
    { label: 'Explore Classes', href: '/classes', icon: MagnifyingGlassIcon },
    { label: 'Profile', href: '/profile', icon: UserCircleIcon },
  ],
};

const roleBadgeColors = {
  owner: 'bg-blue-100 text-blue-700',
  instructor: 'bg-emerald-100 text-emerald-700',
  member: 'bg-violet-100 text-violet-700',
};

export default function Sidebar() {
  const { user, switchRole } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = roleNavItems[user.role];

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-border h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-bold text-primary">StudioSync</h1>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Image
            src={user.photo}
            alt={user.name}
            width={40}
            height={40}
            className="rounded-full"
            unoptimized
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleBadgeColors[user.role]}`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-light text-primary-dark'
                  : 'text-text-secondary hover:bg-slate-50 hover:text-text'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Switch Role */}
      <div className="px-3 py-4 border-t border-border">
        <p className="px-3 mb-2 text-xs font-medium text-text-secondary uppercase tracking-wider">Switch Role</p>
        <div className="flex gap-1">
          {(['owner', 'instructor', 'member'] as const).map((role) => (
            <button
              key={role}
              onClick={() => switchRole(role)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium capitalize transition-colors ${
                user.role === role
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
