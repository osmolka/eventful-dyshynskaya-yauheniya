# CODEBASE_MAP

## Overview

`eventful-dyshynskaya-yauheniya` is a TanStack Start + React 19 application for running free community events end-to-end.

Core product flows:

- public event discovery (`/`, `/explore`, `/events/$eventId`, `/hosts/$hostId`)
- authentication and account management (`/auth`, `/account`)
- attendee RSVP, tickets, and post-event feedback (`/events/$eventId`, `/my-tickets`, `/tickets/$ticketId`, `/events/$eventId/feedback`)
- host onboarding and event operations (`/become-host`, `/events/new`, `/my-events`, `/host/dashboard`)
- host team membership, moderation, exports, and check-in (`/host/members`, `/host/reports`, `/events/$eventId/check-in`, `/events/$eventId/export`, `/events/$eventId/photos`)
- media sharing and review (`/events/$eventId/gallery`, event photo moderation)

The frontend talks directly to Supabase for auth, relational data, storage buckets, Realtime subscriptions, and database RPC functions.

---

## Repository structure

```text
eventful-dyshynskaya-yauheniya/
├── .github/
│   └── copilot-instructions.md        # points contributors/agents to this file
├── docs/
│   └── CODEBASE_MAP.md                # architecture and repo map
├── src/
│   ├── assets/
│   │   └── hero-events.jpg            # landing page hero image
│   ├── components/
│   │   ├── AppHeader.tsx              # top navigation; host-awareness derived from Supabase
│   │   ├── BackButton.tsx             # reusable navigation helper
│   │   ├── ReportButton.tsx           # reusable event/photo reporting dialog
│   │   ├── Spinner.tsx                # loading primitives, page loader
│   │   └── ui/                        # shadcn/Radix-based design system primitives
│   ├── contexts/
│   │   └── AuthContext.tsx            # client auth/session provider around Supabase auth
│   ├── hooks/
│   │   └── use-mobile.tsx             # UI utility hook
│   ├── integrations/
│   │   └── supabase/
│   │       ├── auth-middleware.ts     # server middleware for bearer-token auth in TanStack Start
│   │       ├── client.server.ts       # service-role server client
│   │       ├── client.ts              # browser/SSR publishable-key client
│   │       └── types.ts               # generated DB schema types, enums, RPC signatures
│   ├── lib/
│   │   └── utils.ts                   # UI/shared utility helpers
│   ├── routes/
│   │   ├── __root.tsx                 # HTML shell, metadata, global providers
│   │   ├── _authenticated.tsx         # auth gate layout for protected routes
│   │   ├── _authenticated/            # signed-in attendee and host features
│   │   ├── auth.tsx                   # sign-in / sign-up page
│   │   ├── events.$eventId.tsx        # public event detail + RSVP flow
│   │   ├── events.$eventId_.gallery.tsx
│   │   ├── explore.tsx                # searchable public event discovery
│   │   ├── hosts.$hostId.tsx          # public host profile
│   │   ├── index.tsx                  # landing page
│   │   └── invites.$token.tsx         # host invite acceptance flow
│   ├── routeTree.gen.ts               # generated TanStack Router route tree
│   ├── router.tsx                     # router factory and default error boundary
│   └── styles.css                     # global styles
├── supabase/
│   ├── config.toml                    # local Supabase configuration
│   └── migrations/                    # schema, RLS, triggers, RPCs, storage buckets, demo seed data
├── package.json                       # scripts and JS dependency manifest
├── vite.config.ts                     # Vite config via Lovable/TanStack preset
└── wrangler.jsonc                     # Cloudflare worker entry for TanStack Start server entry
```

---

## Runtime architecture

### Frontend stack

