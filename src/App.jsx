import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import {
  Sunrise, ListChecks, CalendarDays, BarChart3, BookOpen, Check, X,
  ChevronLeft, ChevronRight, Flame, LogOut, Plus, AlertCircle, Cloud, Lock
} from 'lucide-react';

// ============================================================================
// FIREBASE
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyC0ZgKV2_Pjqga9ig_bLnxhA3bavYt6EOk",
  authDomain: "habit2x.firebaseapp.com",
  projectId: "habit2x",
  storageBucket: "habit2x.firebasestorage.app",
  messagingSenderId: "32051321374",
  appId: "1:32051321374:web:eee71db3dfef1ef5366c0f",
  measurementId: "G-GCGFJN4X8E"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'habitx-discipline-app';

// ============================================================================
// DATA
// ============================================================================
const QUOTES = [
  { text: "The most beloved deeds to Allah are those that are most consistent, even if they are small.", author: "Prophet Muhammad ﷺ (Sahih al-Bukhari)" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Take advantage of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your busyness, and your life before your death.", author: "Hadith (Al-Hakim)" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Indeed, prayer has been decreed upon the believers a decree of specified times.", author: "Surah An-Nisa (4:103)" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Guard strictly your prayers, especially the middle prayer, and stand before Allah with devotion.", author: "Surah Al-Baqarah (2:238)" },
];

const TABS = [
  { id: 'today', label: 'Today', icon: Sunrise },
  { id: 'tracker', label: 'Track', icon: ListChecks },
  { id: 'calendar', label: 'Month', icon: CalendarDays },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'islamic', label: 'Islamic', icon: BookOpen },
];

