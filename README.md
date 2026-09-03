# ABC Tutoring prototype

A friendly, static tutoring marketplace prototype for Dana. Families can filter and compare tutors, read full profiles, choose an available time, and submit a booking request. Confirmed bookings are stored in `localStorage`, so the chosen time becomes unavailable in that browser.

## PostHog measurement

The prototype records pageviews and these privacy-safe custom events:

- `tutor profile viewed`
- `tutor directory filtered`
- `booking started`
- `booking time selected`
- `booking request submitted`
- `booking request blocked`

Tutor IDs, public tutor names, subjects, hourly rates, and coarse time categories are included. Parent names, student names, email addresses, phone numbers, grades, and free-text goals are never sent to PostHog. Autocapture and session recording are disabled.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` if you want to override the bundled public PostHog project token or host.

## GitHub Pages

The Pages workflow creates a static export from `main`. In the GitHub repository settings, set Pages to **GitHub Actions**. The workflow supports these optional repository settings:

- Secret `POSTHOG_PROJECT_TOKEN`
- Variable `POSTHOG_HOST`
- Secret `BOOKING_WEBHOOK_URL` for a secure notification service

Without a notification webhook, the prototype clearly displays a notification preview rather than claiming an email or text was delivered.

## Suggested PostHog dashboard

Create a dashboard named **ABC Tutoring - Visitor & Booking Overview** with:

1. Unique visitors (`$pageview`)
2. Tutor profile views broken down by `tutor_name`
3. A sequential funnel: `tutor profile viewed` -> `booking started` -> `booking request submitted`
4. Booking requests broken down by `tutor_name`

Enable public access from the dashboard’s **Share** menu, then use that link in the assessment submission.

## Demo traffic

The included simulator creates synthetic, labeled traffic and a realistic view-to-booking funnel without names, emails, phone numbers, or student details:

```bash
npm run simulate:traffic -- --site=https://stanford-kz.github.io/ --visitors=32
```

Use `--dry-run` to preview the event counts without sending them. Every simulated event includes `demo_data: true` and a `simulation_run_id` so it can be filtered or removed from customer-facing analysis later.
