# Supabase Database Setup

PostgreSQL schema for the Portfolio Admin Dashboard — CMS content, settings, auth profiles, media storage, activity logs, and SQL export metadata.

## Migrations

All schema changes live in `supabase/migrations/` (35 timestamped SQL files). Apply them in filename order.

| Migration | Purpose |
|-----------|---------|
| `20260906120000_initial_schema.sql` | Core tables, enums, RLS, storage bucket, signup trigger |
| `20260906120001_seed_defaults.sql` | Default site, site settings, categories |
| `20260906120002_site_settings_extras.sql` | `site_settings.appearance_settings` JSON, contact column prefs, profile fields |
| `20260907120000_tools.sql` | `tool_categories`, `tool_items` |
| `20260908120000_login_activity.sql` | `login_activity` event log |
| `20260908140000_media_assets_url_hash.sql` | Media URL deduplication |
| `20260908150000_media_assets_source.sql` | Media source tracking |
| `20260910120000_recent_activities.sql` | `recent_activities` audit log |
| `20260910120001_seed_recent_activities.sql` | **No-op** (demo activity seed removed) |
| `20260910130000_clear_recent_activities.sql` | **No-op** (was paired with demo activity seed) |
| `20260910140000_recent_activities_retention.sql` | Retention helpers |
| `20260925160000_drop_integrations_table.sql` | Drops `integrations` table and `integration_provider` enum (feature removed) |
| `20260914120000_categories_builtin_subset.sql` | Built-in category flags |
| `20260915180000` | Tool category restore |
| `20260916120000_blog_categories.sql` | `blog_categories` |
| `20260916140000` – `20260916180000` | Blog/tool category schema tweaks |
| `20260916210000_seed_portfolio_projects.sql` | **No-op** (demo project/media seed removed) |
| `20260917180000_contact_message_replies.sql` | `contact_message_replies` |
| `20260918120000_media_folder_contact.sql` | Contact media folder enum |
| `20260918130000_user_notifications.sql` | `user_notifications` inbox |
| `20260918220000_drop_categories_css_class.sql` | Category schema cleanup |
| `20260921120000_admin_system_helpers.sql` | Admin RPC helpers |
| `20260921130000_admin_storage_stats.sql` | Storage stats RPC (later replaced) |
| `20260921140000_admin_sql_backup_helpers.sql` | FK edges + table catalog RPCs |
| `20260921150000_drop_metrics_add_table_stats.sql` | `pa_admin_public_table_stats` RPC |
| `20260922120000_drop_user_preferences_appearance_settings.sql` | Drop unused per-user pref/theme tables |

## Quick start

**Linked project:** `Portfolio Dashboard` (`nikuxddhvpfvnckmvznb`, region `ap-south-1`)

```bash
npm run db:status    # list applied migrations
npm run db:push      # push pending migrations to linked project
```

Test the Next.js connection:

```bash
npm run dev
# open http://localhost:3000/api/health/supabase
```

Content is managed through the dashboard UI — no demo seed scripts are required beyond the default site row.

### New Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. Install the CLI: `npm install -g supabase`
3. Link and push:

```bash
cd Portfolio-Dashboard
supabase login
supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

Or run each migration file in order via **Supabase Dashboard → SQL Editor**.

### Environment variables (Next.js)

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Schema overview

### Core

| Table / view | Feature |
|--------------|---------|
| `sites` | Root tenant (`slug = 'default'`) |
| `profiles` | Staff users — extends `auth.users` with role and profile fields |
| `site_settings` | Site-wide config (General settings tab). Includes `appearance_settings` JSON for theme/UI and `contact_message_columns` JSON for inbox column visibility |
| `notification_preferences` | Settings → Notifications (per user) |
| `security_settings` | Settings → Security (2FA flags, per user) |
| `two_factor_backup_codes` | Hashed MFA backup codes |
| `login_activity` | Login / logout / failed attempt history (Settings → Security) |
| `user_sessions` | Session rows written on login/logout (companion to `login_activity`) |
| `backup_snapshots` | SQL export audit metadata (System tab; no files stored on disk) |
| `user_notifications` | In-app notification inbox (bell icon) |
| `dashboard_stats` | **View** — aggregated counts for the dashboard home page |

> **Removed tables:** `user_preferences` and `appearance_settings` (standalone per-user tables) were dropped in migration `20260922120000`. Theme data lives in `site_settings.appearance_settings`; UI column prefs live in `site_settings.contact_message_columns`.

### CMS content

| Table | Page |
|-------|------|
| `categories` | `/categories` |
| `projects` + `project_tags` + `project_gallery_images` | `/projects` |
| `tags` (via `project_tags` API) | `/tags` |
| `technologies` | `/technologies` |
| `tool_categories` + `tool_items` | `/tool-categories`, `/tools` |
| `blog_categories` | `/blog-categories` |
| `blog_posts` + `blog_post_tags` | `/blog-post` |
| `media_assets` | `/media-library` |
| `testimonials` | `/testimonials` |
| `experience_entries` | `/experience` |
| `contact_messages` + `contact_message_replies` | `/contact-messages` |
| `recent_activities` | `/recent-activities` |

### Admin RPCs (service role)

| Function | Purpose |
|----------|---------|
| `pa_admin_public_tables()` | List public tables for SQL export UI |
| `pa_admin_public_table_stats()` | Row counts and on-disk size per table |
| `pa_admin_foreign_key_edges()` | FK graph for ordered SQL dumps |

## Auth & roles

Uses **Supabase Auth** (`auth.users`). Passwords are managed by Supabase — not stored in `public` tables.

| Role | Access |
|------|--------|
| `super_admin` | Full access, user management, all admin features |
| `admin` | Site settings, SQL exports, user management, all CMS |
| `editor` | CMS content CRUD |
| `viewer` | Read-only dashboard |

Promote your first admin after signup:

```sql
update public.profiles
set role = 'super_admin'
where email = 'your@email.com';
```

New users automatically receive rows in `profiles`, `notification_preferences`, and `security_settings` via the `handle_new_user` trigger on `auth.users`.

## Storage

Migration creates a public **`media`** bucket (10 MB limit, images only).

Upload path convention:

```
media/{site_id}/{folder}/{filename}
```

Link `media_assets.storage_path` to the bucket object path; store the public URL in `media_assets.url`.

## RLS summary

| Data | Public read | Staff write | Admin only |
|------|-------------|-------------|------------|
| Projects, tech, experience, testimonials, media | Yes | Yes | — |
| Blog posts | Published only | Yes (all) | — |
| Contact messages | Insert only | Manage | — |
| Site settings | Yes | — | Write |
| Backups | — | — | Yes |
| Profile, notifications, security | Own row | Own row | Admins see all |
| Login activity | Own rows | — | Admins insert/update |

## Migration from browser storage

`legacy_id` columns on CMS tables map old IndexedDB numeric IDs during import.

Suggested import order:

1. Categories
2. Media assets (upload files to storage first)
3. Projects (+ tags, gallery)
4. Technologies, experience, testimonials, blog posts, blog categories
5. Tool categories and items
6. Contact messages
7. Site settings (general + appearance JSON)

## Local development

```bash
supabase start
supabase db reset   # applies all migrations + seed
```

Supabase Studio: `http://localhost:54323`
