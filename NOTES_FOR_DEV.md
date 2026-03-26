# Notes for Dev

This is a front-end prototype built during a client session with Andrew (studio owner). It demonstrates the full UX flow and UI of StudioSync. The prototype uses an in-memory mock data store — there is no real backend, database, or SMS service. The developer picking up this project should build the actual backend and address the known issues listed below.

## Context

- **What this is**: A working front-end prototype in Next.js 16 + Tailwind CSS + HeadlessUI. All data lives in-memory and resets on page reload. The purpose is to demonstrate the feature set and UX to the client before building the real backend.
- **What the dev should build**: A proper backend (API routes or separate service), database (Postgres recommended), real authentication, and SMS integration (e.g., Twilio). The front-end components and layouts are ready to wire up to real APIs.
- **Feature outline**: See `StudioSync_Feature_Outline.md` for the complete, up-to-date feature spec.

## Known Issues in the Prototype

### Conflict detection for recurring classes (`updateClass`)

**File**: `src/services/classes.ts` — `updateClass` function

The internal conflict check in `updateClass` only compares `c.date === updated.date`. It does not account for recurring classes that would land on the same weekday and time. The standalone `hasConflict` function does handle this correctly, and the UI calls `hasConflict` before `updateClass`, so the bug does not surface in normal usage. However, when building the real backend, ensure the database-level conflict check accounts for recurring class schedules.

### `getClasses` date filter ignores recurring classes

**File**: `src/services/classes.ts` — `getClasses` function

When filtering by `date`, the function checks `c.date === filters.date`, which only matches the base date of a recurring class, not its weekly occurrences. The front-end works around this by calling `getClasses()` without a date filter and then using `expandRecurringClasses()` client-side. The real backend should handle recurring expansion at the query level.

### `getAvailableSlots` ignores recurring classes

**File**: `src/services/classes.ts` — `getAvailableSlots` function

Same issue as above — only finds classes with a matching `c.date`, missing recurring classes that land on the queried date. This function is not actively used in the UI but should be fixed in the backend.

### Booking model for recurring classes

Recurring bookings currently mean "the member is booked for every occurrence of this series." There is no per-date booking — a member is either in the series or not. If the product needs per-occurrence booking for recurring classes (e.g., a member skips one week), the booking model will need a date field or a separate exclusion mechanism. Discuss with Andrew whether this is needed.

### Non-deterministic seed data

**File**: `src/data/classes.ts`, `src/data/bookings.ts`

The seed data uses `Math.random()` without a seed, so every page load generates different classes and bookings. This is fine for prototyping but means the demo data is not reproducible. For a stable demo, consider using a seeded PRNG or a static fixture.

### Performance: Maps/Sets recreated every render

**File**: `src/app/classes/page.tsx` (lines ~103-105)

`instructorMap`, `myBookingMap`, and `favoriteSet` are created on every render outside of `useMemo`. For the prototype this is negligible, but in production with larger datasets these should be memoized.

### SMS is simulated

All SMS notifications are simulated — the app shows toast messages saying "notified via SMS" but no actual SMS is sent. The real backend should integrate with Twilio or a similar provider. The toast messages serve as UX confirmation that the notification was triggered.

## Architecture Notes for the Backend Dev

- **Data model**: See `src/types/index.ts` for all TypeScript types. The `Class` type includes `excludedDates: string[]` for recurring series exceptions.
- **Service layer**: `src/services/` contains the mock service functions. Each follows the pattern `async function -> delay -> operate on store`. Replace these with real API calls.
- **Recurring class expansion**: `expandRecurringClasses()` in `src/services/classes.ts` is the key function that generates weekly occurrences from a single recurring class record. This logic should move to the backend query layer.
- **Auth**: `src/contexts/AuthContext.tsx` is a mock auth context. Replace with real JWT/session-based auth.
- **State management**: React Context + local state. No Redux or Zustand. This is intentional for the prototype — evaluate whether a state library is needed as the app grows.
