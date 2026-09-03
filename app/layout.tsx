import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://stanford-kz.github.io'),
  title: 'ABC Tutoring | Find the right tutor',
  description: 'Browse friendly, experienced tutors and request a time that works for your family.',
  icons: { icon: '/favicon.png' },
  openGraph: {
    title: 'ABC Tutoring',
    description: 'The right tutor can change how school feels.',
    url: 'https://stanford-kz.github.io',
    siteName: 'ABC Tutoring',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ABC Tutoring - The right tutor can change how school feels.' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ABC Tutoring',
    description: 'The right tutor can change how school feels.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