- **Vite 7** for build/dev server
- **TanStack Start** for the app/runtime shell and server entry
- **TanStack Router** with file-based route generation (`src/routeTree.gen.ts`)
- **React 19** for UI rendering
- **Tailwind CSS 4** + **Radix UI/shadcn-style components** for styling and primitives
- **Supabase JS** for auth, database access, storage, and Realtime
- **Zod** + `@tanstack/zod-adapter` for route search param validation and input validation

### Deployment/runtime entry

- `wrangler.jsonc` sets `main` to `@tanstack/react-start/server-entry`, indicating Cloudflare-oriented deployment.
- `vite.config.ts` delegates nearly all setup to `@lovable.dev/vite-tanstack-config`.
- `src/router.tsx` constructs the TanStack router instance from the generated route tree.

### App shell

- `src/routes/__root.tsx`
  - defines global document `<html>` shell
  - injects metadata and `styles.css`
  - wraps all routed UI in `AuthProvider`
  - renders persistent `AppHeader`
  - mounts global toast notifications via `Toaster`
- `src/router.tsx`
  - central router factory (`getRouter`)
  - enables scroll restoration
  - defines a global fallback error screen

---

## Key entry points

### Build and dev entry points

- `package.json`
  - `npm run dev` / `bun run dev` -> `vite dev`
  - `build` -> `vite build`
  - `preview` -> `vite preview`
  - `lint` / `format` for maintenance

### Application entry points

- `src/router.tsx` -> router factory consumed by TanStack Start runtime
- `src/routes/__root.tsx` -> root route, HTML shell, auth provider, header, toaster
- `src/routeTree.gen.ts` -> generated route registry connecting all file routes
- `src/contexts/AuthContext.tsx` -> client auth bootstrap and session synchronization
- `src/integrations/supabase/client.ts` -> shared browser/SSR data client

### Server-oriented integration entry points

- `src/integrations/supabase/client.server.ts`
  - service-role Supabase client for trusted server-side work
  - intended to bypass RLS when necessary
- `src/integrations/supabase/auth-middleware.ts`
  - TanStack Start server middleware for validating bearer tokens
  - exposes authenticated Supabase context (`supabase`, `userId`, JWT claims)
  - currently infrastructure code rather than a major route dependency

---

## Route map and major modules

### 1. Public shell and discovery

#### `src/routes/index.tsx`

- marketing/landing page
- adapts CTA behavior based on auth state
- introduces attendee vs host workflows

#### `src/routes/explore.tsx`

- public event discovery surface
- validates search params with Zod
- queries `events` directly from Supabase
- supports filters for text, date range, online/venue, and past events
- only shows `published` + `public` events from the client query

#### `src/routes/events.$eventId.tsx`

- public event detail page
- responsibilities:
  - load event details
  - fetch event counts via `get_event_counts` RPC
  - load current user RSVP + ticket if signed in
  - create RSVPs
  - subscribe to Realtime updates on `rsvps` and `tickets`
- connects public discovery to attendee conversion

#### `src/routes/events.$eventId_.gallery.tsx`

- public event photo gallery
- shows approved public photos
- if the current user has a confirmed RSVP, allows uploads to the `event-photos` bucket
- also shows the current uploader's own pending/rejected submissions

#### `src/routes/hosts.$hostId.tsx`

- public host profile page
- loads host identity data from `hosts`
- currently includes a placeholder upcoming-events section

### 2. Authentication and identity

#### `src/routes/auth.tsx`

- sign-in/sign-up page
- supports `redirect` and `mode` via validated search params
- delegates auth operations to `AuthContext`

#### `src/contexts/AuthContext.tsx`

- central client auth/session module
- listens to Supabase auth state changes
- exposes:
  - `user`
  - `session`
  - `loading`
  - `signUp`
  - `signIn`
  - `signOut`

#### `src/routes/_authenticated.tsx`

- protected route layout
- redirects unauthenticated users to `/auth`
- shows a full-page loader while session state initializes

### 3. Attendee flows

#### `src/routes/_authenticated/my-tickets.tsx`

