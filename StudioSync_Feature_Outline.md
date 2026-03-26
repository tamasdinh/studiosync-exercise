# StudioSync — Feature Outline

## Overview

A lightweight studio management app for a boutique fitness studio with two rooms and multiple independent instructors. The app replaces the current combination of shared Google Calendar, manual texts, and spreadsheets. Andrew sets up the studio roster, instructors post and manage their own classes, and members browse, book, and get notified when things change. SMS notifications handle all time-sensitive communication about schedule changes and cancellations.

## User Roles

- **Owner (Andrew)** — Manages the studio. Adds and removes members and instructors, has full permission to manage any class. Sees everything instructors see, plus member and instructor management.
- **Instructor** — A vetted instructor added by Andrew. Creates and manages their own classes, views room availability and other instructors' schedules (read-only), maintains their profile.
- **Member** — An existing studio member added by Andrew. Browses and books classes, manages favorite class types and instructors, views their upcoming bookings, and receives SMS notifications for changes to their booked classes.

## Features

### Authentication & Login

- Email and password login. No public sign-up — all accounts are created by Andrew
- Role is assigned at account creation (member, instructor, owner). No role-switching available in the app
- Login screen uses a split layout: looping videos on relevant class types on the left half, login form on the right half. On smaller screens, the video part collapses and the login form goes full-width
- No social auth or magic links in MVP, but there's a self-service Forgot password feature

### Managing Instructors

- Andrew adds instructors manually: name, email, phone number, profile photo, short bio
- Andrew can view the instructor list, edit instructor details, and deactivate instructors
- Instructors can edit their own profile: name, email, phone, photo, and bio
- No instructor ratings, reviews, certifications, or pay tracking in MVP

### Class Creation & Management

- The admin Classes page shows all classes for the selected week. Instructors can only see their own classes here, Andrew can see all classes
  - Classes can be filtered by class type, instructor (Andrew only) and  searched by name
  - The "Show past classes" toggle makes past classes visible.
  - Each list item shows image, title, class type badge, recurring indicator, instructor, date/time/room, and booking count. Clicking a class opens the class detail view
- Instructors create classes by specifying: date, time slot (on the hour), room (Room 1 or Room 2), class type (yoga, hot yoga, pilates, barre, spinning), a catchy title, description, and max capacity
- Standard class duration is 50 minutes. The 10-minute buffer between slots is implicit — the system does not enforce it but prevents overlapping bookings in the same room
- The system prevents double-booking: a room and time slot combination can only have one class
- Classes can be set as **one-time** or **recurring** via a segmented switch in the form. Recurring classes repeat weekly on the same day and time, and appear automatically on every subsequent week
- **Editing a single occurrence** ("Edit this class") extracts that date from the recurring series into a new standalone class with the same attributes and participants. The original series gains an excluded date, so it no longer recurs on that specific week. The extracted class can then be edited freely as a one-time class. Participants are retained and are notified via SMS about the class change.
- **Cancelling a single occurrence** ("Cancel this class") adds the date to the series' excluded dates list. The series continues on all other weeks. Participants are notified via SMS
- **Editing the series** ("Edit series") and **cancelling the series** ("Cancel series") affect all future occurrences. Both trigger SMS notifications to all booked members
- For recurring classes, the class detail view shows "Edit series" / "Cancel series" as the main actions, with smaller "Edit this class" / "Cancel this class" buttons next to the date and time of the specific instance of the series that was opened
- When a class is changed or cancelled, the app displays a **toast notification** confirming the action (e.g., "SMS sent to 12 members") and triggers SMS notifications
- All cancel actions (series and single) go through a confirmation dialog before executing
- **Roster** section shows all booked participants sorted alphabetically. For users with edit permissions, hovering over a participant's avatar reveals an X overlay — clicking it opens a confirmation dialog to remove the participant (with SMS notification)
- **Add participants** button opens a modal with:
  - Selected members shown as removable pills above the search box
  - Search box (name or email, results after 1 character) with a fixed-height scrollable results area
  - Multi-select: clicking a result adds it to the selected list
  - "Add new Member" button (hidden when selections exist) that opens the Create Member popup with the class pre-added
  - Adding participants triggers SMS notifications
- Participants on recurring classes are always marked as recurring
- No drag-and-drop scheduling, instructor substitution workflows, variable durations, or multi-room classes in MVP

### Studio Calendar