// ============================================================================
// HELPERS
// ============================================================================
const getLocalDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDateKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseDateKey(k); d.setDate(d.getDate() + n); return getLocalDateKey(d); };
// A Surah-counting cycle runs Wednesday 8:00 PM to the next Wednesday 8:00 PM (device local time).
const getSurahCycleWindow = (now = new Date()) => {
  const start = new Date(now);
  const daysSinceWednesday = (start.getDay() - 3 + 7) % 7;
  start.setDate(start.getDate() - daysSinceWednesday);
  start.setHours(20, 0, 0, 0);
  if (now < start) start.setDate(start.getDate() - 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end, id: `${getLocalDateKey(start)}_2000` };
};
const formatCycleDateTime = (date) => date.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const toPrayerApiDate = (date) => `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
const prayerTimeDate = (date, value) => {
  const clean = String(value || '').split(' ')[0];
  const [hours, minutes] = clean.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
};
const tomorrowDateForPrayer = (date) => { const next = new Date(date); next.setDate(next.getDate() + 1); return next; };
const displayPrayerTime = (value) => {
  const clean = String(value || '').split(' ')[0];
  const [hours, minutes] = clean.split(':').map(Number);
  const date = new Date(); date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};
const formatDisplayDate = (k) =>
  parseDateKey(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const getQuoteForDate = (k) =>
  QUOTES[k.split('-').reduce((a, v) => a + parseInt(v, 10), 0) % QUOTES.length];
const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'اَلسَّلَامُ عَلَيْكُمْ' : h < 12 ? 'اَلسَّلَامُ عَلَيْكُمْ' : h < 17 ? 'اَلسَّلَامُ عَلَيْكُمْ' : 'اَلسَّلَامُ عَلَيْكُمْ';
};

// Eight-pointed star (Khatam): two overlapping squares, used as clip shape, marker and ornament
const OCTAGRAM = [[50, 0], [64.64, 14.64], [85.36, 14.64], [85.36, 35.36], [100, 50], [85.36, 64.64], [85.36, 85.36], [64.64, 85.36],
  [50, 100], [35.36, 85.36], [14.64, 85.36], [14.64, 64.64], [0, 50], [14.64, 35.36], [14.64, 14.64], [35.36, 14.64]];
const STAR_CLIP = `polygon(${OCTAGRAM.map(([a, b]) => `${a}% ${b}%`).join(',')})`;
const starPoints = (scale) => OCTAGRAM.map(([a, b]) => `${((a - 50) * scale).toFixed(2)},${((b - 50) * scale).toFixed(2)}`).join(' ');

// ============================================================================
// STYLES: plain CSS only (no Tailwind needed)
// Palette: emerald ink #04211c · mosque green #0a3a31 · gold #e9b949 · bright gold #ffd86b · parchment #f7ecd0
// ============================================================================
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;500;600;700;800&display=swap');
html,body,#root{margin:0;min-height:100%;background:#04211c}
.hx,.hx *{box-sizing:border-box}
.hx{
  --star:${STAR_CLIP};
  --tile:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Cg fill='none' stroke='%23e9b949' stroke-opacity='.14' stroke-width='1'%3E%3Crect x='16' y='16' width='40' height='40'/%3E%3Crect x='16' y='16' width='40' height='40' transform='rotate(45 36 36)'/%3E%3Ccircle cx='36' cy='36' r='7'/%3E%3Cpath d='M0 0L16 16M72 0L56 16M0 72L16 56M72 72L56 56'/%3E%3C/g%3E%3C/svg%3E");
  --tile-dark:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'%3E%3Cg fill='none' stroke='%230b2e27' stroke-opacity='.2' stroke-width='1'%3E%3Crect x='16' y='16' width='40' height='40'/%3E%3Crect x='16' y='16' width='40' height='40' transform='rotate(45 36 36)'/%3E%3Ccircle cx='36' cy='36' r='7'/%3E%3Cpath d='M0 0L16 16M72 0L56 16M0 72L16 56M72 72L56 56'/%3E%3C/g%3E%3C/svg%3E");
  font-family:'Manrope',system-ui,sans-serif;color:#f7ecd0;min-height:100vh;font-size:15px;line-height:1.45;
  background-color:#04211c;
  background-image:
    radial-gradient(900px 520px at 50% -12%,rgba(255,206,70,.26),transparent 70%),
    radial-gradient(700px 480px at 105% 10%,rgba(28,122,104,.35),transparent 70%),
    radial-gradient(600px 420px at -10% 60%,rgba(255,200,60,.08),transparent 70%),
    var(--tile);
  background-attachment:fixed}
.hx h1,.hx h2,.hx h3,.hx p,.hx blockquote,.hx ul{margin:0;padding:0}
.hx ul{list-style:none}
.hx button{font-family:inherit;color:#f7ecd0;background:none;border:0;cursor:pointer;padding:4}
.hx input,.hx select,.hx textarea{font-family:inherit}
.serif{font-family:'Amiri','Times New Roman',serif;font-weight:400;letter-spacing:0}
.mute{color:#9db8ac}.sun{color:#ffd86b}.coral{color:#ff9a4d}.pink{color:#f09a80}
.xs{font-size:12px}.sm{font-size:13.5px}
.row{display:flex;align-items:center}.between{justify-content:space-between}.end{align-items:flex-end}
.g8{gap:8px}.g12{gap:12px}.g16{gap:16px}
.center{text-align:center}.grow{flex:1;min-width:0}
.stack>*+*{margin-top:20px}.form>*+*{margin-top:12px}

.wrap{max-width:720px;margin:0 auto;padding:28px 20px 140px}
.top{margin-bottom:24px}
.card{background:linear-gradient(180deg,rgba(11,62,52,.88),rgba(6,38,32,.92));border:1px solid rgba(233,185,73,.28);border-radius:22px;padding:24px;box-shadow:0 20px 50px -25px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,226,140,.10)}
.card h3.t{font-size:14px;font-weight:700;color:#ffd86b;margin-bottom:6px;display:flex;align-items:center;gap:8px}
.card h3.t::before{content:"";width:11px;height:11px;flex-shrink:0;background:linear-gradient(135deg,#ffe58a,#e9b949);clip-path:var(--star)}
.page-title{font-size:40px;line-height:1.1;background:linear-gradient(135deg,#fff0b0,#ffd04a 55%,#e9a62a);-webkit-background-clip:text;background-clip:text;color:transparent}

/* Ornamental divider: line · star · line */
.orn{display:flex;align-items:center;gap:10px;margin-top:8px;max-width:260px}
.orn i{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(233,185,73,.7))}
.orn i:last-child{background:linear-gradient(270deg,transparent,rgba(233,185,73,.7))}
.orn b{width:12px;height:12px;flex-shrink:0;background:linear-gradient(135deg,#ffe58a,#e9b949);clip-path:var(--star)}

.bismillah{font-family:'Amiri',serif;font-size:30px;line-height:1.5;text-align:center;background:linear-gradient(135deg,#fff0b0,#ffd04a 55%,#e9a62a);-webkit-background-clip:text;background-clip:text;color:transparent}

/* Hero: a mihrab arch with a double gold frame and a lattice behind the text */
.hero{position:relative;text-align:center;padding:68px 24px 30px;color:#0b2e27;border:0;border-radius:200px 200px 22px 22px;margin-bottom:8px;
  background:linear-gradient(160deg,#fff0a0 0%,#ffd04a 45%,#e9a62a 100%);
  box-shadow:0 0 0 3px #04211c,0 0 0 5px #e9b949,0 0 0 9px #04211c,0 0 0 10px rgba(233,185,73,.55),0 34px 70px -26px rgba(255,190,40,.55),inset 0 1px 0 rgba(255,255,255,.55)}
.hero::before{content:"";position:absolute;inset:0;border-radius:inherit;background-image:var(--tile-dark);opacity:.85;pointer-events:none}
.hero>*{position:relative}
.hero .mute{color:rgba(11,46,39,.75)}
.hero .num{font-size:70px;line-height:1;margin-top:-62px;color:#0b2e27}
.hero .num small{font-size:26px;color:rgba(11,46,39,.65)}
.hero .btn{margin-top:24px;background:#0b2e27!important;color:#ffd86b!important;box-shadow:0 12px 26px -10px rgba(4,33,28,.8)}
.hero .btn:hover{box-shadow:0 16px 30px -10px rgba(4,33,28,.9)}
.arc{display:block;width:100%;max-width:380px;margin:10px auto 0}

.strip{display:grid;grid-template-columns:repeat(3,1fr);padding:22px 8px;text-align:center}
.strip>div+div{border-left:1px solid rgba(233,185,73,.22)}
.strip .v{font-size:32px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#fff0b0,#ffd04a);-webkit-background-clip:text;background-clip:text;color:transparent}
.strip .v svg{color:#ff9a4d}
.strip .l{font-size:12px;color:#9db8ac;margin-top:4px}
.bar{height:10px;border-radius:999px;background:rgba(233,185,73,.12);overflow:hidden;margin-top:16px}
.bar>div{height:100%;border-radius:999px;background:linear-gradient(90deg,#ffe58a,#ffc533,#e9a62a);transition:width .6s ease;box-shadow:0 0 14px rgba(255,197,51,.5)}
.quote{padding:10px 6px}.quote p{font-size:24px;line-height:1.4;font-style:italic}.quote footer{font-size:12px;color:#ffd86b;margin-top:12px}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#ffe58a,#ffc533 55%,#e9a62a)!important;color:#0b2e27!important;font-weight:800;font-size:14px;border-radius:999px;padding:14px 26px;box-shadow:0 10px 28px -8px rgba(255,190,40,.55);transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-2px);box-shadow:0 14px 32px -8px rgba(255,190,40,.75)}
.btn:active{transform:translateY(0)}.btn:disabled{opacity:.5;transform:none}
.btn.full{width:100%}
.ghost{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:rgba(233,185,73,.08)!important;border:1px solid rgba(233,185,73,.25)!important;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:600;transition:background .15s,border-color .15s}
.ghost:hover{background:rgba(233,185,73,.16)!important;border-color:rgba(255,216,107,.6)!important}
.ghost.full{width:100%;padding:13px}
.ghost.icon{width:40px;height:40px;padding:0}
.ghost.danger:hover{background:rgba(240,120,90,.18)!important;border-color:rgba(240,120,90,.55)!important;color:#f5a08a}
.link{font-size:13px;color:#9db8ac!important}.link:hover{color:#ffd86b!important}

.input{display:block;width:100%;background:rgba(3,24,20,.7);border:1px solid rgba(233,185,73,.25);border-radius:14px;padding:13px 16px;color:#f7ecd0;font-size:14.5px;outline:none;transition:border-color .15s,box-shadow .15s}
.input::placeholder{color:#6f8f83}
.input:focus{border-color:#ffd86b;box-shadow:0 0 0 4px rgba(255,216,107,.14)}
.input:disabled,.input[readonly]{opacity:.6;cursor:not-allowed}
select.input{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:40px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239db8ac' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 16px center}
select.input option{background:#082c25;color:#f7ecd0}
textarea.input{resize:none;line-height:1.5}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.count{width:96px;text-align:center;font-weight:700}
.date{background:transparent;border:0;color:#f7ecd0;font-size:13px;font-weight:600;cursor:pointer;color-scheme:dark;width:122px;outline:none}
.err{display:flex;gap:10px;margin-top:20px;padding:12px 14px;border-radius:14px;background:rgba(240,120,90,.10);border:1px solid rgba(240,120,90,.35);color:#f5a08a;font-size:12.5px;text-align:left}
.lock-note{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:14px;background:rgba(233,185,73,.09);border:1px solid rgba(233,185,73,.3);color:#ffd86b;font-size:12.5px}

.habit{display:flex;align-items:center;gap:16px;padding:14px 6px;cursor:pointer;border-radius:14px;transition:background .15s}
.habit+.habit,.item+.item{border-top:1px solid rgba(233,185,73,.14)}
.habit:hover{background:rgba(233,185,73,.06)}
.habit .name{flex:1;font-weight:600;font-size:14.5px}
.habit.done .name{color:#9db8ac;text-decoration:line-through;text-decoration-color:rgba(255,216,107,.7)}
.habit.locked{cursor:default}
.habit.locked:hover{background:transparent}
.circle{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s}
.circle:hover{transform:scale(1.08)}
.circle:disabled{cursor:default}
.circle:disabled:hover{transform:none}
.item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 6px}

.cal-head{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;text-align:center;font-size:11px;color:#9db8ac;margin-bottom:8px}
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.day{aspect-ratio:1;border-radius:14px;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:transform .15s}
.day:hover{transform:scale(1.07)}
.bars{display:flex;align-items:flex-end;gap:6px;height:170px}
.bars>div{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px}
.bars i{display:block;width:100%;border-radius:999px 999px 4px 4px;transition:height .5s}
.bars span{font-size:10px;color:#9db8ac}

.notes li{display:flex;align-items:center;gap:10px;padding:4px 0}
.notes .dot{width:11px;height:11px;flex-shrink:0;background:linear-gradient(135deg,#ffe58a,#e9b949);clip-path:var(--star)}
.note-input{flex:1;min-width:0;background:transparent;border:0;border-bottom:1px solid rgba(233,185,73,.22);color:#f7ecd0;font-size:14.5px;padding:9px 2px;outline:none;transition:border-color .15s}
.note-input::placeholder{color:#6f8f83}
.note-input:focus{border-bottom-color:#ffd86b}
.note-text{flex:1;padding:8px 2px;overflow-wrap:anywhere}
.ghost.icon.sm{width:30px;height:30px}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:60;padding:11px 20px;border-radius:999px;font-size:13px;font-weight:600}
.nav{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:50;display:flex;gap:4px;padding:6px;border-radius:26px;border:1px solid rgba(233,185,73,.35);background:rgba(4,33,28,.9);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 20px 40px -10px rgba(0,0,0,.8);margin-bottom:env(safe-area-inset-bottom,0px)}
.nav button{display:flex;align-items:center;gap:8px;border-radius:18px;padding:11px 15px;font-size:13px;font-weight:700;color:#9db8ac;transition:all .2s}
.nav button:hover{color:#f7ecd0}
.nav button.on{border-radius:999px 999px 16px 16px;background:linear-gradient(160deg,#ffe58a,#ffc533 55%,#e9a62a);color:#0b2e27;box-shadow:0 8px 20px -6px rgba(255,190,40,.65)}

.surah-row{display:flex;align-items:center;gap:10px;padding:14px 4px;border-top:1px solid rgba(233,185,73,.14)}
.surah-row:first-child{border-top:0}
.surah-count{min-width:34px;text-align:center;font-size:20px;font-weight:800;color:#ffd86b}
.surah-action{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(233,185,73,.35)!important;background:rgba(233,185,73,.09)!important;color:#ffd86b!important;font-size:20px;font-weight:700}
.surah-action:hover{background:rgba(233,185,73,.2)!important}
.auth{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.auth .card{width:100%;max-width:420px;padding:70px 30px 34px;border-radius:200px 200px 22px 22px;text-align:center;
  box-shadow:0 0 0 3px #04211c,0 0 0 5px #e9b949,0 0 0 9px #04211c,0 0 0 10px rgba(233,185,73,.55),0 30px 60px -25px rgba(0,0,0,.8)}
.auth h1{background:linear-gradient(135deg,#fff0b0,#ffd04a 55%,#e9a62a);-webkit-background-clip:text;background-clip:text;color:transparent}
.auth .orn{margin:16px auto 0}
.rise{animation:rise .6s ease-out both}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.hx button:focus-visible,.hx input:focus-visible,.hx select:focus-visible{outline:2px solid #ffd86b;outline-offset:2px}
@media (max-width:480px){.page-title{font-size:34px}.hero{border-radius:170px 170px 22px 22px;padding-top:60px}.hero .num{font-size:58px}.nav button{padding:11px 12px}.two{grid-template-columns:1fr}.auth .card{border-radius:170px 170px 22px 22px}}
@media (prefers-reduced-motion:reduce){.rise{animation:none}*{transition:none!important}}
`;

