# TextTV

TextTV is a React, Vite, TypeScript and Tailwind CSS app. Supabase stores and broadcasts shared display text. Admin access uses a simple client-side PIN screen; it does not use Supabase Auth or a custom backend.

## Routes

- `/` admin sign-in and dashboard
- `/display` public fullscreen TV display

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [supabase/schema.sql](supabase/schema.sql). It creates the shared text row, public read/write policies, and realtime setup. If the table already exists, run it again to add the `font_size` column.
3. Copy `.env.example` to `.env.local`. Set the project URL and publishable/anon key from Supabase project settings, and choose a `VITE_ADMIN_PIN`.
4. Restart the dev server after changing environment variables.

**Security warning:** the PIN is bundled into the public frontend, so it is only a casual screen lock. Anyone who can inspect the app can discover/bypass it, and the database policies allow unauthenticated writes. Do not use this setup for sensitive content or expose it where write access must be protected. Secure PIN authorization requires server-side validation (for example, a Supabase Edge Function); client-only PIN checks cannot secure database writes.

## Run locally

```bash
npm install
npm run dev
```

Vite serves the app on `http://localhost:5173`. The `/display` screen can be opened on any device that can reach the deployed app. For production, run `npm run build` and deploy the generated `dist/` directory to any static host. Vercel's rewrite configuration supports the `/display` route.

The admin dashboard's **Display font size** slider adjusts the TV text from 50% to 200%. Click **Update Display** to save the text and size to Supabase; connected displays receive both values in realtime.
