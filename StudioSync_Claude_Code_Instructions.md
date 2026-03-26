# StudioSync — Claude Code Instructions

## Project Overview

Build a clickable prototype for **StudioSync**, a boutique fitness studio management app. This is a demo prototype for a client presentation — it needs to look and feel like a real app but runs entirely on mock data. No real backend, no real auth, no persistence. All data lives in JSON files and is accessed through service functions that mimic API calls.

The client (Andrew) owns a boutique fitness studio with two rooms and multiple independent instructors teaching yoga, pilates, barre, and similar classes. The app replaces his current workflow of shared Google Calendar, manual texts, and spreadsheets.

## Tech Stack

- **Framework:** Next.js (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** @headlessui/react for interactive components (modals, dropdowns, transitions, menus, comboboxes)
- **Icons:** @heroicons/react (24/outline and 24/solid variants)
- **Deployment:** Vercel (deploy from CLI)
- **No external dependencies** beyond the above — no additional UI libraries, no chart libraries, no date-picker libraries. Build custom components using Tailwind + Headless UI.

## Design Direction

### Brand & Tone
- **Brand color:** Medium blue — use Airdev's blue (`#2563EB` / Tailwind `blue-600`) as the primary color. Build a palette around it: lighter tints for backgrounds and hover states, darker shades for text and active states.
- **Vibe:** Premium boutique fitness — clean, energetic but calm. Think ClassPass or the Les Mills app. Not a gym chain, not clinical. Friendly and modern.
- **Design philosophy:** Clean card-based layouts, generous whitespace, rounded corners (not too round — `rounded-lg` not `rounded-full` for cards), subtle shadows, clear hierarchy.

### Typography
- **Font:** Use `Outfit` from Google Fonts — it's geometric, modern, slightly rounded, and reads well at all sizes. It conveys the right mix of dynamism and approachability for a fitness app.
- **Fallback:** `sans-serif`
- **Hierarchy:** Use font weight and size to create clear hierarchy. Headings in semibold/bold, body in regular. Don't rely on color alone for hierarchy.

### Color Tokens (define as CSS variables and Tailwind theme extension)
```
--color-primary: #2563EB        (blue-600)
--color-primary-light: #DBEAFE  (blue-100)
--color-primary-dark: #1E40AF   (blue-800)
--color-accent: #F59E0B         (amber-500 — for badges, highlights)
--color-success: #10B981        (emerald-500)
--color-danger: #EF4444         (red-500)
--color-bg: #F8FAFC             (slate-50)
--color-card: #FFFFFF
--color-text: #0F172A           (slate-900)
--color-text-secondary: #64748B (slate-500)
--color-border: #E2E8F0         (slate-200)
```

### Class Type Colors
Each class type should have a consistent color tag/badge throughout the app:
- Yoga: emerald/green
- Hot Yoga: orange/amber
- Pilates: purple/violet
- Barre: pink/rose
- Spinning: cyan/teal

### Layout
- Max content width: `max-w-7xl` for desktop, full-width on mobile
- Sidebar navigation on desktop (left side, ~240px), bottom tab bar on mobile
- Navigation items vary by role (see Screen Plan below)
- Page transitions: subtle fade-in on route change

## Mock Data Architecture

### Data Files
Create a `/src/data/` directory with JSON files:

**`instructors.json`** — Array of 5-6 instructors
```typescript
type Instructor = {
  id: string
  name: string
  email: string
  phone: string
  photo: string        // URL to placeholder image (use picsum.photos or ui-avatars.com)
  bio: string
  classTypes: ClassType[]
}
```

**`members.json`** — Array of 10-12 members
```typescript
type Member = {
  id: string
  name: string
  email: string
  phone: string
  photo: string
  favoriteInstructors: string[]  // instructor IDs
  favoriteClassTypes: ClassType[]
}
```

**`classes.json`** — Array of 20-30 classes spread across the current week and next 2 weeks
```typescript
type ClassType = 'yoga' | 'hot-yoga' | 'pilates' | 'barre' | 'spinning'
type Room = 'Room 1' | 'Room 2'

type Class = {
  id: string
  title: string          // Catchy name like "Morning Flow", "Power Barre", "Spin & Sweat"
  classType: ClassType
  instructorId: string
  room: Room
  date: string           // ISO date string
  time: string           // "09:00", "10:00", etc. — always on the hour
  duration: number       // Always 50
  maxCapacity: number    // 8-20 range
  description: string
  isRecurring: boolean
}
```

**`bookings.json`** — Array of bookings linking members to classes
```typescript
type Booking = {
  id: string
  memberId: string
  classId: string
  isRecurring: boolean
  bookedAt: string       // ISO datetime
}
```

### Service Layer
Create `/src/services/` with functions that mimic API calls. These should be async functions that read from the JSON data (imported as modules) and return typed responses. Use a small delay (`await new Promise(r => setTimeout(r, 200))`) to simulate network latency where appropriate.

Key service functions:
- `getInstructors()`, `getInstructorById(id)`, `addInstructor(data)`, `updateInstructor(id, data)`, `removeInstructor(id)`
- `getClasses(filters?)`, `getClassById(id)`, `addClass(data)`, `updateClass(id, data)`, `cancelClass(id)`
- `getMembers()`, `getMemberById(id)`, `addMember(data)`, `updateMember(id, data)`, `removeMember(id)`
- `getBookings(filters?)`, `bookClass(memberId, classId, isRecurring)`, `cancelBooking(bookingId)`
- `getClassRoster(classId)` — returns members booked for a class
- `getAvailableSlots(date, room?)` — checks for double-booking conflicts

For the prototype, these functions can work with in-memory state (import JSON, mutate in memory). State will reset on page refresh — that's fine.

## Screen Plan & Implementation Details

### 1. Login Page (`/login`)

**Layout:** Split screen. Left half: full-bleed fitness image (use a high-quality Unsplash/Pexels image URL — yoga or studio setting) or a CSS gradient with a StudioSync logo overlay. Right half: white background with the login form centered vertically.

**Login form:**
- StudioSync logo/wordmark at top
- Email input
- Password input
- "Log In" button (primary blue)
- Below the button, a visually distinct demo section:
  - Light gray background card with a dashed border
  - Label: "DEMO" in small caps, muted text
  - Subtitle: "Quick login — not part of the app"
  - Three buttons in a row: "Member", "Instructor", "Owner"
  - Clicking one sets the user role in app state and navigates to the appropriate home screen

**Mobile:** Image collapses away, login form takes full width.

**Implementation:**
- Store current user role and user data in a React context (`AuthContext`)
- Demo buttons set a mock user from the data files and the role
- No real auth validation — any email/password combo "works" and logs in as the demo member

### 2. App Shell & Navigation

**Desktop:** Left sidebar with:
- StudioSync logo at top
- User avatar + name + role badge
- Navigation links (role-dependent, see below)
- "Switch Role" link at the bottom (for demo purposes — lets the reviewer switch between roles without going back to login)

**Mobile:** Bottom tab bar with the most important nav items (max 4-5 tabs).

**Navigation by role:**

Owner:
- Manage Instructors
- Manage Members
- Studio Calendar
- Profile

Instructor:
- Studio Calendar
- Profile

Member:
- Home
- Explore Classes
- Profile

### 3. Manage Instructors (`/admin/instructors`) — Owner only

**List view:**
- Page header: "Instructors" with an "Add Instructor" button
- Card grid (2-3 columns on desktop, 1 on mobile)
- Each card shows: photo (circular), name, class types as colored tags, email, phone
- Edit and Remove actions on each card (icon buttons)

**Add/Edit modal or slide-over panel (use Headless UI Dialog or custom slide-over):**
- Fields: name, email, phone, photo URL, bio (textarea), class types (multi-select checkboxes)
- Save / Cancel buttons

### 4. Manage Members (`/admin/members`) — Owner only

**List view:**
- Page header: "Members" with an "Add Member" button
- Table or card list showing: photo, name, email, phone, favorite class types as tags, number of bookings
- Edit and Remove actions

**Add/Edit modal:**
- Fields: name, email, phone, photo URL
- **Class assignment section:** checkboxes or multi-select showing all current classes. Selected classes auto-populate the favorites section below
- **Favorites section:** shows auto-populated favorite instructors and class types based on class assignments. These can be manually adjusted (toggle on/off)
- Save / Cancel buttons

### 5. Studio Calendar (`/calendar`) — Instructor + Owner

This is the most complex screen. Take care with it.

**Layout (desktop):**
- Top bar: Room filter (Room 1 / Room 2 / Both — use tab-style toggle), week picker (< Prev Week | "Mar 24 – Mar 30, 2026" | Next Week >), "Create Class" button
- Below: 7-column grid (Mon–Sun), with hourly rows from 7:00 AM to 10:00 PM
- Each class appears as a colored block in its room column at the correct time. Color matches the class type. Block shows: title, instructor first name, time
- If "Both" rooms are selected, each day column splits into two sub-columns (Room 1 | Room 2)

**Layout (mobile):**
- Top bar: Room filter, day picker (< Prev | "Tuesday, Mar 25" | Next >), "Create Class" button
- Below: single column with hourly rows for the selected day
- Same class blocks as desktop

**Class detail expansion:**
- Clicking a class block expands a detail panel below the calendar (pushes content down, doesn't overlay)
- Shows: title, class type tag, instructor photo + name, room, date/time, description, capacity (X/Y booked), recurring badge if applicable
- **Roster section:** list of booked members with their names. Shows "(recurring)" badge next to recurring bookings
- If the current user is the owning instructor or is the owner: show Edit and Cancel Class buttons
- Edit opens the same form as Create Class, pre-filled
- Cancel triggers a confirmation dialog, then shows a toast: "Class cancelled. SMS sent to X members."

**Create Class form (modal):**
- Fields: title, class type (dropdown), instructor (dropdown — for owner, defaults to any; for instructor, locked to themselves), room (dropdown), date (date picker), time (dropdown of hourly slots from 7:00–21:00), max capacity (number), description (textarea), recurring toggle (if on, shows "Repeats weekly" note)
- Before allowing save, validate no double-booking conflict on the selected room + date + time
- On save, show toast: "Class created successfully"

### 6. Member Home (`/home`) — Member only

**Layout:**
- Welcome message: "Hey, {firstName}!" with a brief contextual line like "You have 3 classes this week"
- User's profile photo in the top-right corner (clickable → navigates to Profile)

**My Upcoming Classes section:**
- Horizontal scrollable row or vertical list of class cards for the current week
- Each card: class title, class type tag, instructor photo + name, date/time, room
- "Booked" badge on each card
- Cancel button/link on each card
- Recurring classes show a small recurring icon

**Recommended for You section:**
- Classes from the current and next week that match the member's favorited instructors or class types, excluding already-booked classes
- Same card format as above but with a "Book" button instead of "Cancel"
- Quick-book: clicking "Book" immediately books the class and shows a brief toast confirmation

### 7. Member Profile (`/profile`) — Member

**Layout:**
- Profile header: large photo, name, email
- **Personal Info section:** editable fields for name, email, phone, photo URL. Save button.
- **Favorite Instructors section:** list of all instructors with toggle switches. Toggled-on instructors are favorites.
- **Favorite Class Types section:** list of all class types with toggle switches. Toggled-on types are favorites.

### 8. Instructor Profile (`/profile`) — Instructor

Same layout as Member Profile but with an additional **Bio** textarea field in the Personal Info section. No favorites section (favorites are member-only).

### 9. Explore Classes (`/classes`) — Member

**Layout:**
- Top bar: week picker (same style as Studio Calendar), filter dropdowns for class type and instructor
- Below: class list organized by day. Each day has a date header, then a vertical list of class cards for that day sorted by time

**Class card:**
- Left: time (large, prominent), class type color indicator (vertical bar or dot)
- Center: title, instructor photo (small circle) + name (clickable → instructor page), room
- Right: spots remaining ("3 spots left"), and one of:
  - "Book" button (default)
  - "Booked ✓" badge + "Cancel" link (if already booked)
  - "Full" badge (if at capacity)
- Tapping the instructor photo/name navigates to the Instructor Page

### 10. Instructor Page (`/instructor/[id]`) — All roles

**Layout:**
- **Profile header:** large photo (rounded, but not a small circle — maybe 120x120 or a hero-style header), name, bio paragraph, class types they teach as colored tags
- **Below the header:** the exact same class list and filter UI from Explore Classes, but pre-filtered to this instructor's classes. Week picker and class type filter still available (instructor filter is hidden since it's redundant)
- Members can book/cancel from here. Same card behavior as Explore Classes.

## Toast Notifications

Use a global toast system (build a simple one with React context + Tailwind transitions, or use Headless UI Transition):
- Position: top-right corner, stacked if multiple
- Appearance: small card with an icon (checkmark for success, alert for warnings), message text, auto-dismiss after 4 seconds
- Use for: "Class booked!", "Booking cancelled", "Class created successfully", "Class cancelled. SMS sent to 12 members.", "Profile updated", etc.

## Mock Data Guidelines

Make the mock data feel realistic and cohesive:

**Instructors** (5-6):
- Use real-sounding names, varied backgrounds. Example: "Sarah Chen" (yoga, hot yoga), "Marcus Rivera" (spinning, pilates), "Emma Larsson" (barre, pilates), "David Okafor" (yoga, hot yoga, spinning), "Lisa Park" (barre, yoga)
- Bios should be 1-2 sentences, personality-driven: "200-hour certified yoga instructor who believes everyone deserves a moment of calm. Expect playlists heavy on Khruangbin."

**Classes:**
- Spread across Mon–Sun for the current week plus the next 2 weeks
- Vary times between 7:00–20:00, 50-minute duration
- Use catchy titles: "Morning Flow", "Power Barre", "Sweat & Spin", "Deep Stretch", "Core Crush Pilates", "Sunrise Yoga", "Barre Burn"
- Max capacity between 8–20
- Some classes should be recurring (set `isRecurring: true`)
- Ensure no double-bookings in the mock data (no two classes in the same room at the same time)

**Members** (10-12):
- Varied names and favorites
- Some should have 3-4 bookings, some just 1, one or two with none (new members)

**Bookings:**
- ~20-25 bookings spread across members and classes
- Mix of one-time and recurring
- Some classes should be near capacity, one or two at full capacity

## Responsive Design Notes

- **Desktop (≥1024px):** Sidebar navigation, multi-column layouts, full calendar grid
- **Tablet (768–1023px):** Sidebar collapses to icons or becomes a top bar, 2-column card grids
- **Mobile (<768px):** Bottom tab bar navigation, single-column layouts, calendar shows 1 day at a time, horizontal scroll for card rows where appropriate

## Image Assets

For the prototype, use these approaches for images:
- **Instructor/member photos:** Use `https://ui-avatars.com/api/?name=FirstName+LastName&background=random&size=200` for generated avatar placeholders, or use `https://images.unsplash.com/photo-XXXXX?w=200&h=200&fit=crop` with real fitness instructor portrait IDs if possible
- **Login page image:** Use a high-quality Unsplash image of a modern yoga/fitness studio. Use `next/image` with the Unsplash URL
- **No other images needed** — the app is data-driven, not content-driven

## Deployment

Once the prototype is complete and functional:
1. Make sure `next.config.js` allows external images from the domains used (unsplash, ui-avatars, picsum, etc.)
2. Run `npm run build` to verify no build errors
3. Deploy with `npx vercel --prod`
4. Provide the live URL

## Quality Checks Before Deployment

- [ ] All three demo role logins work and show appropriate navigation
- [ ] Studio Calendar renders correctly with class blocks in the right time slots
- [ ] Double-booking prevention works in the Create Class form
- [ ] Book/cancel flow works on class cards (Explore Classes, Home, Instructor Page)
- [ ] Toast notifications appear for all key actions
- [ ] Favorites are shown on the Member Profile with working toggles
- [ ] Instructor Page shows the correct instructor's profile and their classes
- [ ] Mobile layout works: bottom nav, single-column, day picker on calendar
- [ ] No console errors, no broken images, no layout overflow issues
