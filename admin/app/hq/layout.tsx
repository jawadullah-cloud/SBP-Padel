import {ReactNode} from 'react';
import HQTools from './HQTools';
import HQGate from './HQGate';
import HQTabBridge from './HQTabBridge';
import HQVenueEditShortcut from './HQVenueEditShortcut';
import HQHomeRouteBridge from './HQHomeRouteBridge';
import './hq-enhancements.css';
export default function HQLayout({children}:{children:ReactNode}){return <HQGate><HQTabBridge/><HQHomeRouteBridge/><div className="hqLayoutFrame"><HQTools/><div className="hqLayoutContent"><HQVenueEditShortcut/>{children}</div></div></HQGate>}