// ============================================================================
// SMALL COMPONENTS
// ============================================================================
function Ornament({ style }) {
  return <div className="orn" aria-hidden="true" style={style}><i /><b /><i /></div>;
}

function PageTitle({ children }) {
  return (<div><h2 className="serif page-title">{children}</h2><Ornament /></div>);
}

function SunArc({ pct }) {
  const p = Math.max(0, Math.min(100, pct)) / 100;
  const cx = 130, cy = 130, r = 110;
  const x = cx - r * Math.cos(Math.PI * p);
  const y = cy - r * Math.sin(Math.PI * p);
  const len = Math.PI * r;
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  return (
    <svg viewBox="0 0 260 150" className="arc" role="img" aria-label={`${pct}% of today's habits completed`}>
      <defs>
        <linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stopColor="#14665a" /><stop offset="1" stopColor="#0b2e27" /></linearGradient>
        <radialGradient id="glow"><stop offset="0" stopColor="#fffbe6" stopOpacity="1" /><stop offset="1" stopColor="#fffbe6" stopOpacity="0" /></radialGradient>
      </defs>
      <path d={d} fill="none" stroke="rgba(11,46,39,.18)" strokeWidth="14" strokeLinecap="round" />
      <path d={d} fill="none" stroke="url(#arcg)" strokeWidth="14" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} style={{ transition: 'stroke-dashoffset .9s ease' }} />
      <g transform={`translate(${x} ${y})`}>
        <circle r="30" fill="url(#glow)" />
        <polygon points={starPoints(0.36)} fill="#fffdf0" stroke="#0b2e27" strokeWidth="1.6" strokeLinejoin="round" />
      </g>
      <line x1="10" x2="250" y1={cy + 8} y2={cy + 8} stroke="rgba(11,46,39,.25)" />
    </svg>
  );
}

function StateButton({ status, onClick, disabled }) {
  const look = status === 'done'
    ? { background: 'linear-gradient(135deg,#ffe58a,#e9a62a)', borderColor: 'transparent', color: '#0b2e27', clipPath: STAR_CLIP }
    : status === 'missed'
    ? { background: 'rgba(240,120,90,.18)', borderColor: 'rgba(240,120,90,.6)', color: '#f5a08a' }
    : { background: 'transparent', borderColor: 'rgba(233,185,73,.4)', color: 'transparent' };
  return (
    <button onClick={onClick} disabled={disabled} className="circle" style={{ ...look, border: '1.5px solid ' + look.borderColor }}
      aria-label={`Status: ${status === 'empty' ? 'pending' : status}.${disabled ? ' Locked.' : ' Tap to change.'}`}>
      {status === 'missed' ? <X size={16} /> : <Check size={16} strokeWidth={3} />}
    </button>
  );
}

