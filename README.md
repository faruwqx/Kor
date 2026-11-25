# Kor

Strength-training tracker with a rank for each muscle group. A web app (PWA) you can install on your phone and use offline. Your data stays on the device; optionally it is backed up to the cloud with an account.

## Running

```
npm install
npm run dev        # development, http://localhost:5173
npm run build      # build, output in the dist/ folder
npm run preview    # built version, http://localhost:4173
npx vitest run     # tests
```

If opened with `?demo=1` (for example `http://localhost:4173/?demo=1`) and nothing has been set up yet, it starts with 14 weeks of sample data. Sample data is removed from the Profile screen.

## Installing on a phone

The `dist/` folder is made of static files; it can be uploaded anywhere that serves over HTTPS (Netlify, Vercel, GitHub Pages, Cloudflare Pages). On the phone, open the address and choose "Add to Home Screen" from the browser menu. The service worker only runs over HTTPS or `localhost`; at a home-network `http://192.168...` address the app opens but does not work offline and cannot be installed.

## How rank is calculated

1. From each working set, an estimated one-rep max (1RM) is derived: `weight × (1 + reps / 30)`. Sets above 12 reps and warm-up sets do not count.
2. The 1RM is divided by body weight. For moves like pull-ups and dips, the load is body weight plus added weight.
3. The ratio falls between 0 and 2100 RP against the move's own standard. The scale is not linear (`RANK_CURVE = 0.7`, `src/lib/rank.ts`): lower and middle tiers open earlier, while the Kor threshold stays fixed. Standards are in `src/lib/exercises.ts` (`start` is the bottom of the ladder, `elite` is the Kor threshold). For women, upper body is multiplied by 0.60 and lower body by 0.75.
4. There are eight tiers: Coal, Iron, Bronze, Silver, Gold, Platinum, Diamond, Kor. The first seven have three steps each, and each step is 100 RP. 2100 RP and above is Kor.
5. A muscle group's rank is set by that group's highest-RP move. The overall rank is the average of ranked groups and requires at least four groups.

The standards are this app's own table; they are not a comparison with other users or a percentile. Moves without a standard (most machines and user-added moves) are recorded but do not count toward rank.

## Structure

- `src/lib/` — logic: `rank.ts` (rank calculation), `stats.ts` (volume, records, streak), `store.ts` (state and `localStorage`), `exercises.ts` (move library), `demo.ts` (sample data), `cloud.ts` and `cloud-core.ts` (account, backup, Premium entitlement), `pricing.ts` (regional pricing).
- `supabase/schema.sql` — database tables and security rules.
- `src/screens/` — screens: Today, workout logging, Rank, muscle group, move, History, workout summary, Profile, routine editing.
- `src/ui/` — logo, charts, shared components.
- `public/sw.js` — offline cache.

Data is kept in `localStorage` under the `kor:v1` key. A JSON backup is exported and restored from the Profile screen.

## Account, backup and Premium

The account layer runs on Supabase and is optional: with no keys in `.env.local`, the app works on-device only and the account section is hidden.

Setup:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the full `supabase/schema.sql` file.
3. Copy `.env.example` to `.env.local`; fill in the project URL and the `anon` key from Project Settings > API. Never put the `service_role` key in this file or in the code.
4. Authentication > URL Configuration: add the app's address to Site URL and Redirect URLs (in development, `http://localhost:5173`).
5. Authentication > Providers:
   - **Email** is enabled by default.
   - **Google**: create an OAuth client in the Google Cloud Console and enter the client ID and secret in Supabase. It is free.
   - **Apple**: requires an Apple Developer membership. After setting it up, set `VITE_AUTH_APPLE=1` in `.env.local`; until then the button is hidden.

Security: the `anon` key in the browser is public. The data is protected by the row-level security rules in `schema.sql`: everyone reads and writes only their own row, and the subscription table cannot be written from the browser.

Sync: all data is stored as a single document per user in the `user_data` table. If two devices change it at the same time, records are merged; because deletions are not tracked, a workout deleted on one device can come back from the other. The rules are in `src/lib/cloud-core.ts`, along with their tests.

Premium: the entitlement is read from the `subscriptions` table. A 7-day trial starts without a card via `start_trial()`. **Premium is currently free for everyone during launch — every feature is unlocked.** This is controlled by the `PREMIUM_FOR_EVERYONE` flag in `src/lib/cloud-core.ts`; set it to `false` to return to normal subscription behavior. Payment is not connected yet: while `VITE_CHECKOUT_URL` is empty, the purchase button says so. When a payment provider is connected, its webhook must update the `subscriptions` row with the `service_role` key (on the server).

Locks are in the interface: because analysis is computed from on-device data, a determined user can get past a lock. What is enforced on the server is the entitlement itself.

Pricing lives in `src/lib/pricing.ts` and is for display only; the same table must also be defined in the payment provider. While Premium is free for everyone, these prices are not shown in the app.

## Exercise frames

The move frames under `public/moves/` were taken from the public-domain (Unlicense)
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) dataset and downscaled.
Each move has a start and end frame; they play as a loop on the move page.
