export type ClassType = 'yoga' | 'hot-yoga' | 'pilates' | 'barre' | 'spinning';
export type Room = 'Room 1' | 'Room 2';
export type UserRole = 'owner' | 'instructor' | 'member';

export type Instructor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  bio: string;
  classTypes: ClassType[];
};

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  favoriteInstructors: string[];
  favoriteClassTypes: ClassType[];
};

export type Class = {
  id: string;
  title: string;
  classType: ClassType;
  instructorId: string;
  room: Room;
  date: string;
  time: string;
  duration: number;
  maxCapacity: number;
  description: string;
  isRecurring: boolean;
  excludedDates: string[];
};

export type Booking = {
  id: string;
  memberId: string;
  classId: string;
  isRecurring: boolean;
  bookedAt: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  role: UserRole;
};

export const CLASS_TYPE_COLORS: Record<ClassType, { bg: string; text: string; border: string }> = {
  yoga: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-400' },
  'hot-yoga': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
  pilates: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-400' },
  barre: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-400' },
  spinning: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-400' },
};

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  yoga: 'Yoga',
  'hot-yoga': 'Hot Yoga',
  pilates: 'Pilates',
  barre: 'Barre',
  spinning: 'Spinning',
};

export const CLASS_TYPE_CALENDAR_COLORS: Record<ClassType, { bg: string; border: string; text: string }> = {
  yoga: { bg: 'bg-emerald-200', border: 'border-emerald-500', text: 'text-emerald-900' },
  'hot-yoga': { bg: 'bg-amber-200', border: 'border-amber-500', text: 'text-amber-900' },
  pilates: { bg: 'bg-violet-200', border: 'border-violet-500', text: 'text-violet-900' },
  barre: { bg: 'bg-rose-200', border: 'border-rose-500', text: 'text-rose-900' },
  spinning: { bg: 'bg-cyan-200', border: 'border-cyan-500', text: 'text-cyan-900' },
};
