@AGENTS.md

# StudioSync — Prototype

This is a front-end prototype for a boutique fitness studio management app. Built with Next.js 16, Tailwind CSS 4, and HeadlessUI.

## Project Context

- **Purpose**: Client-facing prototype built during a design session with the studio owner (Andrew). Demonstrates the full UX flow before backend development begins.
- **Data**: All data is in-memory (mock services in `src/services/`, seed data in `src/data/`). Resets on page reload.
- **Feature spec**: See `StudioSync_Feature_Outline.md` for the complete feature outline.
- **Known issues & backend notes**: See `NOTES_FOR_DEV.md` for issues the backend developer should address.

## Key Conventions

- **Filter sentinel values**: Use empty string `''` (not `'all'`) as the "show all" value for filter dropdowns across all pages
- **Avatar placeholders**: Light gray background with white initials. ui-avatars.com URLs use `background=cbd5e1&color=fff`. Never random/colorful backgrounds
- **Recurring classes**: A single record with `isRecurring: true` represents the entire weekly series. `expandRecurringClasses()` in `src/services/classes.ts` generates per-week occurrences for display. `excludedDates` on the Class type tracks dates removed from the series
- **Toast notifications**: Use `showToast(message)` for success, `showToast(message, 'error')` for errors. Always mention SMS when participants are notified
- **Confirmation dialogs**: Required for all destructive actions (cancel class, remove participant, deactivate member)

## Changelog Conventions

- Always put the latest updates to the changelog at the top (reverse chronological order - newest first)
