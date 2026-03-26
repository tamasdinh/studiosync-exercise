import { instructors as initialInstructors } from '@/data/instructors';
import { members as initialMembers } from '@/data/members';
import { classes as initialClasses } from '@/data/classes';
import { bookings as initialBookings } from '@/data/bookings';
import { Instructor, Member, Class, Booking } from '@/types';

class DataStore {
  instructors: Instructor[];
  members: Member[];
  classes: Class[];
  bookings: Booking[];

  constructor() {
    this.instructors = [...initialInstructors];
    this.members = [...initialMembers];
    this.classes = [...initialClasses];
    this.bookings = [...initialBookings];
  }
}

export const store = new DataStore();
