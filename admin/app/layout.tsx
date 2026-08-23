import './globals.css';
import './operations-v2.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SBP Padel Operations',
  description: 'Sports Board Punjab Padel administration and venue operations portal',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
