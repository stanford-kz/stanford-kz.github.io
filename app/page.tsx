'use client';

import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { capture, initAnalytics } from '../lib/analytics';

type Slot = {
  id: string;
  label: string;
  weekday: string;
  timeBucket: 'afternoon' | 'evening' | 'weekend';
};

type Tutor = {
  id: string;
  initials: string;
  name: string;
  pronouns: string;
  subjects: string[];
  rate: number;
  grades: string;
  experience: string;
  bio: string;
  approach: string;
  credential: string;
  color: string;
  slots: Slot[];
};

type BookingRecord = {
  id: string;
  tutorId: string;
  slotId: string;
  subject: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  studentName: string;
  grade: string;
  goals: string;
  notificationChannel: 'email' | 'text';
  createdAt: string;
};

type Confirmation = {
  tutor: Tutor;
  slot: Slot;
  channel: 'email' | 'text';
  delivery: 'preview' | 'sent' | 'failed';
};

const STORAGE_KEY = 'abc-tutoring-bookings-v1';
const notificationWebhook = process.env.NEXT_PUBLIC_BOOKING_WEBHOOK_URL?.trim();

const TUTORS: Tutor[] = [
  {
    id: 'maya-patel',
    initials: 'MP',
    name: 'Maya Patel',
    pronouns: 'she/her',
    subjects: ['Algebra', 'Geometry', 'Physics'],
    rate: 48,
    grades: 'Grades 7-12',
    experience: '6 years tutoring',
    bio: 'Maya helps students turn intimidating problems into small, workable steps. She is especially good with learners rebuilding confidence in math.',
    approach: 'Patient, visual, and practice-led',
    credential: 'M.S. Applied Mathematics',
    color: 'mint',
    slots: [
      { id: 'maya-mon-4', label: 'Monday · 4:00 PM', weekday: 'Monday', timeBucket: 'afternoon' },
      { id: 'maya-wed-530', label: 'Wednesday · 5:30 PM', weekday: 'Wednesday', timeBucket: 'evening' },
      { id: 'maya-sat-10', label: 'Saturday · 10:00 AM', weekday: 'Saturday', timeBucket: 'weekend' },
    ],
  },
  {
    id: 'jordan-lee',
    initials: 'JL',
    name: 'Jordan Lee',
    pronouns: 'they/them',
    subjects: ['English', 'Essay Writing', 'Reading'],
    rate: 44,
    grades: 'Grades 5-12',
    experience: '5 years tutoring',
    bio: 'Jordan makes reading and writing feel approachable. Students leave sessions with a clear plan, stronger ideas, and language that still sounds like them.',
    approach: 'Encouraging, structured, and collaborative',
    credential: 'B.A. English & Education',
    color: 'peach',
    slots: [
      { id: 'jordan-tue-4', label: 'Tuesday · 4:00 PM', weekday: 'Tuesday', timeBucket: 'afternoon' },
      { id: 'jordan-thu-6', label: 'Thursday · 6:00 PM', weekday: 'Thursday', timeBucket: 'evening' },
      { id: 'jordan-fri-430', label: 'Friday · 4:30 PM', weekday: 'Friday', timeBucket: 'afternoon' },
      { id: 'jordan-sun-11', label: 'Sunday · 11:00 AM', weekday: 'Sunday', timeBucket: 'weekend' },
    ],
  },
  {
    id: 'sofia-ortiz',
    initials: 'SO',
    name: 'Sofia Ortiz',
    pronouns: 'she/her',
    subjects: ['Biology', 'Chemistry', 'Study Skills'],
    rate: 52,
    grades: 'Grades 8-12',
    experience: '7 years tutoring',
    bio: 'Sofia connects science concepts to everyday examples, then builds the study routines students need to remember and apply what they learn.',
    approach: 'Curious, practical, and concept-first',
    credential: 'M.Ed. Science Education',
    color: 'sky',
    slots: [
      { id: 'sofia-mon-6', label: 'Monday · 6:00 PM', weekday: 'Monday', timeBucket: 'evening' },
      { id: 'sofia-thu-430', label: 'Thursday · 4:30 PM', weekday: 'Thursday', timeBucket: 'afternoon' },
      { id: 'sofia-sat-1', label: 'Saturday · 1:00 PM', weekday: 'Saturday', timeBucket: 'weekend' },
    ],
  },
  {
    id: 'ethan-brooks',
    initials: 'EB',
    name: 'Ethan Brooks',
    pronouns: 'he/him',
    subjects: ['History', 'SAT Prep', 'Study Skills'],
    rate: 40,
    grades: 'Grades 6-12',
    experience: '4 years tutoring',
    bio: 'Ethan helps students organize big assignments and test prep into realistic weekly goals, with plenty of context and low-pressure practice.',
    approach: 'Calm, organized, and goal-oriented',
    credential: 'B.A. History',
    color: 'lavender',
    slots: [
      { id: 'ethan-tue-530', label: 'Tuesday · 5:30 PM', weekday: 'Tuesday', timeBucket: 'evening' },
      { id: 'ethan-wed-4', label: 'Wednesday · 4:00 PM', weekday: 'Wednesday', timeBucket: 'afternoon' },
      { id: 'ethan-sun-2', label: 'Sunday · 2:00 PM', weekday: 'Sunday', timeBucket: 'weekend' },
    ],
  },
];

