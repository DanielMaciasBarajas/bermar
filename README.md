# Beramar Community Platform

White-label multi-tenant SaaS platform for residential communities.
Beramar — Av. d'Europa 6 & 8, Gavà Mar, 08850 Barcelona — Tenant #001.

---

## Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind — Vercel (region: cdg1 Paris)
- **Backend**: Supabase — Postgres + RLS + Auth + Storage — EU West Ireland (GDPR)
- **Notifications**: In-app + email (Resend). WhatsApp via Twilio (maintenance).
- **AI**: Anthropic Claude API — Community Voice auto-posts

---

## Setup

### 1. Supabase

1. New project at supabase.com → Region: EU West (Ireland)
2. SQL Editor → run entire contents of `supabase/schema.sql`
3. Authentication → Providers → enable Google OAuth
4. Storage → create buckets: avatars, marketplace, projects, banners (public); documents, maintenance (private)
5. Copy URL + anon key from Settings → API

### 2. Environment

```bash
cp .env.local.example .env.local
# Fill in all values
```

### 3. Run

```bash
npm install && npm run dev
```

### 4. Deploy

```bash
npx vercel
# Set env vars in Vercel dashboard
```

### 5. Edge functions (birthday cron)

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy check-birthdays --no-verify-jwt
```

### 6. First SA account

1. Register at /auth/register with any apartment number
2. Supabase → Table editor → profiles → set role='sa' and approved=true
3. Refresh — full SA access unlocked

---

## After deploy — fill in Beramar config

```sql
update communities set
  moha_whatsapp = '+34 6XX XXX XXX',
  liaison_email = 'liaison@admincompany.com',
  liaison_whatsapp = '+34 6XX XXX XXX',
  admin_company_name = 'Fincas XXX',
  admin_company_emergency_phone = '+34 9XX XXX XXX',
  banner_url = 'https://your-banner-image.jpg'
where slug = 'beramar';
```

---

## Modules

| Module | Route |
|--------|-------|
| Registration (5 steps) | /auth/register |
| Login | /auth/login |
| Dashboard | /dashboard |
| Book & invite | /booking |
| Events (Upcoming/Live/Past) | /events |
| Proposals | /proposals |
| Marketplace | /marketplace |
| Documents | /documents |
| Ongoing Projects | /projects |
| Building Directory (9x10) | /directory |
| Maintenance + WhatsApp auto-route | /maintenance |
| Admin (Warnings / Config / SA) | /admin |
| Community Voice API | /api/community-voice |
| Maintenance notify API | /api/maintenance/notify |
| Birthday cron | supabase/_functions/check-birthdays |

---

## Design

- Pine: #1a3d2b · Gold: #b8922a · Sand: #f4efe6
- Fonts: DM Serif Display (headings) + DM Sans (body)

---

## Roadmap

1. Push notifications — PWA service worker (v2, post-launch priority)
2. Google Calendar sync on booking confirmation
3. PDF poster generation for Marketplace listings
4. Realtime activity feed via Supabase realtime
5. GDPR account deletion in profile settings
6. Audit log — tamper-evident admin actions
7. C2C inter-community federation (joint events, sport challenges)

---

Beramar · June 2026 · Ready to build.
