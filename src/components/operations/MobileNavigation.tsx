import React from 'react';
import {LayoutDashboard,Leaf,ScanLine,Bell,MoreHorizontal} from 'lucide-react';
export function MobileNavigation({page,unread,menuOpen,onNavigate,onScan,onAlerts,onMenu}:{page:string;unread:number;menuOpen:boolean;onNavigate:(page:string)=>void;onScan:()=>void;onAlerts:()=>void;onMenu:()=>void}){
 return <nav className="fo-mobile-nav fo-no-print" aria-label="Mobile navigation">
 <button aria-current={page==='overview'?'page':undefined} className={page==='overview'?'active':''} onClick={()=>onNavigate('overview')}><LayoutDashboard size={21}/><span>Home</span></button>
 <button aria-current={page==='production'?'page':undefined} className={page==='production'?'active':''} onClick={()=>onNavigate('production')}><Leaf size={21}/><span>Acreage</span></button>
 <button className="fo-mobile-scan" onClick={onScan} aria-label="Scan machine QR"><ScanLine size={23}/><span>Scan</span></button>
 <button onClick={onAlerts} aria-label={`Open alerts (${unread} unread)`}><span className="fo-mobile-alert-icon"><Bell size={21}/>{unread>0&&<b>{unread>99?'99+':unread}</b>}</span><span>Alerts</span></button>
 <button className={!['overview','production'].includes(page)||menuOpen?'active':''} aria-expanded={menuOpen} aria-controls="fo-mobile-menu" onClick={onMenu}><MoreHorizontal size={22}/><span>More</span></button>
 </nav>;
}
