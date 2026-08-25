import {ReactNode} from 'react';
import HQTools from './HQTools';
import HQGate from './HQGate';
import './hq-enhancements.css';
export default function HQLayout({children}:{children:ReactNode}){return <HQGate><div className="hqLayoutFrame"><HQTools/><div className="hqLayoutContent">{children}</div></div></HQGate>}