- attendee dashboard for upcoming tickets
- joins `tickets -> rsvps -> events -> hosts`
- filters down to future events

#### `src/routes/_authenticated/tickets.$ticketId.tsx`

- attendee ticket detail page
- shows QR code and ticket code
- supports calendar export (`.ics` file generation in-browser)
- allows RSVP cancellation by deleting the related `rsvp`
- links to feedback after event end

#### `src/routes/_authenticated/events.$eventId.feedback.tsx`

- attendee post-event feedback form
- only available after event end and for confirmed attendees
- upserts into `event_feedback`

### 4. Host onboarding and event management

#### `src/routes/_authenticated/become-host.tsx`

- host onboarding form
- creates a `hosts` record
- uploads optional host logo to `host-logos`
- upgrades `profiles.role` from `attendee` to `host`

#### `src/routes/_authenticated/events.new.tsx`

- event creation form for hosts
- uploads optional event cover image to `event-covers`
- writes draft `events` rows
- models public vs unlisted visibility and venue vs online event mode

#### `src/routes/_authenticated/my-events.tsx`

- compact host event list
- loads host-owned events
- supports draft/publish toggling
- links into operational tools like check-in

#### `src/routes/_authenticated/host.dashboard.tsx`

- host home/dashboard
- finds the host organization for owner or host-role member
- aggregates per-event counts for:
  - confirmed attendees
  - waitlist size
  - checked-in count
- routes to exports, feedback summary, photo moderation, and reports

### 5. Host team operations

#### `src/routes/invites.$token.tsx`

- invite acceptance page
- requires sign-in
- calls `accept_host_invite` RPC

#### `src/routes/_authenticated/host.members.tsx`

- host team management
- loads `host_members` and `host_invites`
- creates invite records
- copies invite URLs for teammates
- removes host members
- supports role assignment of `host` or `checker`

### 6. Check-in, export, moderation, and analytics

#### `src/routes/_authenticated/events.$eventId.check-in.tsx`

- event door/check-in tool
- validates ticket code format with Zod
- authorizes via `can_check_in_event` RPC
- updates `tickets.checked_in_at` / `checked_in_by`
- shows live confirmed/check-in counts with Realtime refreshes
- supports undo of the most recent check-in

#### `src/routes/_authenticated/events.$eventId.export.tsx`

- host CSV export surface
- authorizes via `is_host_role`
- uses `export_event_rsvps` RPC
- downloads two CSV variants:
  - all RSVPs
  - attendance-only (checked-in subset)

#### `src/routes/_authenticated/events.$eventId.feedback-summary.tsx`

- host-facing feedback analytics page
- authorizes via `is_host_role`
- loads `event_feedback`
- computes average rating, distribution, and comment list

#### `src/routes/_authenticated/events.$eventId.photos.tsx`

- host photo moderation page
- authorizes via `is_host_role`
- reviews all event photos
- updates photo status to `approved` or `rejected`

#### `src/routes/_authenticated/host.reports.tsx`

- host moderation queue for user reports
- loads `content_reports`
- enriches report targets with event/photo metadata
- can hide/unhide `events` or `event_photos`
- resolves reports by setting `resolved_at` and `resolved_by`

---

## Shared UI modules

### `src/components/AppHeader.tsx`

- global top navigation
- derives host navigation state by querying `hosts` and `host_members`
- conditionally shows links for:
  - `Explore`
  - `My Tickets`
  - `Host Dashboard`
  - `My account`

### `src/components/ReportButton.tsx`

- shared moderation/reporting control
- used on event details and photo gallery items
- inserts into `content_reports`

### `src/components/Spinner.tsx`

- shared loading indicators (`Spinner`, `PageLoader`)

### `src/components/ui/*`

- reusable UI primitives built around Radix/shadcn conventions
- most feature routes compose these primitives rather than custom bespoke widgets

---

## Supabase integration map

### Client modules

#### `src/integrations/supabase/client.ts`