- The shared admin view for instructors and Andrew. This replaces the shared Google Calendar
- Desktop: filter by room (Room 1, Room 2, or Both), hourly grid from 7:00 AM to 10:00 PM, 7 days per week with a week picker
- Mobile: always shows both rooms side by side for a single day, with a day picker
- Class type legend shown on both desktop and mobile views
- Class events appear as blocks on the grid showing title (up to two lines) and instructor's first name
- Clicking a class event opens the class detail view: title, type, instructor, room, description, capacity, and roster
- Instructors see all classes across both rooms but can only manipulate their own (edit, cancel, change participants). Andrew can edit or cancel any class
- No drag-and-drop rescheduling, Google Calendar sync, or iCal export in MVP

### Managing Members

- Andrew adds members manually: name, email, phone number, profile photo (optional)
- **Class Additions** section appears above favorites when creating a new member. Already added classes are shown above the class selector. Adding a class automatically populates the member's favorite class types and instructors from that class
- Class Additions section is hidden when editing an existing member
- Andrew can view the member list, edit member details, and deactivate members (which cancels all their bookings)
- Members can edit their own profile and update their favorites (see Member Profile below)
- No bulk import, member attendance analytics, payment or subscription management, or member-to-member visibility in MVP

### Member Home

- The member's landing page after login. This is the primary screen for day-to-day use
- **Your Upcoming Classes** section shows booked classes for the current week, both one-time and recurring. Each entry displays the class card with a cancel option. Recurring classes show a recurring badge
- **Recommended for You** section shows upcoming classes matching the member's favorited instructors and class types that they haven't booked yet. Members can book directly from these cards
- Since favorites are auto-populated from Andrew's class assignments, the home screen is immediately personalized from day one — no separate onboarding screen is needed
- No activity feed, notification inbox, or attendance history in MVP

### Member Profile

- Accessible by tapping the member's profile image in the header
- Members can edit: name, email, phone number, profile photo
- Members can manage their favorites on this screen: a list of favorited instructors (toggle on/off) and favorited class types (toggle on/off). These start pre-populated based on Andrew's class assignments but can be changed at any time
- The profile editing layout is shared between members and instructors — instructors see the same screen with the addition of a bio field
- Saving the profile navigates back to the previous screen
- No notification preferences or password change in MVP

### Exploring Classes

- The main class browsing view, accessible from navigation. Shows upcoming classes organized by day
- Members select a week from a week picker — the current week is the earliest selectable (prev week button is disabled).
- Filters: class type and instructor dropdowns
- Each class card shows: title, class type tag, instructor name and photo (clickable, navigates to that instructor's page), time, room, and spots remaining
- Members can **book directly from the class list items**
- Classes the member is already booked for show a Cancel button
- Classes at full capacity show a "Full" badge with no booking action
- Recurring classes appear on every relevant week automatically
- No keyword search, saved searches, or separate class detail page in MVP — all relevant information/action is on the list items

### Instructor Page

- Not a standalone "instructor list" screen. Reached by tapping an instructor's name or photo anywhere in the Customer part of the app (class cards, home screen, etc.)
- Layout: instructor profile at the top (large photo, name, bio, class types they teach), followed by the same class list and filter UI used on the Explore Classes screen, filtered to that instructor
- Members can book and cancel directly from this view, same as on the main browse page

### Booking & Cancellation

- When a member books a class, if the class is recurring, the booking is automatically set as recurring — the member attends every week
- Booking is instant — no approval step from the instructor or Andrew
- Capacity tracking to determine available spots
- Members can cancel bookings. Cancelling frees the spot immediately
- No waitlist, automatic waitlist promotion, payment per class, cancellation penalties, or drop-in fees in MVP

### UI & Layout Conventions

- **Avatar placeholders**: light gray background (`bg-slate-300`) with white initials. When using ui-avatars.com API: `background=cbd5e1&color=fff`. Never random/colorful backgrounds
- **Pill-based selections** for favorites (class types and instructors) — colored when active, gray when inactive
- **Toast notifications** for all actions: auto-dismiss after 4 seconds, colored by type (success/error/warning)
- **Confirmation dialogs** for destructive actions: removing participants, cancelling classes (both single and series), deactivating members
- **Responsive layout**: all views adapt from mobile to desktop. Week/day pickers collapse labels on small screens. Filter dropdowns stretch to fill on small screens, natural width on larger
