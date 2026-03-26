'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  ArrowRightStartOnRectangleIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  UsersIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
import Avatar from '@/components/ui/Avatar';
import { Fragment } from 'react';

const customerNavItems = [
  { label: 'Home', href: '/home', icon: HomeIcon },
  { label: 'Explore Classes', href: '/classes', icon: MagnifyingGlassIcon },
];

const adminNavItems = {
  owner: [
    { label: 'Calendar', href: '/admin/calendar', icon: CalendarDaysIcon },
    { label: 'Classes', href: '/admin/classes', icon: RectangleStackIcon },
    { label: 'Instructors', href: '/admin/instructors', icon: UserGroupIcon },
    { label: 'Members', href: '/admin/members', icon: UsersIcon },
  ],
  instructor: [
    { label: 'Calendar', href: '/admin/calendar', icon: CalendarDaysIcon },
    { label: 'Your Classes', href: '/admin/classes', icon: RectangleStackIcon },
  ],
};

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  const isAdmin = user.role === 'owner' || user.role === 'instructor';
  const currentNavItems = isAdmin
    ? adminNavItems[user.role as 'owner' | 'instructor']
    : customerNavItems;

  const firstName = user.name.split(' ')[0];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href={user.role === 'owner' ? '/admin/calendar' : user.role === 'instructor' ? '/admin/classes' : '/home'} className="text-xl font-bold text-primary cursor-pointer">
              StudioSync
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {currentNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-light text-primary-dark'
                        : 'text-text-secondary hover:bg-slate-50 hover:text-text'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Welcome + Portal toggle (desktop only) + Profile dropdown */}
          <div className="flex items-center gap-3">
            {/* Welcome message — desktop only */}
            <span className={`hidden ${isAdmin ? 'min-[820px]:block' : 'sm:block'} text-sm text-text-secondary`}>
              Welcome back, <span className="font-medium text-text">{firstName}</span>
            </span>

            <Menu as="div" className="relative">
              <MenuButton className="cursor-pointer flex items-center gap-2 rounded-full focus:outline-none">
                <Avatar src={user.photo} name={user.name} size={34} />
              </MenuButton>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black/5 focus:outline-none py-1">
                  <MenuItem>
                    <Link
                      href="/profile"
                      className="cursor-pointer flex items-center gap-2 px-4 py-2 text-sm text-text data-[focus]:bg-slate-50"
                    >
                      <UserCircleIcon className="w-4 h-4" />
                      Profile
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={handleLogout}
                      className="cursor-pointer flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 data-[focus]:bg-red-50"
                    >
                      <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                      Sign Out
                    </button>
                  </MenuItem>
                </MenuItems>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>

      {/* Mobile nav row — shows current context nav items only */}
      <div className="sm:hidden border-t border-border">
        <div className="flex justify-around">
          {currentNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`cursor-pointer flex flex-col items-center gap-0.5 py-2 px-3 text-xs font-medium ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