- lazily constructs a typed Supabase client from environment variables
- works in client and SSR contexts
- persists auth session in `localStorage` when running in the browser

#### `src/integrations/supabase/client.server.ts`

- lazily constructs a service-role client
- intended for trusted server-side operations only

#### `src/integrations/supabase/types.ts`

- generated type source of truth for:
  - tables
  - row/insert/update types
  - enums
  - RPC function signatures

### Realtime usage

- `events.$eventId.tsx`
  - listens to `rsvps` and `tickets` changes to refresh RSVP/ticket state
- `events.$eventId.check-in.tsx`
  - listens to `tickets` and event-scoped `rsvps` changes to refresh counts
- migrations explicitly enable Realtime publication for `rsvps` and `tickets`

---

## Data model and important relationships

The current schema is visible in `src/integrations/supabase/types.ts` and created incrementally in `supabase/migrations/`.

### Core tables

- `profiles`
  - one row per auth user
  - stores `display_name` and app-level `role`

- `hosts`
  - one host organization per owning profile (`profile_id` unique)
  - public-facing host metadata

- `host_members`
  - team membership for hosts
  - roles: `host` or `checker`

- `host_invites`
  - invitation links for adding members to a host team

- `events`
  - belongs to `hosts`
  - supports `draft` vs `published`, `public` vs `unlisted`, and `hidden`

- `rsvps`
  - unique per `(event_id, user_id)`
  - status is `confirmed` or `waitlisted`

- `tickets`
  - one-to-one with `rsvps`
  - stores QR/ticket `code` and optional check-in metadata

- `event_feedback`
  - unique per `(event_id, user_id)`
  - post-event rating and optional comment

- `event_photos`
  - attendee-uploaded media for an event
  - moderation state: `pending`, `approved`, `rejected`
  - supports `hidden` for moderation

- `content_reports`
  - generic moderation reports against either an `event` or a `photo`

### Relationship graph

```text
auth.users
  -> profiles
	  -> hosts (owner profile)
		  -> events
			  -> rsvps
				  -> tickets
			  -> event_feedback
			  -> event_photos

hosts
  -> host_members
  -> host_invites

content_reports
  -> targets events or event_photos by (target_type, target_id)
```

### Storage buckets

- `host-logos`
  - public read
  - owner-scoped uploads under `{userId}/...`

- `event-covers`
  - public read
  - owner-scoped uploads under `{userId}/...`

- `event-photos`
  - public read at object level
  - upload path convention used by UI: `{eventId}/{userId}/{randomFile}`
  - RLS enforces confirmed-attendee uploads and host/delete permissions

---

## Database automation and business rules

Important behavior lives in SQL triggers and RPCs rather than only in React code.

### Triggers / functions

- `handle_new_user()`
  - auto-creates `profiles` row when a new Supabase auth user is created

- `update_updated_at_column()`
  - shared timestamp maintenance trigger helper

- `set_rsvp_status()`
  - automatically assigns `confirmed` vs `waitlisted` based on event capacity

- `promote_waitlist(_event_id)`
  - fills newly available slots FIFO when capacity changes or confirmed RSVPs are removed

- `issue_ticket_for_rsvp()` + `generate_ticket_code()`
  - auto-creates tickets for confirmed RSVPs

- `validate_event_feedback()`
  - enforces that only confirmed attendees can submit feedback after event end

### RPC/helpers used by the app

- `accept_host_invite(_token)`
  - consumes invite token and creates/updates `host_members`

- `can_check_in_event(_event_id)`
  - authorizes host/checker access to check-in operations

- `export_event_rsvps(_event_id)`
  - returns export-ready rows with attendee name/email/check-in data

- `get_event_counts(_event_id)`
  - returns confirmed, waitlist, and checked-in counts for public event pages

- `is_host_owner(_host_id)`
  - owner authorization helper

- `is_host_role(_host_id)`
  - host-role authorization helper for owners and delegated host members

