const PUBLIC_POSTHOG_TOKEN =
  process.env.POSTHOG_PROJECT_TOKEN ||
  process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  'phc_zxqkRuozevzA8pwEzoRipcA43FdbaCzqZsnPB3Bnb277';
const POSTHOG_HOST =
  process.env.POSTHOG_HOST ||
  process.env.NEXT_PUBLIC_POSTHOG_HOST ||
  'https://us.i.posthog.com';

const args = Object.fromEntries(
  process.argv.slice(2).map((entry) => {
    const [key, ...parts] = entry.replace(/^--/, '').split('=');
    return [key, parts.length ? parts.join('=') : true];
  }),
);

const visitorCount = Math.min(100, Math.max(1, Number(args.visitors || 32)));
const siteUrl = String(args.site || process.env.SITE_URL || 'https://stanford-kz.github.io/');
const dryRun = Boolean(args['dry-run']);
const runId = `demo-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

const tutors = [
  { id: 'maya-patel', name: 'Maya Patel', subjects: ['Algebra', 'Geometry', 'Physics'], rate: 48, weight: 0.34 },
  { id: 'jordan-lee', name: 'Jordan Lee', subjects: ['English', 'Essay Writing', 'Reading'], rate: 44, weight: 0.29 },
  { id: 'sofia-ortiz', name: 'Sofia Ortiz', subjects: ['Biology', 'Chemistry', 'Study Skills'], rate: 52, weight: 0.21 },
  { id: 'ethan-brooks', name: 'Ethan Brooks', subjects: ['History', 'SAT Prep', 'Study Skills'], rate: 40, weight: 0.16 },
];

let randomState = 20260903;
function random() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 4294967296;
}

function pickTutor() {
  const roll = random();
  let cumulative = 0;
  for (const tutor of tutors) {
    cumulative += tutor.weight;
    if (roll <= cumulative) return tutor;
  }
  return tutors[tutors.length - 1];
}

function eventAt(visitorIndex, stepOffsetSeconds) {
  const ageMilliseconds = ((visitorIndex % 7) * 24 * 60 * 60 * 1000) + Math.floor(random() * 16 * 60 * 60 * 1000);
  return new Date(Date.now() - ageMilliseconds + stepOffsetSeconds * 1000).toISOString();
}

const parsedSiteUrl = new URL(siteUrl);
const events = [];
const summary = {
  pageviews: 0,
  profileViews: 0,
  bookingStarts: 0,
  bookings: 0,
  byTutor: Object.fromEntries(tutors.map((tutor) => [tutor.name, { profileViews: 0, bookings: 0 }])),
};

for (let index = 0; index < visitorCount; index += 1) {
  const distinctId = `${runId}-visitor-${String(index + 1).padStart(2, '0')}`;
  const baseProperties = {
    distinct_id: distinctId,
    demo_data: true,
    simulation_run_id: runId,
    traffic_source: 'assessment simulator',
    $current_url: siteUrl,
    $host: parsedSiteUrl.host,
    $pathname: parsedSiteUrl.pathname,
  };

  events.push({ event: '$pageview', properties: baseProperties, timestamp: eventAt(index, 0) });
  summary.pageviews += 1;

  if (random() > 0.84) continue;
  const tutor = pickTutor();
  const subject = tutor.subjects[Math.floor(random() * tutor.subjects.length)];
  const tutorProperties = {
    ...baseProperties,
    tutor_id: tutor.id,
    tutor_name: tutor.name,
    subjects: tutor.subjects,
    hourly_rate_usd: tutor.rate,
  };

  events.push({
    event: 'tutor profile viewed',
    properties: { ...tutorProperties, source: 'tutor directory', available_slot_count: 3 },
    timestamp: eventAt(index, 45),
  });
  summary.profileViews += 1;
  summary.byTutor[tutor.name].profileViews += 1;

  if (random() > 0.62) continue;
  const weekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'][Math.floor(random() * 5)];
  const timeBucket = weekday === 'Saturday' ? 'weekend' : random() > 0.5 ? 'evening' : 'afternoon';
  events.push({
    event: 'booking started',
    properties: { ...tutorProperties, subject, source: 'profile', profile_viewed_in_session: true },
    timestamp: eventAt(index, 95),
  });
  summary.bookingStarts += 1;

  if (random() > 0.67) continue;
  events.push({
    event: 'booking request submitted',
    properties: {
      ...tutorProperties,
      subject,
      slot_day_of_week: weekday,
      slot_time_bucket: timeBucket,
      notification_channel: random() > 0.25 ? 'email' : 'text',
      profile_viewed_in_session: true,
    },
    timestamp: eventAt(index, 160),
  });
  summary.bookings += 1;
  summary.byTutor[tutor.name].bookings += 1;
}

async function verifySite() {
  const response = await fetch(siteUrl, { headers: { 'User-Agent': 'ABC-Tutoring-Demo-Traffic/1.0' } });
  if (!response.ok) throw new Error(`Site returned HTTP ${response.status}: ${siteUrl}`);
}

async function sendBatch(batch) {
  const response = await fetch(`${POSTHOG_HOST.replace(/\/$/, '')}/batch/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: PUBLIC_POSTHOG_TOKEN, batch }),
  });
  if (!response.ok) throw new Error(`PostHog returned HTTP ${response.status}`);
}

if (!PUBLIC_POSTHOG_TOKEN.startsWith('phc_')) {
  throw new Error('Use a public PostHog project token beginning with phc_.');
}

if (!dryRun) {
  await verifySite();
  for (let index = 0; index < events.length; index += 50) {
    await sendBatch(events.slice(index, index + 50));
  }
}

console.log(JSON.stringify({
  mode: dryRun ? 'dry-run' : 'sent',
  site: siteUrl,
  runId,
  visitors: visitorCount,
  events: events.length,
  funnel: summary,
}, null, 2));