const ALL_SUBJECTS = Array.from(new Set(TUTORS.flatMap((tutor) => tutor.subjects))).sort();

function readBookings(): BookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('All subjects');
  const [rateFilter, setRateFilter] = useState('Any rate');
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [notificationChannel, setNotificationChannel] = useState<'email' | 'text'>('email');
  const [formError, setFormError] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [storageNotice, setStorageNotice] = useState('');
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const viewedTutors = useRef(new Set<string>());

  useEffect(() => {
    initAnalytics();
    const syncBookings = () => setBookings(readBookings());
    const initialSync = window.setTimeout(syncBookings, 0);
    window.addEventListener('storage', syncBookings);
    return () => {
      window.clearTimeout(initialSync);
      window.removeEventListener('storage', syncBookings);
    };
  }, []);

  useEffect(() => {
    const modalOpen = Boolean(selectedTutor || bookingTutor || confirmation);
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelectedTutor(null);
      setBookingTutor(null);
      setConfirmation(null);
      window.setTimeout(() => lastTrigger.current?.focus(), 0);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedTutor, bookingTutor, confirmation]);

  const bookedSlotKeys = useMemo(
    () => new Set(bookings.map((booking) => `${booking.tutorId}:${booking.slotId}`)),
    [bookings],
  );

  const availableSlots = (tutor: Tutor) =>
    tutor.slots.filter((slot) => !bookedSlotKeys.has(`${tutor.id}:${slot.id}`));

  const visibleTutors = useMemo(() => {
    const maxRate = rateFilter === 'Any rate' ? Infinity : Number(rateFilter);
    return TUTORS.filter((tutor) => {
      const matchesSubject = subjectFilter === 'All subjects' || tutor.subjects.includes(subjectFilter);
      return matchesSubject && tutor.rate <= maxRate;
    });
  }, [rateFilter, subjectFilter]);

  const updateSubjectFilter = (value: string) => {
    setSubjectFilter(value);
    capture('tutor directory filtered', {
      filter_type: 'subject',
      filter_value: value,
      result_count: TUTORS.filter((tutor) => value === 'All subjects' || tutor.subjects.includes(value)).length,
    });
  };

  const updateRateFilter = (value: string) => {
    setRateFilter(value);
    const maxRate = value === 'Any rate' ? Infinity : Number(value);
    capture('tutor directory filtered', {
      filter_type: 'rate',
      filter_value: value,
      result_count: TUTORS.filter((tutor) => tutor.rate <= maxRate).length,
    });
  };

  const openProfile = (tutor: Tutor, event: MouseEvent<HTMLButtonElement>) => {
    lastTrigger.current = event.currentTarget;
    setSelectedTutor(tutor);
    viewedTutors.current.add(tutor.id);
    capture('tutor profile viewed', {
      tutor_id: tutor.id,
      tutor_name: tutor.name,
      subjects: tutor.subjects,
      hourly_rate_usd: tutor.rate,
      available_slot_count: availableSlots(tutor).length,
      source: 'tutor directory',
    });
  };

  const openBooking = (
    tutor: Tutor,
    source: 'profile' | 'tutor directory',
    event?: MouseEvent<HTMLButtonElement>,
  ) => {
    if (event) lastTrigger.current = event.currentTarget;
    const slots = availableSlots(tutor);
    setSelectedTutor(null);
    setBookingTutor(tutor);
    setSelectedSlotId(slots[0]?.id ?? '');
    setSelectedSubject(tutor.subjects[0]);
    setNotificationChannel('email');
    setFormError('');
    capture('booking started', {
      tutor_id: tutor.id,
      tutor_name: tutor.name,
      subjects: tutor.subjects,
      hourly_rate_usd: tutor.rate,
      source,
      profile_viewed_in_session: viewedTutors.current.has(tutor.id),
    });
  };

  const closeModal = () => {
    setSelectedTutor(null);
    setBookingTutor(null);
    setConfirmation(null);
    setFormError('');
    window.setTimeout(() => lastTrigger.current?.focus(), 0);
  };

  const handleBookingSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!bookingTutor || !selectedSlotId) {
      setFormError('Please choose an available time.');
      return;
    }

    const latestBookings = readBookings();
    const key = `${bookingTutor.id}:${selectedSlotId}`;
    if (latestBookings.some((booking) => `${booking.tutorId}:${booking.slotId}` === key)) {
      setBookings(latestBookings);
      setSelectedSlotId('');
      setFormError('That time was just booked. Please choose another available time.');
      capture('booking request blocked', { tutor_id: bookingTutor.id, reason: 'slot unavailable' });
      return;
    }

    const slot = bookingTutor.slots.find((item) => item.id === selectedSlotId);
    if (!slot) {
      setFormError('Please choose an available time.');
      return;
    }

    const data = new FormData(event.currentTarget);
    const record: BookingRecord = {
      id: window.crypto?.randomUUID?.() ?? `booking-${Date.now()}`,
      tutorId: bookingTutor.id,
      slotId: slot.id,
      subject: selectedSubject,
      parentName: String(data.get('parentName') ?? ''),
      parentEmail: String(data.get('parentEmail') ?? ''),
      parentPhone: String(data.get('parentPhone') ?? ''),
      studentName: String(data.get('studentName') ?? ''),
      grade: String(data.get('grade') ?? ''),
      goals: String(data.get('goals') ?? ''),
      notificationChannel,
      createdAt: new Date().toISOString(),
    };

    try {
      const nextBookings = [...latestBookings, record];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookings));
      setBookings(nextBookings);
    } catch {
      setFormError('This browser could not save the request. Please check its storage settings and try again.');
      return;
    }

    capture('booking request submitted', {
      tutor_id: bookingTutor.id,
      tutor_name: bookingTutor.name,
      subject: selectedSubject,
      hourly_rate_usd: bookingTutor.rate,
      slot_day_of_week: slot.weekday,
      slot_time_bucket: slot.timeBucket,
      notification_channel: notificationChannel,
      profile_viewed_in_session: viewedTutors.current.has(bookingTutor.id),
    });

    let delivery: Confirmation['delivery'] = 'preview';
    if (notificationWebhook) {
      try {
        const response = await fetch(notificationWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        delivery = response.ok ? 'sent' : 'failed';
      } catch {
        delivery = 'failed';
      }
    }

    setConfirmation({ tutor: bookingTutor, slot, channel: notificationChannel, delivery });
    setBookingTutor(null);
  };

  const resetDemoData = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setBookings([]);
    setStorageNotice('Demo bookings cleared. Every time is available again.');
    window.setTimeout(() => setStorageNotice(''), 4000);
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ABC Tutoring home">
          <span aria-hidden="true">A</span>
          ABC Tutoring
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#tutors">Our tutors</a>
          <a className="button button-small" href="#tutors">Find a tutor</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">One-to-one support, made simple</p>
          <h1>The right tutor can change how school feels.</h1>
          <p className="hero-intro">
            Meet kind, experienced tutors and choose a time that works for your family.
          </p>
          <div className="hero-actions">
            <a className="button" href="#tutors">Browse available tutors</a>
            <span>No payment needed to request a time</span>
          </div>
        </div>
        <aside className="hero-note" aria-label="Why families choose ABC Tutoring">
          <p className="note-kicker">A calmer way to get help</p>
          <p className="note-quote">A clear match before your family has to commit.</p>
          <div className="note-points">
            <span><b>✓</b> Experienced tutors</span>
            <span><b>✓</b> Flexible times</span>
            <span><b>✓</b> One simple request</span>
          </div>
        </aside>
      </section>

      <section className="trust-strip" aria-label="ABC Tutoring benefits">
        <span>Support for grades 5-12</span>
        <span>Clear hourly rates</span>
        <span>Weekday and weekend times</span>
      </section>

      <section className="tutors-section" id="tutors">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available this week</p>
            <h2>Find a tutor who fits</h2>
          </div>
          <p>Compare subjects, rates, and open times at a glance.</p>
        </div>

        <div className="filters" aria-label="Tutor filters">
          <label>
            <span>Subject</span>
            <select value={subjectFilter} onChange={(event) => updateSubjectFilter(event.target.value)}>
              <option>All subjects</option>
              {ALL_SUBJECTS.map((subject) => <option key={subject}>{subject}</option>)}
            </select>
          </label>
          <label>
            <span>Hourly rate</span>
            <select value={rateFilter} onChange={(event) => updateRateFilter(event.target.value)}>
              <option>Any rate</option>
              <option value="45">Up to $45</option>
              <option value="50">Up to $50</option>
              <option value="55">Up to $55</option>
            </select>
          </label>
          <p aria-live="polite">{visibleTutors.length} tutor{visibleTutors.length === 1 ? '' : 's'} match</p>
        </div>

        {visibleTutors.length > 0 ? (
          <div className="tutor-grid">
            {visibleTutors.map((tutor) => {
              const slots = availableSlots(tutor);
              return (
                <article className="tutor-card" key={tutor.id}>
                  <div className="card-top">
                    <div className={`avatar ${tutor.color}`} aria-hidden="true">{tutor.initials}</div>
                    <p className={`availability ${slots.length === 0 ? 'full' : ''}`}>
                      <span />
                      {slots.length > 0 ? `${slots.length} time${slots.length === 1 ? '' : 's'} open` : 'Fully booked'}
                    </p>
                  </div>
                  <h3>{tutor.name}</h3>
                  <p className="pronouns">{tutor.pronouns} · {tutor.grades}</p>
                  <div className="subject-tags" aria-label={`${tutor.name}'s subjects`}>
                    {tutor.subjects.map((subject) => <span key={subject}>{subject}</span>)}
                  </div>
                  <p className="card-approach">{tutor.approach}</p>
                  <div className="card-bottom">
                    <p><strong>${tutor.rate}</strong><span>/ hour</span></p>
                    <button type="button" onClick={(event) => openProfile(tutor, event)}>
                      View profile
                    </button>
                  </div>
                  <button
                    className="book-card-button"
                    type="button"
                    disabled={slots.length === 0}
                    onClick={(event) => openBooking(tutor, 'tutor directory', event)}
                  >
                    {slots.length > 0 ? 'Request a time' : 'No times available'}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No exact match yet</h3>
            <p>Try a different subject or hourly rate to see more tutors.</p>
            <button type="button" onClick={() => { setSubjectFilter('All subjects'); setRateFilter('Any rate'); }}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>A good match in three steps</h2>
          </div>
        </div>
        <ol className="steps-list">
          <li><span>1</span><div><h3>Compare tutors</h3><p>See each tutor’s subjects, rate, experience, and teaching style.</p></div></li>
          <li><span>2</span><div><h3>Choose an open time</h3><p>Select a time and share a few details about what your student needs.</p></div></li>
          <li><span>3</span><div><h3>Dana follows up</h3><p>Your request gives Dana what she needs to confirm the match by email or text.</p></div></li>
        </ol>
      </section>

      <section className="reassurance">
        <p className="eyebrow">Built around your family</p>
        <h2>Start with a conversation, not a commitment.</h2>
        <a className="button" href="#tutors">Find your tutor</a>
      </section>

      <footer>
        <div>
          <a className="brand" href="#top"><span aria-hidden="true">A</span>ABC Tutoring</a>
          <p>Friendly, focused tutoring for students who deserve to feel capable.</p>
        </div>
        <div className="prototype-note">
          <strong>Prototype note</strong>
          <p>
            Booking requests are saved in this browser. Email or text delivery is previewed unless a secure notification service is connected.
          </p>
          {bookings.length > 0 && <button type="button" onClick={resetDemoData}>Reset demo bookings</button>}
          <span className="sr-only" role="status" aria-live="polite">{storageNotice}</span>
        </div>
      </footer>

      {selectedTutor && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeModal(); }}>
          <section className="modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <button className="close-button" type="button" aria-label="Close tutor profile" onClick={closeModal}>×</button>
            <div className="profile-heading">
              <div className={`avatar large ${selectedTutor.color}`} aria-hidden="true">{selectedTutor.initials}</div>
              <div>
                <p className="eyebrow">Tutor profile</p>
                <h2 id="profile-title">{selectedTutor.name}</h2>
                <p>{selectedTutor.pronouns} · {selectedTutor.experience}</p>
              </div>
            </div>
            <div className="profile-body">
              <div>
                <h3>A little about {selectedTutor.name.split(' ')[0]}</h3>
                <p>{selectedTutor.bio}</p>
                <dl>
                  <div><dt>Teaching style</dt><dd>{selectedTutor.approach}</dd></div>
                  <div><dt>Background</dt><dd>{selectedTutor.credential}</dd></div>
                  <div><dt>Works with</dt><dd>{selectedTutor.grades}</dd></div>
                </dl>
              </div>
              <aside>
                <p className="profile-rate"><strong>${selectedTutor.rate}</strong> / hour</p>
                <h3>Next available</h3>
                <div className="mini-slots">
                  {availableSlots(selectedTutor).length > 0 ? availableSlots(selectedTutor).map((slot) => (
                    <span key={slot.id}>{slot.label}</span>
                  )) : <p>No times left this week.</p>}
                </div>
                <button
                  className="button"
                  type="button"
                  disabled={availableSlots(selectedTutor).length === 0}
                  onClick={() => openBooking(selectedTutor, 'profile')}
                >
                  {availableSlots(selectedTutor).length > 0 ? 'Request a time' : 'Fully booked'}
                </button>
              </aside>
            </div>
          </section>
        </div>
      )}

      {bookingTutor && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title">
            <button className="close-button" type="button" aria-label="Close booking form" onClick={closeModal}>×</button>
            <div className="booking-heading">
              <p className="eyebrow">Booking request</p>
              <h2 id="booking-title">Request a session with {bookingTutor.name}</h2>
              <p>No payment is collected. Dana will follow up to confirm the session.</p>
            </div>
            <form className="booking-form ph-no-capture" onSubmit={handleBookingSubmit}>
              <fieldset>
                <legend>1. Choose a time</legend>
                <div className="slot-options">
                  {availableSlots(bookingTutor).map((slot) => (
                    <label key={slot.id} className={selectedSlotId === slot.id ? 'selected' : ''}>
                      <input
                        type="radio"
                        name="slot"
                        value={slot.id}
                        checked={selectedSlotId === slot.id}
                        onChange={() => {
                          setSelectedSlotId(slot.id);
                          capture('booking time selected', {
                            tutor_id: bookingTutor.id,
                            slot_day_of_week: slot.weekday,
                            slot_time_bucket: slot.timeBucket,
                          });
                        }}
                      />
                      <span>{slot.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="form-grid">
                <legend>2. Tell us what your student needs</legend>
                <label><span>Student first name</span><input name="studentName" autoComplete="off" required /></label>
                <label>
                  <span>Grade</span>
                  <select name="grade" required defaultValue="">
                    <option value="" disabled>Choose grade</option>
                    {['5', '6', '7', '8', '9', '10', '11', '12'].map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
                  </select>
                </label>
                <label>
                  <span>Subject</span>
                  <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} required>
                    {bookingTutor.subjects.map((subject) => <option key={subject}>{subject}</option>)}
                  </select>
                </label>
                <label className="full-width"><span>What would make tutoring helpful? <em>Optional</em></span><textarea name="goals" rows={3} /></label>
              </fieldset>

              <fieldset className="form-grid">
                <legend>3. How should Dana follow up?</legend>
                <label><span>Parent or guardian name</span><input name="parentName" autoComplete="name" required /></label>
                <label><span>Email</span><input name="parentEmail" type="email" autoComplete="email" required /></label>
                <label><span>Mobile number {notificationChannel === 'text' ? '' : <em>Optional</em>}</span><input name="parentPhone" type="tel" autoComplete="tel" required={notificationChannel === 'text'} /></label>
                <div className="notification-choice">
                  <span>Preferred reply</span>
                  <label><input type="radio" name="notificationChannel" value="email" checked={notificationChannel === 'email'} onChange={() => setNotificationChannel('email')} /> Email</label>
                  <label><input type="radio" name="notificationChannel" value="text" checked={notificationChannel === 'text'} onChange={() => setNotificationChannel('text')} /> Text</label>
                </div>
              </fieldset>

              {formError && <p className="form-error" role="alert">{formError}</p>}
              <div className="form-footer">
                <p>Your contact and student details stay in this prototype’s local booking record and are never sent to analytics.</p>
                <button className="button" type="submit">Send booking request</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {confirmation && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
            <button className="close-button" type="button" aria-label="Close confirmation" onClick={closeModal}>×</button>
            <div className="success-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">Request saved</p>
            <h2 id="confirmation-title">You’ve requested {confirmation.tutor.name}</h2>
            <p className="confirmation-time">{confirmation.slot.label} · ${confirmation.tutor.rate}/hour</p>
            <div className="notification-preview">
              <span>Booking notification</span>
              {confirmation.delivery === 'sent' ? (
                <p>Dana was notified. She’ll follow up by {confirmation.channel} to confirm.</p>
              ) : confirmation.delivery === 'failed' ? (
                <p>The time is saved, but the notification could not be delivered. Dana can still review the booking record.</p>
              ) : (
                <p>
                  This prototype prepared {confirmation.channel === 'email' ? 'an email' : 'a text'} notification preview; no message was actually sent.
                </p>
              )}
            </div>
            <p className="prototype-detail">
              The chosen time is now unavailable on this device. A production version would save it for every visitor and connect secure email or text delivery.
            </p>
            <button className="button" type="button" onClick={closeModal}>Done</button>
          </section>
        </div>
      )}
    </main>
  );
}
