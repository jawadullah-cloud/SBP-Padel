import {ReactNode} from 'react';
import HQTools from './HQTools';
import HQGate from './HQGate';
export default function HQLayout({children}:{children:ReactNode}){return <HQGate><HQTools/>{children}</HQGate>}
