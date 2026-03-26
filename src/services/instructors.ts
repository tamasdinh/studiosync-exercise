import { store } from './dataStore';
import { Instructor } from '@/types';

const delay = () => new Promise(r => setTimeout(r, 100));
const generateId = () => `inst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export async function getInstructors(): Promise<Instructor[]> {
  await delay();
  return store.instructors;
}

export async function getInstructorById(id: string): Promise<Instructor | null> {
  await delay();
  return store.instructors.find(i => i.id === id) ?? null;
}

export async function addInstructor(data: Omit<Instructor, 'id'>): Promise<Instructor> {
  await delay();
  const instructor: Instructor = { id: generateId(), ...data };
  store.instructors.push(instructor);
  return instructor;
}

export async function updateInstructor(id: string, data: Partial<Instructor>): Promise<Instructor | null> {
  await delay();
  const index = store.instructors.findIndex(i => i.id === id);
  if (index === -1) return null;
  store.instructors[index] = { ...store.instructors[index], ...data, id };
  return store.instructors[index];
}

export async function removeInstructor(id: string): Promise<boolean> {
  await delay();
  const index = store.instructors.findIndex(i => i.id === id);
  if (index === -1) return false;
  store.instructors.splice(index, 1);
  return true;
}
