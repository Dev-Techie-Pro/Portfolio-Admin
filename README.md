# Portfolio Admin Dashboard

A full-stack **Portfolio Admin Dashboard** for managing portfolio website content, site settings, media, users, and activity. The app combines **Next.js 14 (App Router)** for routing, authentication, and API endpoints with a **vanilla JavaScript module system** for the interactive dashboard UI. All CMS data is persisted in **Supabase** (PostgreSQL, Auth, and Storage).

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [Pages & Routes](#pages--routes)
- [API Endpoints](#api-endpoints)
- [Authentication & Roles](#authentication--roles)
- [Development Workflow](#development-workflow)
- [Maintenance Scripts](#maintenance-scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

---



## Features

- **Dashboard** — overview stats, ApexCharts charts, and quick-add wizards for common content types
- **CMS modules** — projects, project tags, categories, blog categories, technologies, tools, tool categories, blog posts, experience, testimonials, and media library
- **Contact messages** — inbox with threaded replies (SMTP), configurable column visibility, and status workflow
- **User management** — staff user CRUD, role assignment, and credential reset emails (`/users`)
- **Recent activities** — audit trail of user actions with retention policies and cron purge
- **Notifications** — in-app notification inbox with per-user preference controls
- **Settings** — general site config, profile, security (MFA + backup codes), notifications, and system admin tools
- **Appearance / customization** — global theme and UI panel (stored in `site_settings.appearance_settings`)
- **System admin** — SQL database export with table stats, environment config viewer, backup snapshot audit log
- **Authentication** — Supabase Auth with login, MFA (TOTP), forgot/reset password, session management, and login activity
- **Role-based access** — `super_admin`, `admin`, `editor`, and `viewer` roles enforced on API routes
- **Media storage** — Supabase Storage bucket with sync, usage tracking, and orphan reconciliation
- **Responsive UI** — dark-theme dashboard optimized for desktop, tablet, and mobile

---



## Technology Stack


| Layer          | Technology                                                               | Version           |
| -------------- | ------------------------------------------------------------------------ | ----------------- |
| Framework      | [Next.js](https://nextjs.org/) (App Router)                              | 14.2.35           |
| UI runtime     | [React](https://react.dev/)                                              | 18.3.x            |
| Client modules | TypeScript ES modules (`client/` → compiled to `public/js/`)             | ES2020            |
| Styling        | Custom CSS (`app/globals.css` → `app/styles/`)                           | —                 |
| Icons          | [Remix Icon](https://remixicon.com/) (CDN)                               | 4.6.0             |
| Fonts          | Outfit, Inter, JetBrains Mono + customization panel fonts (Google Fonts) | —                 |
| Backend / DB   | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)            | —                 |
| Supabase SDK   | `@supabase/supabase-js`, `@supabase/ssr`                                 | ^2.115.0, ^0.12.6 |
| Charts         | [ApexCharts](https://apexcharts.com/)                                    | ^3.49.0           |
| Email          | [Nodemailer](https://nodemailer.com/) (SMTP)                             | ^10.0.10          |
| Language       | [TypeScript](https://www.typescriptlang.org/) (`app/`, `lib/`, `client/`) | 5.8.x             |


---



## Architecture Overview

The project uses a **hybrid architecture**:

```
Browser
  │
  ├─ Next.js App Router (app/)
  │     ├─ Server-rendered HTML shell per page (bodyHtml.ts)
  │     ├─ LegacyBoot (components/LegacyBoot.tsx) loads client JS on route change
  │     └─ middleware.ts — Supabase session guard
  │
  ├─ Client module system (client/ → public/js/)
  │     ├─ main.ts — boot, router, module lifecycle
  │     ├─ modules/* — feature modules (Projects, Blog, Settings, …)
  │     ├─ boot-prefetch.ts — early API prefetch per route
  │     └─ StorageService — fetch/save via REST API + /api/bootstrap
  │
  └─ Next.js API routes (app/api/)
        ├─ lib/auth/guard.ts — staff / admin role checks
        ├─ lib/cms/repository.ts — Supabase data access
        ├─ lib/admin/* — SQL export, env config
        └─ lib/email/* — SMTP replies and credential emails
              └─ PostgreSQL (supabase/migrations/)
```

**Request flow (typical CMS page):**

1. User navigates to e.g. `/projects`.
2. `app/projects/page.tsx` renders `LegacyBody` with pre-built HTML from `app/projects/bodyHtml.ts`.
3. `LegacyBoot` loads `/js/main.js` and calls `window.__paBootPortfolioApp()`.
4. `main.ts` resolves the current page via `client/core/router.ts` and instantiates `ProjectsModule`.
5. The module reads/writes data through `StorageService`, which calls `/api/projects` (or uses prefetched data from `/api/bootstrap`).
6. The API route validates the Supabase session and staff role, then reads/writes via `lib/cms/repository.ts`.

**HTML-in-TS pattern:** Page markup lives in `app/**/bodyHtml.ts` files (large exported strings). Shared shell pieces include `app/sidebarHtml.ts`, `app/bodyHtmlParts.ts`, `app/quickAddPanelHtml.ts`, and overlay panels (`customPanelHtml.ts`, `mediaPickerPanelHtml.ts`, etc.). This preserves the original static HTML dashboard while integrating with Next.js routing.

---



## Project Structure

```
Portfolio-Dashboard/
│
├── app/                          # Next.js App Router
│   ├── layout.js                 # Root layout, global CSS, boot scripts
│   ├── globals.css               # Imports app/styles/*.css
│   ├── styles/                   # tokens, base, layout, components
│   ├── page.js                   # Dashboard home (/)
│   ├── bodyHtml.js               # Composed dashboard shell HTML
│   ├── sidebarHtml.js            # Sidebar navigation markup
│   ├── api/                      # REST API routes (CMS, auth, admin, health)
│   ├── auth/callback/            # Supabase OAuth / magic-link callback
│   ├── login/                    # Auth pages
│   ├── forget-password/
│   ├── reset-password/
│   ├── projects/                 # CMS pages (each has page.js + bodyHtml.js)
│   ├── tags/
│   ├── blog-categories/
│   ├── categories/
│   ├── technologies/
│   ├── tool-categories/
│   ├── tools/
│   ├── media-library/
│   ├── testimonials/
│   ├── blog-post/
│   ├── experience/
│   ├── contact-messages/
│   ├── users/
│   ├── recent-activities/
│   └── settings/                 # /settings + /settings/[tab]
│
├── components/
│   ├── LegacyBody.js             # SSR HTML + client boot wrapper
│   ├── LegacyHtml.js             # Injects bodyHtml into the DOM
│   └── LegacyBoot.js             # Loads main.js; re-boots on navigation
│
├── lib/
│   ├── auth/                     # guards, profile, MFA, users, login activity
│   ├── cms/                      # repository, activity log, media sync, notifications
│   ├── admin/                    # SQL export, env config
│   ├── email/                    # SMTP send helpers
│   ├── theme/                    # category color tokens
│   └── supabase/                 # client, server, admin, middleware helpers
│
├── public/
│   ├── js/
│   │   ├── main.js               # Application entry (module boot)
│   │   ├── boot-prefetch.js      # Early API prefetch
│   │   ├── prefetch-config.js    # Per-route prefetch keys
│   │   ├── core/                 # router, StorageService, Module base class
│   │   ├── modules/              # Feature modules per page
│   │   ├── utils/                # DOM, RTE, icons, appearance, charts, etc.
│   │   └── vendor/               # legacy bundled scripts
│   └── images/                   # Favicons, manifest
│
├── supabase/
│   ├── migrations/               # PostgreSQL schema migrations (35 files)
│   └── README.md                 # Detailed database documentation
│
├── scripts/                      # Optional dev/maintenance generators (not runtime)
│
├── middleware.js                 # Auth redirect + API 401 guard
├── next.config.mjs
├── jsconfig.json                 # Path alias: @/* → project root
├── .env.example
├── package.json
└── LICENSE
```

---



## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** (or compatible package manager)
- A **Supabase** project with migrations applied (see [Database Setup](#database-setup))
- **Supabase CLI** (optional, for `npm run db:`* commands): `npm install -g supabase`
- **SMTP credentials** (optional, for contact reply emails and new-user credential delivery)

---



## Setup & Installation



### 1. Clone and install

```bash
git clone <your-repo-url>
cd Portfolio-Dashboard
npm install
```



### 2. Configure environment

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) below.

### 3. Apply database migrations

If using the Supabase CLI with a linked project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

Alternatively, run the SQL files in `supabase/migrations/` in order via the Supabase Dashboard SQL Editor. Full schema documentation is in `[supabase/README.md](supabase/README.md)`.

### 4. Promote your first admin user

After signing up through the login page, promote your account in the Supabase SQL Editor:

```sql
update public.profiles
set role = 'super_admin'
where email = 'your@email.com';
```



### 5. Verify the connection

```bash
npm run dev
```

Open [http://localhost:3000/api/health/supabase](http://localhost:3000/api/health/supabase) — a successful response includes `"connected": true` and site stats.

---



## Environment Variables


| Variable                        | Required    | Description                                                     |
| ------------------------------- | ----------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes         | Supabase project URL (`https://<ref>.supabase.co`)              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes         | Supabase anonymous (public) key                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes         | Service role key (server-side only; never expose to the client) |
| `NEXT_PUBLIC_SITE_URL`          | Recommended | Public site URL (e.g. `http://localhost:3000` in dev)           |
| `CRON_SECRET`                   | Optional    | Bearer token for `/api/cron/purge-activities`                   |
| `SMTP_HOST`                     | Optional    | SMTP host for contact replies and credential emails             |
| `SMTP_PORT`                     | Optional    | SMTP port (default `587`)                                       |
| `SMTP_USER`                     | Optional    | SMTP username                                                   |
| `SMTP_PASS`                     | Optional    | SMTP password or app password                                   |
| `SMTP_FROM`                     | Optional    | From address for outbound mail                                  |
| `EMAIL_BRAND_NAME`              | Optional    | Display name in email templates                                 |
| `EMAIL_BRAND_ROLE`              | Optional    | Role line in email templates                                    |
| `EMAIL_PORTFOLIO_LABEL`         | Optional    | Portfolio label in email footers                                |
| `EMAIL_PORTFOLIO_URL`           | Optional    | Portfolio URL in email footers                                  |
| `EMAIL_GITHUB_URL`              | Optional    | GitHub link in email footers                                    |
| `EMAIL_LINKEDIN_URL`            | Optional    | LinkedIn link in email footers                                  |


Example (from `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Security:** Never commit `.env` or `.env.local`. These paths are listed in `.gitignore`.

---



## Database Setup

The PostgreSQL schema covers:

- **Core** — `sites`, `profiles`, `site_settings`, `notification_preferences`, `security_settings`, `two_factor_backup_codes`, `login_activity`, `user_sessions`, `backup_snapshots`, `user_notifications`
- **CMS** — `categories`, `projects`, `project_tags`, `project_gallery_images`, `technologies`, `tool_categories`, `tool_items`, `blog_categories`, `blog_posts`, `blog_post_tags`, `media_assets`, `testimonials`, `experience_entries`, `contact_messages`, `contact_message_replies`
- **Activity** — `recent_activities`
- **Views** — `dashboard_stats`
- **Storage** — public `media` bucket (10 MB, images)

Theme and UI customization are stored in the `site_settings.appearance_settings` JSON column (not a separate table). Contact inbox column visibility is in `site_settings.contact_message_columns`.

Migrations are in `supabase/migrations/` (35 files) and should be applied in filename order. For tables, RLS policies, roles, and import order, see `[supabase/README.md](supabase/README.md)`.

**npm database scripts:**


| Command             | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `npm run db:push`   | Push local migrations to linked Supabase project              |
| `npm run db:status` | List applied migrations                                       |
| `npm run db:types`  | Generate TypeScript types to `lib/supabase/database.types.ts` |


---



## Running the Project


| Command             | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| `npm run dev`       | Compile client TS, then start dev server at [http://localhost:3000](http://localhost:3000) |
| `npm run dev:clean` | Clear `.next` cache and start dev server                                   |
| `npm run build:client` | Compile `client/` TypeScript to `public/js/`                            |
| `npm run build`     | Compile client TS, then create production build                            |
| `npm run start`     | Serve production build                                                     |
| `npm run lint`      | Run Next.js ESLint                                                         |
| `npm run lint:css`  | Run Stylelint on `app/**/*.css`                                            |


**Development:**

```bash
npm run dev
```

Sign in at [http://localhost:3000/login](http://localhost:3000/login). Unauthenticated requests to protected routes redirect to login; API routes return `401 Unauthorized`.

**Production:**

```bash
npm run build
npm run start
```

---



## Pages & Routes


| Path                      | Module key          | Description                             |
| ------------------------- | ------------------- | --------------------------------------- |
| `/`                       | `dashboard`         | Main dashboard with stats and quick-add |
| `/projects`               | `projects`          | Portfolio project CRUD                  |
| `/tags`                   | `tags`              | Project tag management                  |
| `/blog-categories`        | `blog-categories`   | Blog category CRUD                      |
| `/categories`             | `categories`        | Content categories                      |
| `/technologies`           | `technologies`      | Tech stack entries                      |
| `/tool-categories`        | `tool-categories`   | Tool grouping categories                |
| `/tools`                  | `tools`             | Tools / stack items                     |
| `/media-library`          | `media`             | Media asset management                  |
| `/testimonials`           | `testimonials`      | Client testimonials                     |
| `/blog-post`              | `blogposts`         | Blog post management                    |
| `/experience`             | `experience`        | Work experience entries                 |
| `/contact-messages`       | `contact-messages`  | Inbound contact form messages           |
| `/users`                  | `users`             | Staff user management (admin)           |
| `/recent-activities`      | `recent-activities` | Activity audit log                      |
| `/settings`               | `settings`          | Settings (redirects to default tab)     |
| `/settings/general`       | `settings`          | General site settings                   |
| `/settings/profile`       | `settings`          | User profile                            |
| `/settings/security`      | `settings`          | Security, MFA, backup codes             |
| `/settings/notifications` | `settings`          | Notification preferences                |
| `/settings/system`        | `settings`          | SQL export, env config, system tools    |
| `/login`                  | `login`             | Sign in (public)                        |
| `/forget-password`        | `forgot-password`   | Password reset request (public)         |
| `/reset-password`         | `reset-password`    | Password reset form (public)            |


Route-to-module mapping is defined in `public/js/core/router.js`. Settings tabs are listed in `SETTINGS_TABS` in the same file. Each CMS page module extends the base `Module` class in `public/js/core/Module.js`.

---



## API Endpoints

Staff CMS routes require an authenticated user with role `super_admin`, `admin`, or `editor`. Admin-only routes require `super_admin` or `admin`. Public routes are listed in `lib/auth/constants.js` (`AUTH_ROUTES`, `PUBLIC_API_PREFIXES`).

### CMS


| Endpoint                      | Methods                | Purpose                            |
| ----------------------------- | ---------------------- | ---------------------------------- |
| `/api/projects`               | GET, PUT               | Projects                           |
| `/api/tags`                   | GET, PUT               | Project tags                       |
| `/api/categories`             | GET, PUT               | Categories                         |
| `/api/blog-categories`        | GET, PUT               | Blog categories                    |
| `/api/technologies`           | GET, PUT               | Technologies                       |
| `/api/tool-categories`        | GET, PUT               | Tool categories                    |
| `/api/tools`                  | GET, PUT               | Tools                              |
| `/api/media`                  | GET, PUT, POST, DELETE | Media assets                       |
| `/api/media/sync`             | POST                   | Reconcile media usage counts       |
| `/api/testimonials`           | GET, PUT               | Testimonials                       |
| `/api/blog-posts`             | GET, PUT               | Blog posts                         |
| `/api/blog-posts/[id]`        | GET                    | Single blog post                   |
| `/api/experience`             | GET, PUT               | Experience entries                 |
| `/api/contact-messages`       | GET, PUT, DELETE       | Contact messages                   |
| `/api/contact-messages/reply` | POST, PUT, DELETE      | Send, edit, or delete SMTP replies |
| `/api/recent-activities`      | GET, DELETE            | Activity log                       |
| `/api/bootstrap`              | GET                    | Prefetch bundle for current page   |




### Settings & profile


| Endpoint                           | Methods                  | Purpose                         |
| ---------------------------------- | ------------------------ | ------------------------------- |
| `/api/settings`                    | GET, PUT                 | Site settings (General tab)     |
| `/api/appearance`                  | GET, PUT                 | Theme / UI customization        |
| `/api/appearance/public`           | GET                      | Public theme (unauthenticated)  |
| `/api/profile`                     | GET, PUT                 | User profile                    |
| `/api/preferences/contact-columns` | GET, PUT                 | Contact table column visibility |
| `/api/notification-preferences`    | GET, PUT                 | Notification preferences        |
| `/api/notifications`               | GET, POST, PATCH, DELETE | In-app notifications            |




### Auth & security


| Endpoint                            | Methods | Purpose                         |
| ----------------------------------- | ------- | ------------------------------- |
| `/api/auth/login`                   | POST    | Email/password sign-in          |
| `/api/auth/logout`                  | POST    | Sign out                        |
| `/api/auth/logout-all`              | POST    | Revoke all sessions             |
| `/api/auth/session`                 | GET     | Current session                 |
| `/api/auth/forgot-password`         | POST    | Send reset email                |
| `/api/auth/reset-password`          | POST    | Set new password                |
| `/api/auth/change-password`         | POST    | Change password (authenticated) |
| `/api/auth/delete-account`          | POST    | Delete own account              |
| `/api/auth/login-activity`          | GET     | Login history                   |
| `/api/auth/security-settings`       | GET     | Security flags                  |
| `/api/auth/mfa/enroll`              | POST    | Start MFA enrollment            |
| `/api/auth/mfa/verify-enroll`       | POST    | Confirm MFA enrollment          |
| `/api/auth/mfa/verify-login`        | POST    | Complete MFA login step         |
| `/api/auth/mfa/unenroll`            | POST    | Disable MFA                     |
| `/api/auth/backup-codes/regenerate` | POST    | Regenerate backup codes         |




### Users & admin


| Endpoint                            | Methods           | Purpose                            |
| ----------------------------------- | ----------------- | ---------------------------------- |
| `/api/users`                        | GET, POST         | List / create staff users          |
| `/api/users/[id]`                   | PATCH, DELETE     | Update / deactivate user           |
| `/api/users/[id]/reset-credentials` | POST              | Reset password + email credentials |
| `/api/admin/database-backup`        | GET, POST, DELETE | SQL export + snapshot audit        |
| `/api/admin/environment`            | GET, PUT          | Runtime env config (admin)         |
| `/api/cron/purge-activities`        | GET               | Scheduled activity cleanup         |
| `/api/health/supabase`              | GET               | Database connectivity check        |


Client-side storage keys map to these routes in `public/js/core/StorageService.js` (`REMOTE_ROUTES`). Per-route prefetch keys are in `public/js/prefetch-config.js`.

---



## Authentication & Roles

- **Middleware** (`middleware.js`) validates Supabase sessions on every request. Unauthenticated users are redirected to `/login`; authenticated users on auth pages are redirected to `/`.
- **API guards** (`lib/auth/guard.js`): `guardAuthenticated()`, `guardStaff()`, and `guardAdmin()` enforce access on route handlers.
- **MFA** — TOTP enrollment and verification via `/api/auth/mfa/`*; backup codes in `two_factor_backup_codes`.
- **Roles** (stored in `profiles.role`):


| Role          | Access                                                             |
| ------------- | ------------------------------------------------------------------ |
| `super_admin` | Full access, user management, all admin features                   |
| `admin`       | Site settings, SQL exports, user management, all CMS |
| `editor`      | CMS content CRUD                                                   |
| `viewer`      | Read-only dashboard                                                |


New users receive default rows in `profiles`, `notification_preferences`, and `security_settings` via database triggers. Passwords are managed by Supabase Auth — not stored in application tables.

OAuth / email-link flows complete at `/auth/callback`.

---



## Development Workflow



### Adding or changing UI on a page

1. Edit the HTML string in the relevant `app/<page>/bodyHtml.ts` (or shared files like `app/sidebarHtml.ts`, `app/bodyHtmlParts.ts`).
2. Edit behavior in the matching module under `client/modules/<feature>/`, then run `npm run build:client`.
3. If the change affects persisted data, update the API route in `app/api/<resource>/route.ts` and repository functions in `lib/cms/repository.ts`.
4. Run `npm run dev` and test the page; `LegacyBoot` re-initializes modules on each navigation.



### Adding a new CMS entity (high level)

1. Add PostgreSQL tables/migrations in `supabase/migrations/`.
2. Add repository functions in `lib/cms/repository.ts`.
3. Create `app/api/<entity>/route.ts` with `guardStaff()`.
4. Add a storage key mapping in `client/core/StorageService.ts` and prefetch config if needed.
5. Create `client/modules/<entity>/` module and register it in `client/main.ts` and `client/core/router.ts`, then `npm run build:client`.
6. Add `app/<entity>/page.tsx` + `bodyHtml.ts` and navigation links in `app/sidebarHtml.ts`.



### Path aliases

`tsconfig.json` maps `@/*` to the project root (e.g. `@/lib/auth/guard`).

### Code conventions

- **Server code** lives in `app/`, `lib/`, and `middleware.ts` (TypeScript).
- **Client source** lives in `client/` as TypeScript ES modules; `npm run build:client` compiles them to `public/js/` for the browser.
- **React** is used minimally — only for layout, HTML injection, and the legacy boot hook.
- Match existing patterns: extend `Module` for features, use `StorageService` for persistence, use `guardStaff()` on write routes.

---



## Maintenance Scripts

The `scripts/` folder contains **optional Node.js utilities** used during development to generate or bulk-edit HTML strings. These scripts are **not** part of the runtime build and are not referenced in `package.json`.


| Script                                  | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `scripts/gen-quick-add-html.js`         | Regenerate `app/quickAddPanelHtml.js`        |
| `scripts/split-body-html.js`            | Split `bodyHtml.js` into prefix/suffix parts |
| `scripts/gen-recent-activities-html.js` | Generate Recent Activities page HTML         |
| `scripts/add-recent-activities-nav.js`  | Add nav links across `bodyHtml.js` files     |
| `scripts/fix-contact-nav.js`            | Patch contact page navigation                |
| `scripts/fix-avatar-button.js`          | Convert avatar link to button across pages   |
| `scripts/update-user-menu.js`           | Update user dropdown menu across pages       |


Example:

```bash
node scripts/gen-quick-add-html.js
```

Deleting `scripts/` does not affect `npm run dev`, `build`, or `start`.

---



## Deployment

This is a standard Next.js 14 application. Deploy to any Node-compatible host (e.g. Vercel, Railway, Docker):

1. Set all [environment variables](#environment-variables) in the hosting provider.
2. Ensure Supabase migrations are applied to your production project (`npm run db:push`).
3. Set `NEXT_PUBLIC_SITE_URL` to your production URL.
4. Configure `CRON_SECRET` and schedule `/api/cron/purge-activities` if using activity retention.
5. Build and start:

```bash
npm run build
npm run start
```

Configure Supabase Auth redirect URLs to include your production domain and `/auth/callback`.

---



## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch:

```bash
git checkout -b feature/your-feature-name
```

1. Make changes and verify locally:

```bash
npm run dev
npm run build
```

1. Commit with a clear message:

```bash
git commit -m "feat: describe your change"
```

1. Push and open a Pull Request

For database changes, add a new timestamped migration in `supabase/migrations/` rather than editing applied migrations.

---



## License

This project is licensed under the [MIT License](LICENSE).

Copyright (c) 2026 Engineer Sohaib Ishaque

---



## Author

**Sohaib Ishaque**

Full Stack Developer · Software Engineer · UI/UX Designer