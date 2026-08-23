import { ReactNode } from 'react';

export default function HQLayout({children}:{children:ReactNode}){
 return <><div style={{position:'fixed',right:18,bottom:18,zIndex:50,display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}><a className="btn" href="/hq/provisioning">PROVISION VENUE</a><a className="btn" href="/hq/reports">REPORTS</a><a className="btn" href="/hq/finance">FINANCE</a><a className="btn" href="/hq/audit">AUDIT LOG</a></div>{children}</>
}
