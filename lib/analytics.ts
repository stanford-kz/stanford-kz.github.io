import posthog from 'posthog-js';

const publicProjectToken =
  process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ||
  'phc_zxqkRuozevzA8pwEzoRipcA43FdbaCzqZsnPB3Bnb277';
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === 'undefined' || !publicProjectToken.startsWith('phc_')) return;

  posthog.init(publicProjectToken, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
    person_profiles: 'identified_only',
    mask_all_text: true,
    mask_all_element_attributes: true,
    loaded: () => {
      initialized = true;
    },
  });
}

export function capture(eventName: string, properties: Record<string, unknown> = {}) {
  if (!initialized || typeof window === 'undefined') return;
  posthog.capture(eventName, properties);
}
