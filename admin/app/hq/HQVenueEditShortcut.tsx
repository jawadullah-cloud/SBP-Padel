'use client';
import {usePathname,useSearchParams} from 'next/navigation';
export default function HQVenueEditShortcut(){const path=usePathname(),params=useSearchParams();if(!path.startsWith('/hq/provisioning/manage'))return null;const venue=params.get('venue')||'';if(!venue)return null;return <div className="hqVenueProfileShortcut"><a className="btn" href={`/hq/provisioning/profile?venue=${encodeURIComponent(venue)}`}>EDIT VENUE PROFILE & AMENITIES</a></div>}
