import './globals.css';
import './operations-v2.css';
import './players-ui.css';
import './scan-pass.css';
import './hq-provisioning.css';
import './hq-shell.css';
import type { Metadata } from 'next';
import PlayersSidebarLink from './PlayersSidebarLink';

export const metadata: Metadata = {
  title: 'SBP Padel Operations',
  description: 'Sports Board Punjab Padel administration and venue operations portal',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<PlayersSidebarLink/></body></html>;
}
