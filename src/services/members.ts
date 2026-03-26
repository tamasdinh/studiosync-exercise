import { store } from './dataStore';
import { Member } from '@/types';

const delay = () => new Promise(r => setTimeout(r, 100));
const generateId = () => `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export async function getMembers(): Promise<Member[]> {
  await delay();
  return store.members;
}

export async function getMemberById(id: string): Promise<Member | null> {
  await delay();
  return store.members.find(m => m.id === id) ?? null;
}

export async function addMember(data: Omit<Member, 'id'>): Promise<Member> {
  await delay();
  const member: Member = { id: generateId(), ...data };
  store.members.push(member);
  return member;
}

export async function updateMember(id: string, data: Partial<Member>): Promise<Member | null> {
  await delay();
  const index = store.members.findIndex(m => m.id === id);
  if (index === -1) return null;
  store.members[index] = { ...store.members[index], ...data, id };
  return store.members[index];
}

export async function removeMember(id: string): Promise<boolean> {
  await delay();
  const index = store.members.findIndex(m => m.id === id);
  if (index === -1) return false;
  store.members.splice(index, 1);
  store.bookings = store.bookings.filter(b => b.memberId !== id);
  return true;
}
