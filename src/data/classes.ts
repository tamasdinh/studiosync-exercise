import { Class, ClassType, Room } from '@/types';
import { instructors } from './instructors';

/**
 * Get the Monday of the current week (ISO week, Monday-based).
 */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // day 0 = Sunday, 1 = Monday, ...
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Format a Date as an ISO date string (YYYY-MM-DD) in local time.
 */
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format an hour (0-23) as HH:00.
 */
function formatTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * Pick a random instructor that teaches the given class type.
 */
function pickInstructor(classType: ClassType): string {
  const eligible = instructors.filter((i) => i.classTypes.includes(classType));
  return eligible[Math.floor(Math.random() * eligible.length)].id;
}

// Seeded-ish deterministic generator so the data is stable within a single page load
// but recalculates on next load (dates stay fresh).
function generateClasses(): Class[] {
  const monday = getMonday(new Date());

  // Pre-defined class templates
  const templates: { title: string; classType: ClassType; description: string }[] = [
    { title: 'Morning Flow', classType: 'yoga', description: 'Wake up your body with gentle stretches building to energizing standing poses.' },
    { title: 'Power Barre', classType: 'barre', description: 'A high-energy barre class focused on sculpting and toning every muscle group.' },
    { title: 'Sweat & Spin', classType: 'spinning', description: 'An intense ride through hills, sprints, and intervals set to driving beats.' },
    { title: 'Deep Stretch', classType: 'yoga', description: 'Slow, restorative stretching to release tension and improve flexibility.' },
    { title: 'Core Crush Pilates', classType: 'pilates', description: 'Target your core with precise, controlled movements that build real strength.' },
    { title: 'Sunrise Yoga', classType: 'yoga', description: 'Greet the day with sun salutations and breathwork in a warm, welcoming space.' },
    { title: 'Barre Burn', classType: 'barre', description: 'Small isometric movements, big results. Expect shaking legs and a great playlist.' },
    { title: 'Hot Power Yoga', classType: 'hot-yoga', description: 'A challenging flow in a heated room to deepen flexibility and build endurance.' },
    { title: 'Spin & Sweat', classType: 'spinning', description: 'A rhythm-based ride that mixes sprints and climbs. Bring a towel.' },
    { title: 'Gentle Flow', classType: 'yoga', description: 'Perfect for beginners or anyone craving a mindful, low-impact practice.' },
    { title: 'Pilates Sculpt', classType: 'pilates', description: 'Full-body toning using pilates principles. Light weights optional.' },
    { title: 'Sunset Barre', classType: 'barre', description: 'Wind down your day with a barre session that balances strength and stretch.' },
  ];

  const rooms: Room[] = ['Room 1', 'Room 2'];
  const hours = [7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21];
  const capacities = [8, 10, 12, 14, 15, 16, 18, 20];

  // Track occupied slots: key = "dayOfWeek|hour|room" for recurring, "date|hour|room" for one-time
  const occupiedByDay = new Set<string>();
  const occupiedByDate = new Set<string>();

  const classes: Class[] = [];
  let classId = 1;

  // First pass: generate recurring classes for current week only (they recur every week)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayOffset);
    const dayOfWeek = date.getDay();
    const dateStr = formatDate(date);

    // ~35% chance of a recurring class on each day (skip Sunday)
    if (dayOfWeek === 0) continue;
    if (Math.random() > 0.5) continue;

    let attempts = 0;
    let hour: number;
    let room: Room;

    do {
      hour = hours[Math.floor(Math.random() * hours.length)];
      room = rooms[Math.floor(Math.random() * rooms.length)];
      attempts++;
    } while (occupiedByDay.has(`${dayOfWeek}|${hour}|${room}`) && attempts < 50);

    if (attempts >= 50) continue;

    occupiedByDay.add(`${dayOfWeek}|${hour}|${room}`);
    occupiedByDate.add(`${dateStr}|${hour}|${room}`);

    const template = templates[Math.floor(Math.random() * templates.length)];
    const capacity = capacities[Math.floor(Math.random() * capacities.length)];

    classes.push({
      id: `class-${classId}`,
      title: template.title,
      classType: template.classType,
      instructorId: pickInstructor(template.classType),
      room,
      date: dateStr,
      time: formatTime(hour),
      duration: 50,
      maxCapacity: capacity,
      description: template.description,
      isRecurring: true,
      excludedDates: [],
    });

    classId++;
  }

  // Second pass: generate one-time classes across 3 weeks
  for (let dayOffset = 0; dayOffset < 21; dayOffset++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayOffset);
    const dayOfWeek = date.getDay();
    const dateStr = formatDate(date);

    // Sunday: 0-1 classes, Saturday: 1, Weekday: 1-2
    let classesThisDay: number;
    if (dayOfWeek === 0) {
      classesThisDay = Math.random() < 0.5 ? 0 : 1;
    } else if (dayOfWeek === 6) {
      classesThisDay = 1;
    } else {
      classesThisDay = Math.random() < 0.4 ? 1 : 2;
    }

    for (let c = 0; c < classesThisDay; c++) {
      let attempts = 0;
      let hour: number;
      let room: Room;

      do {
        hour = hours[Math.floor(Math.random() * hours.length)];
        room = rooms[Math.floor(Math.random() * rooms.length)];
        attempts++;
      } while (
        (occupiedByDate.has(`${dateStr}|${hour}|${room}`) ||
          occupiedByDay.has(`${dayOfWeek}|${hour}|${room}`)) &&
        attempts < 50
      );

      if (attempts >= 50) continue;

      occupiedByDate.add(`${dateStr}|${hour}|${room}`);

      const template = templates[Math.floor(Math.random() * templates.length)];
      const capacity = capacities[Math.floor(Math.random() * capacities.length)];

      classes.push({
        id: `class-${classId}`,
        title: template.title,
        classType: template.classType,
        instructorId: pickInstructor(template.classType),
        room,
        date: dateStr,
        time: formatTime(hour),
        duration: 50,
        maxCapacity: capacity,
        description: template.description,
        isRecurring: false,
        excludedDates: [],
      });

      classId++;
    }
  }

  // Sort by date then time
  classes.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  return classes;
}

export const classes: Class[] = generateClasses();