// ============================================================================
// APP
// ============================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // "today" is state so the app rolls over at midnight even if left open
  const [todayKey, setTodayKey] = useState(getLocalDateKey());
  const isLocked = (k) => k < todayKey; // "YYYY-MM-DD" strings compare correctly

  const [activeTab, setActiveTab] = useState('today');
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey());
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [syncStatus, setSyncStatus] = useState('synced');
  const [toast, setToast] = useState(null);

  const [habits, setHabits] = useState([]);
  const [dailyRecords, setDailyRecords] = useState({});
  const [prayerCity, setPrayerCity] = useState('Dadri');
  const [prayerCityDraft, setPrayerCityDraft] = useState('Dadri');
  const [prayerSchedule, setPrayerSchedule] = useState(null);
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerError, setPrayerError] = useState('');
  const [prayerRecords, setPrayerRecords] = useState({});
  const [islamicSection, setIslamicSection] = useState('prayer');
  const [surahCycles, setSurahCycles] = useState({});
  const [newSurahName, setNewSurahName] = useState('');
  const [clockNow, setClockNow] = useState(() => new Date());

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('boolean');
  const [newHabitCategory, setNewHabitCategory] = useState('Discipline');
  const [newHabitTarget, setNewHabitTarget] = useState(100);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [openHabitCategory, setOpenHabitCategory] = useState(null);

  const [noteLines, setNoteLines] = useState([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const syncedRef = useRef(null); // which date the note lines were last loaded for
  const noteTimeoutRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // ---- midnight rollover
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      const k = getLocalDateKey(now);
      setTodayKey((prev) => (prev === k ? prev : k));
      setClockNow(now); // also refreshes the Surah cycle exactly around its 8 PM boundary
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // ---- auth
  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }), []);

  // ---- data
  useEffect(() => {
    if (!user) { setHabits([]); setDailyRecords({}); setPrayerRecords({}); setSurahCycles({}); setCustomCategories([]); setRecordsLoaded(false); syncedRef.current = null; return; }
    const uid = user.uid;
    const base = ['artifacts', appId, 'users', uid];

    const unsubHabits = onSnapshot(collection(db, ...base, 'habits'), (snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
      setHabits(loaded);
    });
    const unsubRecords = onSnapshot(collection(db, ...base, 'dailyRecords'), (snap) => {
      const recs = {};
      snap.docs.forEach((d) => { recs[d.id] = d.data(); });
      setDailyRecords(recs);
      setRecordsLoaded(true);
      setSyncStatus('synced');
    });
    const unsubSettings = onSnapshot(doc(db, ...base, 'settings', 'preferences'), (s) => {
      if (s.exists()) {
        const settings = s.data();
        if (settings.prayerCity) { setPrayerCity(settings.prayerCity); setPrayerCityDraft(settings.prayerCity); }
        setCustomCategories(Array.isArray(settings.customCategories) ? settings.customCategories : []);
      } else setCustomCategories([]);
    });
    const unsubPrayerRecords = onSnapshot(collection(db, ...base, 'prayerRecords'), (snap) => {
      const records = {}; snap.docs.forEach((d) => { records[d.id] = d.data(); }); setPrayerRecords(records);
    });
    const unsubSurahCycles = onSnapshot(collection(db, ...base, 'surahCycles'), (snap) => {
      const cycles = {};
      snap.docs.forEach((d) => { cycles[d.id] = d.data(); });
      setSurahCycles(cycles);
    });
    return () => { unsubHabits(); unsubRecords(); unsubSettings(); unsubPrayerRecords(); unsubSurahCycles(); };
  }, [user]);

  // Fetch today's and tomorrow's prayer times so Isha can use tomorrow's Fajr as its deadline.
  useEffect(() => {
    if (!user || !prayerCity.trim()) return;
    let cancelled = false;
    const loadPrayerTimes = async () => {
      setPrayerLoading(true); setPrayerError('');
      try {
        const todayDate = new Date();
        const tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const makeUrl = (date) => `https://api.aladhan.com/v1/timingsByCity/${toPrayerApiDate(date)}?city=${encodeURIComponent(prayerCity.trim())}&country=India&method=1&school=1&timezonestring=Asia/Kolkata`;
        const [todayResponse, tomorrowResponse] = await Promise.all([fetch(makeUrl(todayDate)), fetch(makeUrl(tomorrowDate))]);
        if (!todayResponse.ok || !tomorrowResponse.ok) throw new Error('Prayer-time service could not be reached.');
        const [todayJson, tomorrowJson] = await Promise.all([todayResponse.json(), tomorrowResponse.json()]);
        if (todayJson.code !== 200 || tomorrowJson.code !== 200) throw new Error('Could not find prayer times for this city. Check the city name.');
        if (!cancelled) setPrayerSchedule({ date: getLocalDateKey(todayDate), today: todayJson.data.timings, tomorrow: tomorrowJson.data.timings, meta: todayJson.data.meta || null });
      } catch (error) { if (!cancelled) setPrayerError(error.message || 'Could not load prayer times.'); }
      finally { if (!cancelled) setPrayerLoading(false); }
    };
    loadPrayerTimes();
    const refresh = setInterval(loadPrayerTimes, 60 * 60 * 1000);
    return () => { cancelled = true; clearInterval(refresh); };
  }, [user, prayerCity, todayKey]);

  // load the bullet notes once per opened day (old paragraph notes become one bullet per line)
  useEffect(() => {
    if (!recordsLoaded || syncedRef.current === selectedDate) return;
    const rec = dailyRecords[selectedDate];
    const lines = Array.isArray(rec?.notes)
      ? rec.notes
      : (rec?.note ? rec.note.split('\n').filter((l) => l.trim()) : []);
    setNoteLines(lines);
    setFocusIdx(-1);
    syncedRef.current = selectedDate;
  }, [selectedDate, recordsLoaded, dailyRecords]);

  // ---- actions
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSubmitting(true);
    try {
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        if (authName.trim()) await updateProfile(cred.user, { displayName: authName.trim() });
        showToast('Account created');
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        showToast('Signed in');
      }
    } catch (err) { setAuthError(err.message || 'Sign-in failed. Check your details and try again.'); }
    finally { setAuthSubmitting(false); }
  };

  const handleGuest = async () => {
    setAuthError(''); setAuthSubmitting(true);
    try { await signInAnonymously(auth); showToast('Signed in as guest'); }
    catch (err) { setAuthError(err.message); }
    finally { setAuthSubmitting(false); }
  };

  const handleLogout = async () => { try { await signOut(auth); showToast('Signed out'); } catch { showToast('Could not sign out'); } };

  const updateHabitStatus = async (dateKey, habitId, value) => {
    if (!user) return;
    if (isLocked(dateKey)) { showToast('Past days are locked'); return; }
    setSyncStatus('syncing');
    const existing = dailyRecords[dateKey] || { statuses: {}, note: '' };
    const statuses = { ...(existing.statuses || {}), [habitId]: value };
    setDailyRecords((p) => ({ ...p, [dateKey]: { ...existing, statuses, updatedAt: Date.now() } }));
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', dateKey),
        { date: dateKey, statuses, note: existing.note || '', updatedAt: Date.now() }, { merge: true });
      setSyncStatus('synced');
    } catch { setSyncStatus('error'); }
  };

  const cycleHabit = (dateKey, habitId) => {
    if (isLocked(dateKey)) { showToast('Past days are locked'); return; }
    const cur = dailyRecords[dateKey]?.statuses?.[habitId] || 'empty';
    updateHabitStatus(dateKey, habitId, cur === 'empty' ? 'done' : cur === 'done' ? 'missed' : 'empty');
  };

  const saveNotes = (dateKey, lines) => {
    clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(async () => {
      if (!user || isLocked(dateKey)) return;
      try {
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', dateKey),
          { date: dateKey, notes: lines.filter((l) => l.trim()), updatedAt: Date.now() }, { merge: true });
      } catch (err) { console.error(err); }
    }, 600);
  };

  const handleLineChange = (i, val) => {
    if (isLocked(selectedDate)) return;
    const next = noteLines.map((l, idx) => (idx === i ? val : l));
    setNoteLines(next);
    saveNotes(selectedDate, next);
  };

  const addLine = (afterIdx = noteLines.length - 1) => {
    if (isLocked(selectedDate)) return;
    const next = [...noteLines.slice(0, afterIdx + 1), '', ...noteLines.slice(afterIdx + 1)];
    setNoteLines(next);
    setFocusIdx(afterIdx + 1);
  };

  const removeLine = (i) => {
    if (isLocked(selectedDate)) return;
    const next = noteLines.filter((_, idx) => idx !== i);
    setNoteLines(next);
    saveNotes(selectedDate, next);
  };

  const savePrayerCity = async (e) => {
    e.preventDefault();
    const city = prayerCityDraft.trim();
    if (!city || !user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences'), { prayerCity: city }, { merge: true });
      setPrayerCity(city); setPrayerSchedule(null); setPrayerError(''); showToast(`Prayer location set to ${city}`);
    } catch { showToast('Could not save prayer location.'); }
  };

  const markPrayerDone = async (prayerId) => {
    if (!user) return;
    const dateKey = getLocalDateKey();
    const existing = prayerRecords[dateKey] || { statuses: {} };
    const statuses = { ...(existing.statuses || {}), [prayerId]: 'done' };
    setPrayerRecords((prev) => ({ ...prev, [dateKey]: { ...existing, statuses } }));
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'prayerRecords', dateKey), { date: dateKey, statuses, updatedAt: Date.now() }, { merge: true });
    } catch { showToast('Could not save prayer status.'); }
  };

  const prayerRows = (() => {
    if (!prayerSchedule) return [];
    const now = new Date();
    const todayTimes = prayerSchedule.today;
    const tomorrowTimes = prayerSchedule.tomorrow;
    const rows = [
      { id: 'tahajjud', name: 'Tahajjud', time: 'Before Fajr', start: now < prayerTimeDate(now, todayTimes.Fajr) ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0) : prayerTimeDate(now, todayTimes.Isha), deadline: prayerTimeDate(now < prayerTimeDate(now, todayTimes.Fajr) ? now : tomorrowDateForPrayer(now), now < prayerTimeDate(now, todayTimes.Fajr) ? todayTimes.Fajr : tomorrowTimes.Fajr), deadlineLabel: now < prayerTimeDate(now, todayTimes.Fajr) ? 'Fajr' : 'next Fajr' },
      { id: 'fajr', name: 'Fajr', time: todayTimes.Fajr, start: prayerTimeDate(now, todayTimes.Fajr), deadline: prayerTimeDate(now, todayTimes.Sunrise), deadlineLabel: 'Sunrise' },
      { id: 'zohar', name: 'Zohar', time: todayTimes.Dhuhr, start: prayerTimeDate(now, todayTimes.Dhuhr), deadline: prayerTimeDate(now, todayTimes.Asr), deadlineLabel: 'Asr' },
      { id: 'asr', name: 'Asr', time: todayTimes.Asr, start: prayerTimeDate(now, todayTimes.Asr), deadline: prayerTimeDate(now, todayTimes.Maghrib), deadlineLabel: 'Maghrib' },
      { id: 'maghrib', name: 'Magrib', time: todayTimes.Maghrib, start: prayerTimeDate(now, todayTimes.Maghrib), deadline: prayerTimeDate(now, todayTimes.Isha), deadlineLabel: 'Isha' },
      { id: 'isha', name: 'Isha', time: todayTimes.Isha, start: prayerTimeDate(now, todayTimes.Isha), deadline: prayerTimeDate(tomorrowDateForPrayer(now), tomorrowTimes.Fajr), deadlineLabel: 'next Fajr' },
    ];
    return rows.map((row) => {
      const saved = prayerRecords[getLocalDateKey()]?.statuses?.[row.id];
      const status = saved === 'done' ? 'done' : now >= row.deadline ? 'missed' : 'pending';
      const available = now >= row.start && now < row.deadline;
      return { ...row, status, available };
    });
  })();

  const currentSurahCycle = getSurahCycleWindow(clockNow);
  const currentSurahCycleData = surahCycles[currentSurahCycle.id] || { surahs: [] };
  const currentSurahs = Array.isArray(currentSurahCycleData.surahs) ? currentSurahCycleData.surahs : [];

  const saveSurahList = async (nextSurahs) => {
    if (!user) return;
    const cycleDoc = {
      cycleId: currentSurahCycle.id,
      startAt: currentSurahCycle.start.getTime(),
      endAt: currentSurahCycle.end.getTime(),
      surahs: nextSurahs,
      updatedAt: Date.now(),
    };
    setSurahCycles((prev) => ({ ...prev, [currentSurahCycle.id]: cycleDoc }));
    setSyncStatus('syncing');
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'surahCycles', currentSurahCycle.id), cycleDoc, { merge: true });
      setSyncStatus('synced');
    } catch (err) {
      console.error(err); setSyncStatus('error'); showToast('Could not save Surah count. Check your connection.');
    }
  };

  const handleAddSurah = async (e) => {
    e.preventDefault();
    const name = newSurahName.trim();
    if (!name) return;
    if (currentSurahs.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      showToast('This Surah is already in this week’s list'); return;
    }
    const next = [...currentSurahs, { id: `surah-${Date.now()}`, name, total: 0, dailyCounts: {} }];
    await saveSurahList(next);
    setNewSurahName('');
    showToast(`Added ${name}`);
  };

  const changeSurahCount = (surahId, amount) => {
    const dateKey = getLocalDateKey(clockNow);
    const next = currentSurahs.map((surah) => {
      if (surah.id !== surahId) return surah;
      const dailyCounts = { ...(surah.dailyCounts || {}) };
      const nextDaily = Math.max(0, Number(dailyCounts[dateKey] || 0) + amount);
      if (nextDaily === 0) delete dailyCounts[dateKey]; else dailyCounts[dateKey] = nextDaily;
      return { ...surah, total: Math.max(0, Number(surah.total || 0) + amount), dailyCounts };
    });
    saveSurahList(next);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || !user) return;
    if (trackCategories.some((category) => category.toLowerCase() === name.toLowerCase())) {
      showToast('That section already exists'); return;
    }
    const next = [...customCategories, name];
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences'), { customCategories: next }, { merge: true });
      setCustomCategories(next);
      setNewCategoryName(''); setShowCategoryForm(false);
      showToast(`Added ${name} section`);
    } catch { showToast('Could not add section. Try again.'); }
  };

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!user || !newHabitName.trim()) return;
    const id = `custom-${Date.now()}`;
    const maxOrder = habits.reduce((m, h) => Math.max(m, h.order || 0), 0);
    const habit = {
      id, name: newHabitName.trim(), type: newHabitType, category: newHabitCategory,
      order: maxOrder + 1, archived: false, createdAt: Date.now(),
      ...(newHabitType === 'numeric' ? { target: Number(newHabitTarget) || 100 } : {}),
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', id), habit);
      setNewHabitName('');
      setOpenHabitCategory(null);
      showToast(`Added “${habit.name}”`);
    } catch { showToast('Could not add the habit. Try again.'); }
  };

  const archiveHabit = async (h) => {
    try { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', h.id), { archived: true }, { merge: true }); showToast('Habit archived'); }
    catch { showToast('Could not archive the habit'); }
  };
  const deleteHabit = async (h) => {
    if (!window.confirm(`Delete “${h.name}”? Past records stay, but the habit is removed.`)) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', h.id)); showToast('Habit deleted'); }
    catch { showToast('Could not delete the habit'); }
  };

  // ---- derived
  // Keep legacy Islamic habits out of the general Track Habits checklist.
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived && h.category !== 'Islamic Routine' && !['def-2','def-3','def-4','def-5','def-6','def-7'].includes(h.id)), [habits]);
  const userTrackHabits = useMemo(() => activeHabits.filter((h) => !/^def-/.test(h.id)), [activeHabits]);
  const trackCategories = useMemo(() => [...new Set(['Discipline', 'Physical Health', ...customCategories, ...userTrackHabits.map((h) => h.category).filter(Boolean)])], [customCategories, userTrackHabits]);
  const booleanHabits = useMemo(() => userTrackHabits.filter((h) => h.type === 'boolean'), [userTrackHabits]);

  // On a past day, anything not marked "done" counts as "missed"
  const getStatus = (k, habitId) => {
    const s = dailyRecords[k]?.statuses?.[habitId];
    if (s === 'done' || s === 'missed') return s;
    return isLocked(k) ? 'missed' : 'empty';
  };

  const getDayMetrics = (k) => {
    let completed = 0, missed = 0, pending = 0;
    booleanHabits.forEach((h) => {
      const s = getStatus(k, h.id);
      if (s === 'done') completed++; else if (s === 'missed') missed++; else pending++;
    });
    const total = booleanHabits.length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, missed, pending, pct };
  };

  const today = useMemo(() => getDayMetrics(todayKey), [dailyRecords, booleanHabits, todayKey]);

  const analytics = useMemo(() => {
    const last14 = Array.from({ length: 14 }, (_, i) => addDays(todayKey, -(13 - i)));
    const avg = (n) => Math.round(Array.from({ length: n }, (_, i) => getDayMetrics(addDays(todayKey, -i)).pct).reduce((a, b) => a + b, 0) / n);
    const dates = Object.keys(dailyRecords).sort();
    let best = 0, run = 0;
    if (dates.length) {
      let c = dates[0];
      while (c <= todayKey) {
        if (getDayMetrics(c).pct >= 70) { run++; best = Math.max(best, run); }
        else if (c !== todayKey) run = 0;
        c = addDays(c, 1);
      }
    }
    let current = 0;
    let back = getDayMetrics(todayKey).pct < 70 ? addDays(todayKey, -1) : todayKey;
    while (dailyRecords[back] && getDayMetrics(back).pct >= 70) { current++; back = addDays(back, -1); }
    const overall = dates.length ? Math.round(dates.reduce((s, k) => s + getDayMetrics(k).pct, 0) / dates.length) : 0;
    return { last14, weekly: avg(7), monthly: avg(30), current, best: Math.max(best, current), overall };
  }, [dailyRecords, booleanHabits, todayKey]);

  const quote = getQuoteForDate(todayKey);
  const goDay = (k) => { setSelectedDate(k); setActiveTab('tracker'); };

  // ============================== RENDER ==============================
  if (authLoading) {
    return (
      <div className="hx auth">
        <style>{STYLES}</style>
        <p className="serif mute" style={{ fontSize: 24 }}>Loading your day…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="hx auth">
        <style>{STYLES}</style>
        <div className="card rise">
          <h1 className="serif" style={{ fontSize: 42, lineHeight: 1.1 }}>Rise early.<br />Stay steady.</h1>
          <Ornament />
          <p className="mute sm" style={{ marginTop: 14 }}>HabitX tracks your prayers, discipline, health and creative work in one daily checklist.</p>
          {authError && (<div className="err"><AlertCircle size={16} style={{ flexShrink: 0 }} /><span>{authError}</span></div>)}
          <form onSubmit={handleEmailAuth} className="form" style={{ marginTop: 24 }}>
            {authMode === 'signup' && (<input className="input" required placeholder="Your name" aria-label="Your name" value={authName} onChange={(e) => setAuthName(e.target.value)} />)}
            <input className="input" type="email" required placeholder="Email" aria-label="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
            <input className="input" type="password" required placeholder="Password" aria-label="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
            <button type="submit" disabled={authSubmitting} className="btn full">{authSubmitting ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}</button>
          </form>
          <button onClick={handleGuest} disabled={authSubmitting} className="ghost full" style={{ marginTop: 12 }}>Continue as guest</button>
          <div className="center" style={{ marginTop: 20 }}>
            <button className="link" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}>
              {authMode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const firstName = (user.displayName || '').split(' ')[0];
  const lockedDay = isLocked(selectedDate);
  const monthLabel = monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstWeekday = monthCursor.getDay();
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) =>
    getLocalDateKey(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), i + 1)))];

  return (
    <div className="hx">
      <style>{STYLES}</style>
      {toast && <div role="status" className="card toast">{toast}</div>}

      <div className="wrap">
        <header className="row between top">
          <p className="row g8 mute xs"><Cloud size={14} />{syncStatus === 'synced' ? 'Saved' : syncStatus === 'syncing' ? 'Saving…' : 'Not saved. Check your connection.'}</p>
          <button onClick={handleLogout} className="ghost"><LogOut size={14} />Sign out</button>
        </header>

        {activeTab === 'today' && (
          <div className="stack rise">
            <p className="bismillah" lang="ar" dir="rtl">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>

            <section className="card hero">
              <p className="mute sm">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
              <SunArc pct={today.pct} />
              <div className="num serif">{today.pct}<small>%</small></div>
              <p className="mute sm" style={{ marginTop: 8 }}>{today.completed} of {today.total} done · {formatDisplayDate(todayKey)}</p>
              <button className="btn" onClick={() => { setSelectedDate(todayKey); setActiveTab('tracker'); }}>Open today’s checklist</button>
            </section>

            <section className="card strip">
              <div><p className="v serif"><Flame size={20} />{analytics.current}</p><p className="l">day streak</p></div>
              <div><p className="v serif">{analytics.weekly}%</p><p className="l">last 7 days</p></div>
              <div><p className="v serif">{analytics.best}</p><p className="l">best streak</p></div>
            </section>

            <blockquote className="quote center">
              <Ornament style={{ margin: '0 auto 14px', maxWidth: 160 }} />
              <p className="serif">“{quote.text}”</p>
              <footer>{quote.author}</footer>
            </blockquote>
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="stack rise">
            <div className="row between" style={{ flexWrap: 'wrap', gap: 12 }}>
              <PageTitle>{selectedDate === todayKey ? 'Track Habits' : formatDisplayDate(selectedDate)}</PageTitle>
              <div className="row g8">
                <button className="ghost icon" aria-label="Previous day" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft size={16} /></button>
                <input type="date" className="date" aria-label="Pick a date" value={selectedDate} onChange={(e) => e.target.value && setSelectedDate(e.target.value)} />
                <button className="ghost icon" aria-label="Next day" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight size={16} /></button>
              </div>
            </div>

            {lockedDay ? (
              <p className="lock-note"><Lock size={14} style={{ flexShrink: 0 }} />This day has passed and is locked. Habits you didn’t finish count as missed.</p>
            ) : (
              <p className="mute xs">Tap the circle to cycle: pending, done, missed.</p>
            )}

            <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
              <p className="mute xs">Organise your daily habits into sections.</p>
              <button className="ghost" onClick={() => setShowCategoryForm((v) => !v)}><Plus size={14} />Add section</button>
            </div>
            {showCategoryForm && (
              <form onSubmit={handleAddCategory} className="card form">
                <h3 className="t">Create a section</h3>
                <input className="input" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Learning" aria-label="New section name" required />
                <div className="row g8"><button type="submit" className="btn"><Plus size={15} />Add section</button><button type="button" className="ghost" onClick={() => { setShowCategoryForm(false); setNewCategoryName(''); }}>Cancel</button></div>
              </form>
            )}

            {trackCategories.map((cat) => {
              const list = userTrackHabits.filter((h) => h.category === cat);
              return (
                <section key={cat} className="card" style={{ padding: '20px 18px' }}>
                  <div className="row between" style={{ marginBottom: 12 }}>
                    <h3 className="t">{cat}</h3>
                    <button className="ghost" onClick={() => { setNewHabitCategory(cat); setOpenHabitCategory((current) => current === cat ? null : cat); setNewHabitName(''); setNewHabitType('boolean'); }}><Plus size={14} />Add habit</button>
                  </div>
                  {openHabitCategory === cat && (
                    <form onSubmit={handleAddHabit} className="form" style={{ marginBottom: 14, padding: 12, borderRadius: 14, background: 'rgba(233,185,73,.06)' }}>
                      <input className="input" required placeholder="Habit name" aria-label={`Habit name in ${cat}`} value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} />
                      <div className="two">
                        <select className="input" aria-label="Habit type" value={newHabitType} onChange={(e) => setNewHabitType(e.target.value)}>
                          <option value="boolean">Done / missed</option><option value="numeric">Count</option>
                        </select>
                        {newHabitType === 'numeric' && <input className="input" type="number" min="1" aria-label="Daily target" placeholder="Daily target" value={newHabitTarget} onChange={(e) => setNewHabitTarget(e.target.value)} />}
                      </div>
                      <div className="row g8"><button type="submit" className="btn"><Plus size={15} />Save habit</button><button type="button" className="ghost" onClick={() => setOpenHabitCategory(null)}>Cancel</button></div>
                    </form>
                  )}
                  {list.length === 0 ? <p className="mute xs">No habits in this section yet. Use “Add habit” to create one.</p> : (
                    <ul>
                      {list.map((h) => {
                        const val = dailyRecords[selectedDate]?.statuses?.[h.id];
                        if (h.type === 'numeric') return (
                          <li key={h.id} className="item">
                            <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 600, fontSize: 14.5 }}>{h.name}</p><p className="mute xs">Target {h.target || 100} per day</p></div>
                            <input type="number" min="0" inputMode="numeric" className="input count" value={val || ''} placeholder="0" aria-label={`${h.name} count`} disabled={lockedDay} onChange={(e) => updateHabitStatus(selectedDate, h.id, Number(e.target.value) || 0)} />
                            <button type="button" className="ghost" style={{ color: 'var(--pink)', padding: '7px 9px', flexShrink: 0 }} aria-label={`Remove ${h.name}`} onClick={() => deleteHabit(h)}>Remove</button>
                          </li>
                        );
                        const status = getStatus(selectedDate, h.id);
                        return (
                          <li key={h.id} className={`habit ${status === 'done' ? 'done' : ''} ${lockedDay ? 'locked' : ''}`} onClick={() => !lockedDay && cycleHabit(selectedDate, h.id)}>
                            <StateButton status={status} disabled={lockedDay} onClick={(e) => { e.stopPropagation(); cycleHabit(selectedDate, h.id); }} />
                            <span className="name">{h.name}</span>
                            {status === 'missed' && <span className="pink xs">Missed</span>}
                            <button type="button" className="ghost" style={{ color: 'var(--pink)', padding: '7px 9px', flexShrink: 0 }} aria-label={`Remove ${h.name}`} onClick={(e) => { e.stopPropagation(); deleteHabit(h); }}>Remove</button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}

            <section className="card">
              <h3 className="t" style={{ marginBottom: 12 }}>Journal</h3>

              {lockedDay ? (
                noteLines.length ? (
                  <ul className="notes">
                    {noteLines.map((l, i) => (<li key={i}><b className="dot" /><span className="note-text">{l}</span></li>))}
                  </ul>
                ) : <p className="mute sm">No notes for this day.</p>
              ) : (
                <>
                  <ul className="notes">
                    {noteLines.map((l, i) => (
                      <li key={i}>
                        <b className="dot" />
                        <input className="note-input" value={l} autoFocus={i === focusIdx}
                          placeholder="Write a note…" aria-label={`Note ${i + 1}`}
                          onChange={(e) => handleLineChange(i, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(i); } }} />
                        <button className="ghost icon sm" aria-label={`Remove note ${i + 1}`} onClick={() => removeLine(i)}><X size={14} /></button>
                      </li>
                    ))}
                  </ul>
                  <button className="ghost" style={{ marginTop: 12 }} onClick={() => addLine()}><Plus size={14} />Add a line</button>
                </>
              )}
            </section>
          </div>
        )}

        {activeTab === 'islamic' && (
          <div className="stack rise">
            <PageTitle>Islamic</PageTitle>
            <div className="row g8" style={{ padding: 5, borderRadius: 18, background: 'rgba(233,185,73,.08)', border: '1px solid rgba(233,185,73,.2)' }}>
              <button className={`ghost full ${islamicSection === 'prayer' ? 'on' : ''}`} style={islamicSection === 'prayer' ? { background: 'linear-gradient(135deg,#ffe58a,#ffc533)', color: '#0b2e27' } : {}} onClick={() => setIslamicSection('prayer')}><Sunrise size={15} />Prayer</button>
              <button className={`ghost full ${islamicSection === 'surah' ? 'on' : ''}`} style={islamicSection === 'surah' ? { background: 'linear-gradient(135deg,#ffe58a,#ffc533)', color: '#0b2e27' } : {}} onClick={() => setIslamicSection('surah')}><BookOpen size={15} />Surah</button>
            </div>

            {islamicSection === 'prayer' && (
              <div className="stack">
                <form onSubmit={savePrayerCity} className="card form">
                  <h3 className="t">Prayer location</h3>
                  <p className="mute xs">Enter your city to fetch local prayer times. The default is Dadri; change it if needed.</p>
                  <div className="row g8">
                    <input className="input grow" value={prayerCityDraft} onChange={(e) => setPrayerCityDraft(e.target.value)} placeholder="City, e.g. Noida" aria-label="Prayer city" required />
                    <button type="submit" className="btn">Save</button>
                  </div>
                  {prayerLoading && <p className="mute xs">Fetching prayer times…</p>}
                  {prayerError && <p className="pink xs">{prayerError}</p>}
                </form>

                <section className="card">
                  <div className="row between" style={{ marginBottom: 8 }}><h3 className="t">Today’s prayer times</h3><span className="sun xs">{prayerCity}, India</span></div>
                  <p className="mute xs" style={{ marginBottom: 12 }}>Mark each prayer after its time. If you do not mark it before the next prayer time (or sunrise for Fajr), it changes to Missed automatically.</p>
                  {!prayerSchedule && !prayerLoading ? <p className="mute sm">Prayer times will appear here after the city is set.</p> : null}
                  {prayerRows.map((prayer) => (
                    <div className="item" key={prayer.id} style={{ borderTop: '1px solid rgba(233,185,73,.14)' }}>
                      <div className="grow">
                        <p style={{ fontWeight: 700 }}>{prayer.name}</p>
                        <p className="mute xs">{prayer.id === 'tahajjud' ? 'Night prayer · after Isha and before Fajr' : `Starts ${displayPrayerTime(prayer.time)}`} · Deadline: {prayer.deadlineLabel}</p>
                      </div>
                      <div className="row g8">
                        {prayer.status === 'done' ? <span className="sun xs">Done ✓</span> : prayer.status === 'missed' ? <span className="pink xs">Missed</span> : prayer.available ? <button className="ghost" onClick={() => markPrayerDone(prayer.id)}>Mark done</button> : <span className="mute xs">Upcoming</span>}
                      </div>
                    </div>
                  ))}
                  <p className="mute xs" style={{ marginTop: 12 }}>Calculation: Karachi method (1), Hanafi Asr. Timings may differ from your local mosque; follow your mosque’s timetable if it differs.</p>
                </section>
              </div>
            )}

            {islamicSection === 'surah' && (
              <div className="stack">
                <section className="card">
                  <h3 className="t">This week’s recitation cycle</h3>
                  <p className="serif sun" style={{ fontSize: 25, marginTop: 8 }}>Wednesday 8 PM → Wednesday 8 PM</p>
                  <p className="mute xs" style={{ marginTop: 8 }}>{formatCycleDateTime(currentSurahCycle.start)} to {formatCycleDateTime(currentSurahCycle.end)}</p>
                  <p className="mute xs" style={{ marginTop: 10 }}>Each cycle is saved separately. Your previous weeks’ counts will not be erased.</p>
                </section>
                <form onSubmit={handleAddSurah} className="card form">
                  <h3 className="t">Add a Surah</h3>
                  <input className="input" value={newSurahName} onChange={(e) => setNewSurahName(e.target.value)} placeholder="e.g. Surah Al-Kahf" aria-label="Surah name" required />
                  <button type="submit" className="btn"><Plus size={16} />Add Surah</button>
                </form>
                <section className="card">
                  <div className="row between" style={{ marginBottom: 8 }}><h3 className="t">Your recitation counts</h3><span className="sun xs">{currentSurahs.reduce((sum, s) => sum + Number(s.total || 0), 0)} total</span></div>
                  {currentSurahs.length === 0 ? <p className="mute sm" style={{ padding: '14px 4px' }}>No Surahs added yet. Add a Surah above to start counting.</p> : currentSurahs.map((surah) => (
                    <div className="surah-row" key={surah.id}>
                      <div className="grow"><p style={{ fontWeight: 700 }}>{surah.name}</p><p className="mute xs">Today: {Number(surah.dailyCounts?.[getLocalDateKey(clockNow)] || 0)} · This cycle: {Number(surah.total || 0)}</p><p className="mute xs" style={{ marginTop: 4 }}>Daily log: {Object.entries(surah.dailyCounts || {}).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => `${day}: ${count}`).join(' · ') || 'No recitations counted yet'}</p></div>
                      <button type="button" className="surah-action" aria-label={`Decrease ${surah.name} count`} onClick={() => changeSurahCount(surah.id, -1)}>−</button><span className="surah-count">{Number(surah.total || 0)}</span><button type="button" className="surah-action" aria-label={`Increase ${surah.name} count`} onClick={() => changeSurahCount(surah.id, 1)}>+</button>
                    </div>
                  ))}
                </section>
                <section className="card">
                  <h3 className="t" style={{ marginBottom: 10 }}>Previous weeks</h3>
                  {Object.values(surahCycles).filter((c) => c.cycleId !== currentSurahCycle.id && Array.isArray(c.surahs) && c.surahs.length).sort((a, b) => (b.startAt || 0) - (a.startAt || 0)).length === 0 ? <p className="mute sm">Your completed weekly counts will appear here after your first cycle.</p> : Object.values(surahCycles).filter((c) => c.cycleId !== currentSurahCycle.id && Array.isArray(c.surahs) && c.surahs.length).sort((a, b) => (b.startAt || 0) - (a.startAt || 0)).map((cycle) => (
                    <div key={cycle.cycleId} style={{ padding: '12px 2px', borderTop: '1px solid rgba(233,185,73,.14)' }}><p style={{ fontWeight: 700 }}>{formatCycleDateTime(new Date(cycle.startAt))} – {formatCycleDateTime(new Date(cycle.endAt))}</p>{cycle.surahs.map((surah) => <div key={surah.id} style={{ marginTop: 7 }}><p className="mute xs">{surah.name}: <span className="sun">{Number(surah.total || 0)}</span></p><p className="mute xs">Daily: {Object.entries(surah.dailyCounts || {}).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => `${day}: ${count}`).join(' · ') || 'No daily details'}</p></div>)}</div>
                  ))}
                </section>
              </div>
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="stack rise">
            <div className="row between">
              <PageTitle>{monthLabel}</PageTitle>
              <div className="row g8">
                <button className="ghost icon" aria-label="Previous month" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
                <button className="ghost icon" aria-label="Next month" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
              </div>
            </div>
            <section className="card">
              <div className="cal-head">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
              <div className="cal">
                {cells.map((k, i) => {
                  if (!k) return <span key={`e${i}`} />;
                  const logged = !!dailyRecords[k];
                  const pct = getDayMetrics(k).pct;
                  return (
                    <button key={k} className="day" onClick={() => goDay(k)} aria-label={`${formatDisplayDate(k)}: ${pct}% complete`}
                      style={{
                        background: logged ? `linear-gradient(145deg,rgba(255,229,138,${0.14 + (pct / 100) * 0.86}),rgba(233,166,42,${0.10 + (pct / 100) * 0.9}))` : 'rgba(233,185,73,.07)',
                        color: logged && pct > 55 ? '#0b2e27' : '#f7ecd0',
                        boxShadow: k === todayKey ? '0 0 0 2px #fff0b0' : 'none',
                      }}>{parseDateKey(k).getDate()}</button>
                  );
                })}
              </div>
              <p className="mute xs" style={{ marginTop: 16 }}>Brighter days mean more habits done. Tap a day to view it.</p>
            </section>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stack rise">
            <PageTitle>Your consistency</PageTitle>
            <section className="card strip">
              <div><p className="v serif">{analytics.weekly}%</p><p className="l">7-day average</p></div>
              <div><p className="v serif">{analytics.monthly}%</p><p className="l">30-day average</p></div>
              <div><p className="v serif">{analytics.overall}%</p><p className="l">all time</p></div>
            </section>
            <section className="card">
              <h3 className="t" style={{ marginBottom: 20 }}>Last 14 days</h3>
              <div className="bars">
                {analytics.last14.map((k) => {
                  const pct = getDayMetrics(k).pct;
                  return (
                    <div key={k} title={`${formatDisplayDate(k)}: ${pct}%`}>
                      <i style={{ height: `${Math.max(pct, 4)}%`, background: pct ? 'linear-gradient(180deg,#ffe58a,#e9a62a)' : 'rgba(233,185,73,.12)' }} />
                      <span>{parseDateKey(k).getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}


      </div>

      <nav aria-label="Main" className="nav">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={activeTab === id ? 'on' : ''} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined}>
            <Icon size={17} />{activeTab === id && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}