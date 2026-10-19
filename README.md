# Talent Thread

Talent Thread is an India-first marketplace for freelance graphic and UX/UI designers.

- **Designers** upload their work and get an AI portfolio review: a score from 0 to 100, specific feedback on each piece, and a skill roadmap with weekly tasks.
- **Clients** post jobs (the AI helps write the brief), see applicants ranked by fit, and hire.
- **Money moves through milestone escrow.** The client pays each milestone into escrow through Razorpay before work starts. The designer is paid when the client approves, or automatically after 5 days of silence. Either side can raise a dispute.
- **Admins** resolve disputes, record payouts to designers, moderate users and jobs, and spot-check AI reviews.

It's built with Next.js (the website), Supabase (database, logins and file storage), Anthropic's Claude (the AI) and Razorpay (payments). It's designed to run on Vercel.

---

## 1. What you need

Create free accounts on:

1. **Supabase**: [supabase.com](https://supabase.com). Create a new project and pick the Mumbai region (`ap-south-1`).
2. **Anthropic**: [console.anthropic.com](https://console.anthropic.com). Add a payment method, because AI reviews are billed per use.
3. **Razorpay**: [dashboard.razorpay.com](https://dashboard.razorpay.com). You can use Test Mode straight away, before KYC is done.
4. **Vercel**: [vercel.com](https://vercel.com). Sign in with GitHub.

## 2. Settings (environment variables)

The app reads its keys from environment variables. Copy `.env.example` to `.env.local` on your computer, or add each one in **Vercel → your project → Settings → Environment Variables**.

| Name | What it's for | Where to find it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your database address | Supabase → Project Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key used by browsers | Supabase → Project Settings → API → **anon / public** key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key the server uses for money and admin actions. **Never share it.** | Supabase → Project Settings → API → **service_role** key |
| `ANTHROPIC_API_KEY` | AI portfolio reviews and job briefs | Anthropic Console → **API Keys** → Create key |
| `REVIEW_SAMPLES` | How many times each portfolio is scored (1 to 3, default **1**). The middle score is kept. 3 is steadier but costs about 3 times as much. | You choose |
| `RAZORPAY_KEY_ID` | Opens Razorpay Checkout | Razorpay → Account & Settings → **API Keys** → Generate key (starts with `rzp_test_` in test mode) |
| `RAZORPAY_KEY_SECRET` | Creates orders and checks payments | Shown once, next to the Key ID, when you generate it |
| `RAZORPAY_WEBHOOK_SECRET` | Confirms that payment messages really come from Razorpay | The secret **you type** when you create the webhook (see section 5) |
| `CRON_SECRET` | Protects the daily auto-approve job | Make one up: any long random string (for example from a password generator) |
| `NEXT_PUBLIC_APP_URL` | The app's own address, used in links | `http://localhost:3000` on your computer; your Vercel address (like `https://talentthread.vercel.app`) when live |

Until the Supabase keys are added, the site shows a yellow notice saying it isn't connected yet. Without the Razorpay keys, the "Fund" button shows a clear error instead of opening Checkout.

## 3. Set up the database

The database structure lives in `supabase/migrations/`. Run the files **in order**:

1. `0001_init.sql`: all tables, security rules and file storage buckets.
2. `0002_realtime.sql`: turns on live chat and live notifications.

**Option A: Supabase website (easiest).** Open your project, go to **SQL Editor → New query**, paste the whole of `0001_init.sql`, and click **Run**. Then do the same with `0002_realtime.sql`.

**Option B: command line.** If you have the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Then, in Supabase, go to **Authentication → URL Configuration**. Set **Site URL** to your `NEXT_PUBLIC_APP_URL`, and add `https://YOUR-APP/auth/callback` to **Redirect URLs** so sign-up and password-reset emails work.

## 4. Make yourself an admin

Sign up on the site as normal. Then, in Supabase **SQL Editor**, run this with your own email:

```sql
update profiles set role = 'admin', onboarded = true where id = (select id from auth.users where email = 'you@example.com');
```

Log out and in again, and you'll land on the admin panel at `/admin`. After that you can promote other people from **Admin → Users → Make admin**.

## 5. Payments with Razorpay

**Test mode first.** With `rzp_test_` keys, no real money moves. In Checkout, use Razorpay's test details, for example card `4111 1111 1111 1111` with any future expiry and any CVV, or UPI ID `success@razorpay`.

**The webhook** is a backup that marks a milestone as funded even if the client closes the browser straight after paying.

1. Razorpay → Account & Settings → **Webhooks** → **Add New Webhook**.
2. Webhook URL: `https://YOUR-APP/api/webhooks/razorpay`
3. Secret: type a long random string, and put the same string in `RAZORPAY_WEBHOOK_SECRET`.
4. Active events: tick **payment.captured** and **order.paid**.

It's safe if both the browser and the webhook report the same payment: it's only counted once.

**Fees** (in `src/lib/money.ts`): clients pay a 3% platform fee plus 18% GST on that fee. Designers pay 10% commission (5% when the same client hires them again) and 0.1% TDS. Every breakdown is shown before anyone pays.

**Going live:** finish Razorpay KYC, generate **Live** keys, and replace the test keys in Vercel. Create the webhook again in Live mode with its own secret.

## 6. Deploy to Vercel

1. Push this code to a GitHub repository.
2. In Vercel, click **Add New → Project**, and import the repository. The framework is detected as Next.js.
3. Add every variable from section 2 under **Environment Variables**, then click **Deploy**.
4. Once it's live, update `NEXT_PUBLIC_APP_URL` and the Supabase Site URL to the real address, then redeploy.

**Daily auto-approve job.** `vercel.json` tells Vercel to call `/api/cron/auto-approve` once a day (09:00 IST). It releases milestones whose 5-day review window has passed. Vercel sends `CRON_SECRET` automatically, so make sure it's set. The free Hobby plan only allows daily jobs, so a milestone can be released up to a day after its 5 days are up.

## 7. Running it on your computer

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 8. What isn't built yet

- **Subscription billing.** Designer Pro (₹499/month) and client Growth (₹2,999/month) are shown on the pricing page, but nobody can be charged for them yet. Plans can be changed by hand in Supabase (`designer_profiles.plan`, `client_profiles.plan`).
- **Automated payouts through RazorpayX.** When work is approved, a payout is created with the designer's net amount. An admin sends the money by UPI or bank transfer, then clicks **Mark payout as paid** in **Admin → Payments** with the UTR or reference number.
- **Email delivery.** Notifications appear inside the app (the bell icon) but aren't emailed yet. Supabase still sends its own sign-up and password-reset emails. `src/lib/notify.ts` is the place to add an email service such as Resend.

## Where things live (for developers)

- `supabase/migrations/`: schema, row-level security, storage buckets.
- `src/lib/escrow.ts`: every contract and money state change.
- `src/lib/ai/`: the review rubric and the AI calls.
- `src/app/(shared)/contracts/[id]`: the contract workspace (milestones, Checkout, submissions, chat).
- `src/app/admin`: the admin panel.
- `src/app/api`: the Razorpay webhook and the daily cron.