- `is_report_host(_target_type, _target_id)`
  - moderation authorization helper for report visibility/resolution

---

## Important dependencies

### Framework/runtime

- `@tanstack/react-start`
- `@tanstack/react-router`
- `react`, `react-dom`
- `vite`
- `@cloudflare/vite-plugin`

### Data and validation

- `@supabase/supabase-js`
- `zod`
- `@tanstack/zod-adapter`

### UI and styling

- `tailwindcss`
- `@tailwindcss/vite`
- Radix packages (`@radix-ui/react-*`)
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `lucide-react`
- `sonner`

### Feature-specific helpers

- `qrcode.react` for attendee ticket and event QR display
- `date-fns`, `react-day-picker`, `recharts`, `embla-carousel-react`, etc. are available, though only part of the installed UI/tooling surface is exercised by current routes
- `@tanstack/react-query` is installed but not a visible architectural dependency in the current route implementations

---

## Cross-module dependency summary

### Frontend flow

```text
__root.tsx
  -> AuthProvider
	  -> Supabase auth client
  -> AppHeader
	  -> hosts + host_members queries
  -> Outlet
	  -> public routes or _authenticated layout

_authenticated.tsx
  -> useAuth()
  -> protected feature routes
```

### Host lifecycle

```text
become-host.tsx
  -> storage bucket: host-logos
  -> table: hosts
  -> table: profiles (role update)

events.new.tsx
  -> storage bucket: event-covers
  -> table: events

my-events.tsx / host.dashboard.tsx
  -> tables: hosts, host_members, events, rsvps, tickets
```

### Attendee lifecycle

```text
explore.tsx
  -> table: events

events.$eventId.tsx
  -> table: events
  -> rpc: get_event_counts
  -> table: rsvps
  -> table: tickets
  -> Realtime: rsvps, tickets

tickets.$ticketId.tsx
  -> table: tickets via joined RSVP/event data
  -> delete RSVP to cancel

events.$eventId.feedback.tsx
  -> table: event_feedback
```

### Moderation lifecycle

```text
ReportButton
  -> table: content_reports

events.$eventId_.gallery.tsx
  -> storage bucket: event-photos
  -> table: event_photos

events.$eventId.photos.tsx
  -> table: event_photos
  -> rpc: is_host_role

host.reports.tsx
  -> table: content_reports
  -> table: events / event_photos
  -> rpc-backed RLS via is_report_host
```

---

## Migration timeline summary

High-level progression in `supabase/migrations/`:

1. **Profiles and auth bootstrap**
   - `profiles`
   - `handle_new_user` trigger
   - `app_role`
2. **Hosts and branding assets**
   - `hosts`
   - `host-logos` storage bucket
3. **Events**
   - `events`
   - `event_status`, later `event_visibility`
   - `event-covers` storage bucket
4. **RSVP and ticketing**
   - `rsvps`
   - waitlist promotion logic
   - `tickets`, ticket generation, Realtime publication
5. **Host team model**
   - moved from `host_checkers` to generalized `host_members`
   - `host_invites`
   - `accept_host_invite`, `is_host_role`, `can_check_in_event`
6. **Exports, feedback, and photos**
   - `export_event_rsvps`
   - `event_feedback`
   - `event_photos` + `event-photos` storage bucket
7. **Moderation and visibility controls**
   - `hidden` flags for events/photos
   - `content_reports`
   - `is_report_host`
8. **Demo/test data**
   - seeded users, hosts, events, RSVPs, and tickets for local/demo use

---

## Notes for contributors

- Treat `src/routeTree.gen.ts` as generated output; do not edit it manually.
- Many business rules are enforced in Supabase SQL, not just in route components.
- When adding new event or host features, verify both:
  - React route/component behavior
  - matching Supabase RLS / RPC / trigger support
- When adding new media flows, check both relational tables and storage bucket policies.

