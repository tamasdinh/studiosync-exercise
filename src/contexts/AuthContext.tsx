'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AuthUser, UserRole } from '@/types';
import { instructors } from '@/data/instructors';
import { members } from '@/data/members';

type AuthContextType = {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  login: (role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback((role: UserRole) => {
    if (role === 'owner') {
      setUser({
        id: 'owner-1',
        name: 'Andrew Haller',
        email: 'andrew@studiosync.com',
        phone: '(555) 100-0001',
        photo: '/images/andrew.png',
        role: 'owner',
      });
    } else if (role === 'instructor') {
      const inst = instructors[0];
      setUser({
        id: inst.id,
        name: inst.name,
        email: inst.email,
        phone: inst.phone,
        photo: inst.photo,
        role: 'instructor',
      });
    } else {
      const mem = members[0];
      setUser({
        id: mem.id,
        name: mem.name,
        email: mem.email,
        phone: mem.phone,
        photo: mem.photo,
        role: 'member',
      });
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    login(role);
  }, [login]);

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
