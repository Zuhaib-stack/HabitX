import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, writeBatch } from 'firebase/firestore';
import {
  Sunrise, ListChecks, CalendarDays, BarChart3, SlidersHorizontal, Check, X,
  ChevronLeft, ChevronRight, Flame, LogOut, Plus, Archive, Trash2, AlertCircle, Cloud, Lock
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
const DEFAULT_HABITS = [
  { id: 'def-1', name: 'Wake up at 4:00 AM', type: 'boolean', category: 'Discipline', order: 1, archived: false },
  { id: 'def-2', name: 'Fajr + Yaseen', type: 'boolean', category: 'Islamic Routine', order: 2, archived: false },
  { id: 'def-3', name: 'Zohar', type: 'boolean', category: 'Islamic Routine', order: 3, archived: false },
  { id: 'def-4', name: 'Asr', type: 'boolean', category: 'Islamic Routine', order: 4, archived: false },
  { id: 'def-5', name: 'Maghrib + Waqiya', type: 'boolean', category: 'Islamic Routine', order: 5, archived: false },
  { id: 'def-6', name: 'Isha + Mulk', type: 'boolean', category: 'Islamic Routine', order: 6, archived: false },
  { id: 'def-7', name: 'Number of Durood Shareef', type: 'numeric', category: 'Islamic Routine', order: 7, target: 100, archived: false },
  { id: 'def-8', name: 'Running', type: 'boolean', category: 'Physical Health', order: 8, archived: false },
  { id: 'def-9', name: 'Healthy Breakfast', type: 'boolean', category: 'Physical Health', order: 9, archived: false },
  { id: 'def-10', name: 'One Video (Content Creation)', type: 'boolean', category: 'Content Creation', order: 10, archived: false },
  { id: 'def-11', name: 'Sleep After 11 PM', type: 'boolean', category: 'Discipline', order: 11, archived: false },
];

const QUOTES = [
  { text: "The most beloved deeds to Allah are those that are most consistent, even if they are small.", author: "Prophet Muhammad ﷺ (Sahih al-Bukhari)" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Take advantage of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your busyness, and your life before your death.", author: "Hadith (Al-Hakim)" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Indeed, prayer has been decreed upon the believers a decree of specified times.", author: "Surah An-Nisa (4:103)" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Guard strictly your prayers, especially the middle prayer, and stand before Allah with devotion.", author: "Surah Al-Baqarah (2:238)" },
];

const CATEGORIES = ['Islamic Routine', 'Discipline', 'Physical Health', 'Content Creation', 'Personal Growth'];

const TABS = [
  { id: 'today', label: 'Today', icon: Sunrise },
  { id: 'tracker', label: 'Track', icon: ListChecks },
  { id: 'calendar', label: 'Month', icon: CalendarDays },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'manage', label: 'Habits', icon: SlidersHorizontal },
];

// ============================================================================
// HELPERS
// ============================================================================
const getLocalDateKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDateKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseDateKey(k); d.setDate(d.getDate() + n); return getLocalDateKey(d); };
const formatDisplayDate = (k) =>
  parseDateKey(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const getQuoteForDate = (k) =>
  QUOTES[k.split('-').reduce((a, v) => a + parseInt(v, 10), 0) % QUOTES.length];
const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Before the dawn' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// ============================================================================
// STYLES: plain CSS only (no Tailwind needed)
// Palette: ink #130e07 · honey #ffd24a · amber #ffb703 · ember #ff8f1f · butter #fff1b8
// ============================================================================
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap');
html,body,#root{margin:0;min-height:100%;background:#130e07}
.hx,.hx *{box-sizing:border-box}
.hx{font-family:'Manrope',system-ui,sans-serif;color:#fbf3e2;min-height:100vh;font-size:15px;line-height:1.45;
  background-color:#130e07;
  background-image:
    radial-gradient(900px 520px at 50% -12%,rgba(255,200,40,.34),transparent 70%),
    radial-gradient(700px 420px at 105% 8%,rgba(255,124,30,.20),transparent 70%),
    radial-gradient(600px 400px at -10% 55%,rgba(255,214,90,.10),transparent 70%);
  background-attachment:fixed}
.hx h1,.hx h2,.hx h3,.hx p,.hx blockquote,.hx ul{margin:0;padding:0}
.hx ul{list-style:none}
.hx button{font-family:inherit;color:#fbf3e2;background:none;border:0;cursor:pointer;padding:0}
.hx input,.hx select,.hx textarea{font-family:inherit}
.serif{font-family:'Fraunces',Georgia,serif;font-weight:400;letter-spacing:-.01em}
.mute{color:#b9ab8d}.sun{color:#ffd24a}.coral{color:#ff9a4d}.pink{color:#ff9a86}
.xs{font-size:12px}.sm{font-size:13.5px}
.row{display:flex;align-items:center}.between{justify-content:space-between}.end{align-items:flex-end}
.g8{gap:8px}.g12{gap:12px}.g16{gap:16px}
.center{text-align:center}.grow{flex:1;min-width:0}
.stack>*+*{margin-top:18px}.form>*+*{margin-top:12px}

.wrap{max-width:720px;margin:0 auto;padding:28px 20px 140px}
.top{margin-bottom:28px}
.card{background:linear-gradient(180deg,rgba(62,44,12,.78),rgba(30,21,8,.82));border:1px solid rgba(255,210,90,.14);border-radius:28px;padding:24px;box-shadow:0 20px 50px -25px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,236,170,.08)}
.card h3.t{font-size:14px;font-weight:700;color:#ffd24a;margin-bottom:6px}
.page-title{font-size:34px;line-height:1.1;background:linear-gradient(135deg,#fff1b8,#ffc72c 60%,#ff9f1c);-webkit-background-clip:text;background-clip:text;color:transparent}

/* Hero: the one bright, memorable surface */
.hero{text-align:center;padding:30px 24px 28px;color:#2a1a05;border:0;
  background:linear-gradient(150deg,#ffeb8a 0%,#ffcd2e 48%,#ff9f1c 100%);
  box-shadow:0 30px 70px -28px rgba(255,170,20,.65),inset 0 1px 0 rgba(255,255,255,.55)}
.hero .mute{color:rgba(42,26,5,.72)}
.hero .num{font-size:64px;line-height:1;margin-top:-58px;position:relative;color:#2a1a05}
.hero .num small{font-size:24px;color:rgba(42,26,5,.65)}
.hero .btn{margin-top:24px;background:#2a1a05!important;color:#ffd84d!important;box-shadow:0 12px 26px -10px rgba(42,26,5,.7)}
.hero .btn:hover{box-shadow:0 16px 30px -10px rgba(42,26,5,.85)}
.arc{display:block;width:100%;max-width:380px;margin:10px auto 0}

.strip{display:grid;grid-template-columns:repeat(3,1fr);padding:22px 8px;text-align:center}
.strip>div+div{border-left:1px solid rgba(255,210,90,.14)}
.strip .v{font-size:30px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#fff1b8,#ffc72c);-webkit-background-clip:text;background-clip:text;color:transparent}
.strip .v svg{color:#ff9a4d}
.strip .l{font-size:12px;color:#b9ab8d;margin-top:4px}
.bar{height:10px;border-radius:999px;background:rgba(255,236,170,.10);overflow:hidden;margin-top:16px}
.bar>div{height:100%;border-radius:999px;background:linear-gradient(90deg,#ffe27a,#ffb703,#ff8f1f);transition:width .6s ease;box-shadow:0 0 14px rgba(255,183,3,.55)}
.quote{padding:10px 6px}.quote p{font-size:21px;line-height:1.35}.quote footer{font-size:12px;color:#ffd24a;margin-top:12px}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#ffe27a,#ffb703 55%,#ff9a1f)!important;color:#2a1a05!important;font-weight:800;font-size:14px;border-radius:999px;padding:14px 26px;box-shadow:0 10px 28px -8px rgba(255,170,20,.6);transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-2px);box-shadow:0 14px 32px -8px rgba(255,170,20,.8)}
.btn:active{transform:translateY(0)}.btn:disabled{opacity:.5;transform:none}
.btn.full{width:100%}
.ghost{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,226,130,.07)!important;border:1px solid rgba(255,210,90,.16)!important;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:600;transition:background .15s,border-color .15s}
.ghost:hover{background:rgba(255,226,130,.14)!important;border-color:rgba(255,210,74,.5)!important}
.ghost.full{width:100%;padding:13px}
.ghost.icon{width:40px;height:40px;padding:0}
.ghost.danger:hover{background:rgba(255,110,80,.18)!important;border-color:rgba(255,110,80,.55)!important;color:#ff9a86}
.link{font-size:13px;color:#b9ab8d!important}.link:hover{color:#ffd24a!important}

.input{display:block;width:100%;background:rgba(19,14,7,.75);border:1px solid rgba(255,210,90,.16);border-radius:16px;padding:13px 16px;color:#fbf3e2;font-size:14.5px;outline:none;transition:border-color .15s,box-shadow .15s}
.input::placeholder{color:#857a62}
.input:focus{border-color:#ffd24a;box-shadow:0 0 0 4px rgba(255,210,74,.14)}
.input:disabled,.input[readonly]{opacity:.6;cursor:not-allowed}
select.input{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:40px;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23b9ab8d' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 16px center}
select.input option{background:#1e1508;color:#fbf3e2}
textarea.input{resize:none;line-height:1.5}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.count{width:96px;text-align:center;font-weight:700}
.date{background:transparent;border:0;color:#fbf3e2;font-size:13px;font-weight:600;cursor:pointer;color-scheme:dark;width:122px;outline:none}
.err{display:flex;gap:10px;margin-top:20px;padding:12px 14px;border-radius:16px;background:rgba(255,110,80,.10);border:1px solid rgba(255,110,80,.32);color:#ff9a86;font-size:12.5px}
.lock-note{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:16px;background:rgba(255,210,74,.08);border:1px solid rgba(255,210,74,.22);color:#ffd24a;font-size:12.5px}

.habit{display:flex;align-items:center;gap:16px;padding:14px 6px;cursor:pointer;border-radius:16px;transition:background .15s}
.habit+.habit,.item+.item{border-top:1px solid rgba(255,210,90,.10)}
.habit:hover{background:rgba(255,226,130,.05)}
.habit .name{flex:1;font-weight:600;font-size:14.5px}
.habit.done .name{color:#b9ab8d;text-decoration:line-through;text-decoration-color:rgba(255,210,74,.7)}
.habit.locked{cursor:default}
.habit.locked:hover{background:transparent}
.circle{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s}
.circle:hover{transform:scale(1.08)}
.circle:disabled{cursor:default}
.circle:disabled:hover{transform:none}
.item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 6px}

.cal-head{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;text-align:center;font-size:11px;color:#b9ab8d;margin-bottom:8px}
.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.day{aspect-ratio:1;border-radius:16px;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:transform .15s}
.day:hover{transform:scale(1.07)}
.bars{display:flex;align-items:flex-end;gap:6px;height:170px}
.bars>div{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px}
.bars i{display:block;width:100%;border-radius:999px;transition:height .5s}
.bars span{font-size:10px;color:#b9ab8d}

.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:60;padding:11px 20px;border-radius:999px;font-size:13px;font-weight:600}
.nav{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:50;display:flex;gap:4px;padding:6px;border-radius:999px;border:1px solid rgba(255,210,90,.18);background:rgba(30,21,8,.88);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 20px 40px -10px rgba(0,0,0,.75);margin-bottom:env(safe-area-inset-bottom,0px)}
.nav button{display:flex;align-items:center;gap:8px;border-radius:999px;padding:11px 15px;font-size:13px;font-weight:700;color:#b9ab8d;transition:all .2s}
.nav button:hover{color:#fbf3e2}
.nav button.on{background:linear-gradient(135deg,#ffe27a,#ffb703 55%,#ff9a1f);color:#2a1a05;box-shadow:0 8px 20px -6px rgba(255,170,20,.7)}
.auth{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.auth .card{width:100%;max-width:420px;padding:34px 30px}
.auth h1{background:linear-gradient(135deg,#fff1b8,#ffc72c 55%,#ff9f1c);-webkit-background-clip:text;background-clip:text;color:transparent}
.rise{animation:rise .6s ease-out both}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.hx button:focus-visible,.hx input:focus-visible,.hx select:focus-visible{outline:2px solid #ffd24a;outline-offset:2px}
@media (max-width:480px){.page-title{font-size:28px}.hero .num{font-size:54px}.nav button{padding:11px 12px}.two{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.rise{animation:none}*{transition:none!important}}
`;

// ============================================================================
// SMALL COMPONENTS
// ============================================================================
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
        <linearGradient id="arcg" x1="0" x2="1"><stop offset="0" stopColor="#7a3b00" /><stop offset="1" stopColor="#2a1a05" /></linearGradient>
        <radialGradient id="glow"><stop offset="0" stopColor="#fffbe6" stopOpacity="1" /><stop offset="1" stopColor="#fffbe6" stopOpacity="0" /></radialGradient>
      </defs>
      <path d={d} fill="none" stroke="rgba(42,26,5,.16)" strokeWidth="14" strokeLinecap="round" />
      <path d={d} fill="none" stroke="url(#arcg)" strokeWidth="14" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} style={{ transition: 'stroke-dashoffset .9s ease' }} />
      <circle cx={x} cy={y} r="28" fill="url(#glow)" />
      <circle cx={x} cy={y} r="9" fill="#fffdf2" stroke="#2a1a05" strokeWidth="2" />
      <line x1="10" x2="250" y1={cy + 8} y2={cy + 8} stroke="rgba(42,26,5,.2)" />
    </svg>
  );
}

function StateButton({ status, onClick, disabled }) {
  const look = status === 'done'
    ? { background: 'linear-gradient(135deg,#ffe27a,#ffb703)', borderColor: '#ffd24a', color: '#2a1a05' }
    : status === 'missed'
    ? { background: 'rgba(255,110,80,.18)', borderColor: 'rgba(255,110,80,.6)', color: '#ff9a86' }
    : { background: 'transparent', borderColor: 'rgba(255,226,130,.3)', color: 'transparent' };
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
  const [userSettings, setUserSettings] = useState({ duroodTarget: 100 });

  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('boolean');
  const [newHabitCategory, setNewHabitCategory] = useState('Discipline');
  const [newHabitTarget, setNewHabitTarget] = useState(100);

  const [noteDraft, setNoteDraft] = useState('');
  const noteTimeoutRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  // ---- midnight rollover
  useEffect(() => {
    const t = setInterval(() => {
      const k = getLocalDateKey();
      setTodayKey((prev) => (prev === k ? prev : k));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  // ---- auth
  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }), []);

  // ---- data
  useEffect(() => {
    if (!user) { setHabits([]); setDailyRecords({}); return; }
    const uid = user.uid;
    const base = ['artifacts', appId, 'users', uid];

    const unsubHabits = onSnapshot(collection(db, ...base, 'habits'), async (snap) => {
      if (snap.empty) {
        try {
          const batch = writeBatch(db);
          DEFAULT_HABITS.forEach((h) => batch.set(doc(db, ...base, 'habits', h.id), { ...h, createdAt: Date.now() }));
          await batch.commit();
        } catch (err) { console.error(err); }
      } else {
        const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
        setHabits(loaded);
      }
    });
    const unsubRecords = onSnapshot(collection(db, ...base, 'dailyRecords'), (snap) => {
      const recs = {};
      snap.docs.forEach((d) => { recs[d.id] = d.data(); });
      setDailyRecords(recs);
      setSyncStatus('synced');
    });
    const unsubSettings = onSnapshot(doc(db, ...base, 'settings', 'preferences'), (s) => {
      if (s.exists()) setUserSettings((p) => ({ ...p, ...s.data() }));
    });
    return () => { unsubHabits(); unsubRecords(); unsubSettings(); };
  }, [user]);

  useEffect(() => { setNoteDraft(dailyRecords[selectedDate]?.note || ''); }, [selectedDate, dailyRecords[selectedDate]?.note]);

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

  const handleNoteChange = (val) => {
    if (isLocked(selectedDate)) return;
    const dateAtEdit = selectedDate; // a delayed save must never land on a different day
    setNoteDraft(val);
    clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(async () => {
      if (!user || isLocked(dateAtEdit)) return;
      try {
        const existing = dailyRecords[dateAtEdit] || { statuses: {} };
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', dateAtEdit),
          { date: dateAtEdit, statuses: existing.statuses || {}, note: val, updatedAt: Date.now() }, { merge: true });
      } catch (err) { console.error(err); }
    }, 600);
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
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const booleanHabits = useMemo(() => activeHabits.filter((h) => h.type === 'boolean'), [activeHabits]);
  const duroodHabit = useMemo(() => activeHabits.find((h) => h.id === 'def-7') || activeHabits.find((h) => h.type === 'numeric'), [activeHabits]);

  // On a past day, anything not marked "done" counts as "missed"
  const getStatus = (k, habitId) => {
    const s = dailyRecords[k]?.statuses?.[habitId];
    if (s === 'done' || s === 'missed') return s;
    return isLocked(k) ? 'missed' : 'empty';
  };

  const getDayMetrics = (k) => {
    const rec = dailyRecords[k]?.statuses || {};
    let completed = 0, missed = 0, pending = 0;
    booleanHabits.forEach((h) => {
      const s = getStatus(k, h.id);
      if (s === 'done') completed++; else if (s === 'missed') missed++; else pending++;
    });
    const total = booleanHabits.length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const duroodCount = duroodHabit ? Number(rec[duroodHabit.id] || 0) : 0;
    const duroodTarget = duroodHabit?.target || userSettings.duroodTarget || 100;
    return { total, completed, missed, pending, pct, duroodCount, duroodTarget, duroodPct: Math.min(100, Math.round((duroodCount / duroodTarget) * 100)) };
  };

  const today = useMemo(() => getDayMetrics(todayKey), [dailyRecords, booleanHabits, duroodHabit, userSettings, todayKey]);

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
  }, [dailyRecords, booleanHabits, duroodHabit, todayKey]);

  const quote = getQuoteForDate(todayKey);
  const goDay = (k) => { setSelectedDate(k); setActiveTab('tracker'); };

  // ============================== RENDER ==============================
  if (authLoading) {
    return (
      <div className="hx auth">
        <style>{STYLES}</style>
        <p className="serif mute" style={{ fontSize: 22 }}>Loading your day…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="hx auth">
        <style>{STYLES}</style>
        <div className="card rise">
          <h1 className="serif" style={{ fontSize: 40, lineHeight: 1.1 }}>Rise early.<br />Stay steady.</h1>
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

            <section className="card">
              <div className="row between end">
                <div><h3 style={{ fontSize: 15, fontWeight: 700 }}>Durood Shareef</h3><p className="mute xs" style={{ marginTop: 2 }}>Target {today.duroodTarget} today</p></div>
                <p className="serif sun" style={{ fontSize: 40, lineHeight: 1 }}>{today.duroodCount}</p>
              </div>
              <div className="bar"><div style={{ width: `${today.duroodPct}%` }} /></div>
            </section>

            <blockquote className="quote">
              <p className="serif">“{quote.text}”</p>
              <footer>{quote.author}</footer>
            </blockquote>
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="stack rise">
            <div className="row between" style={{ flexWrap: 'wrap', gap: 12 }}>
              <h2 className="serif page-title">{selectedDate === todayKey ? 'Today' : formatDisplayDate(selectedDate)}</h2>
              <div className="row g8">
                <button className="ghost icon" aria-label="Previous day" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft size={16} /></button>
                <input type="date" className="date" aria-label="Pick a date" value={selectedDate} onChange={(e) => e.target.value && setSelectedDate(e.target.value)} />
                <button className="ghost icon" aria-label="Next day" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight size={16} /></button>
              </div>
            </div>

            {lockedDay ? (
              <p className="lock-note"><Lock size={14} style={{ flexShrink: 0 }} />This day has passed and is locked. Habits you didn’t finish count as missed.</p>
            ) : (
              <p className="mute xs" style={{ marginTop: 6 }}>Tap the circle to cycle: pending, done, missed.</p>
            )}

            {CATEGORIES.map((cat) => {
              const list = activeHabits.filter((h) => h.category === cat);
              if (!list.length) return null;
              return (
                <section key={cat} className="card" style={{ padding: '20px 18px' }}>
                  <h3 className="t" style={{ paddingLeft: 6 }}>{cat}</h3>
                  <ul>
                    {list.map((h) => {
                      const val = dailyRecords[selectedDate]?.statuses?.[h.id];
                      if (h.type === 'numeric') {
                        return (
                          <li key={h.id} className="item">
                            <div><p style={{ fontWeight: 600, fontSize: 14.5 }}>{h.name}</p><p className="mute xs">Target {h.target || 100} per day</p></div>
                            <input type="number" min="0" inputMode="numeric" className="input count" value={val || ''} placeholder="0" aria-label={`${h.name} count`}
                              disabled={lockedDay}
                              onChange={(e) => updateHabitStatus(selectedDate, h.id, Number(e.target.value) || 0)} />
                          </li>
                        );
                      }
                      const status = getStatus(selectedDate, h.id);
                      return (
                        <li key={h.id} className={`habit ${status === 'done' ? 'done' : ''} ${lockedDay ? 'locked' : ''}`}
                          onClick={() => !lockedDay && cycleHabit(selectedDate, h.id)}>
                          <StateButton status={status} disabled={lockedDay} onClick={(e) => { e.stopPropagation(); cycleHabit(selectedDate, h.id); }} />
                          <span className="name">{h.name}</span>
                          {status === 'missed' && <span className="pink xs">Missed</span>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            <section className="card">
              <h3 className="t" style={{ marginBottom: 12 }}>Journal</h3>
              <textarea className="input" rows={4} value={noteDraft} readOnly={lockedDay} onChange={(e) => handleNoteChange(e.target.value)}
                placeholder={lockedDay ? 'No journal entry for this day.' : 'What went well today? What will you do differently tomorrow?'} />
            </section>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="stack rise">
            <div className="row between">
              <h2 className="serif page-title">{monthLabel}</h2>
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
                        background: logged ? `linear-gradient(145deg,rgba(255,226,122,${0.14 + (pct / 100) * 0.86}),rgba(255,160,30,${0.10 + (pct / 100) * 0.9}))` : 'rgba(255,226,130,.06)',
                        color: logged && pct > 55 ? '#2a1a05' : '#fbf3e2',
                        boxShadow: k === todayKey ? '0 0 0 2px #fff1b8' : 'none',
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
            <h2 className="serif page-title">Your consistency</h2>
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
                      <i style={{ height: `${Math.max(pct, 4)}%`, background: pct ? 'linear-gradient(180deg,#ffe27a,#ff9f1c)' : 'rgba(255,226,130,.10)' }} />
                      <span>{parseDateKey(k).getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="stack rise">
            <h2 className="serif page-title">Your habits</h2>
            <form onSubmit={handleAddHabit} className="card form">
              <h3 className="t">Add a habit</h3>
              <input className="input" required placeholder="e.g. Read 10 pages" aria-label="Habit name" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} />
              <div className="two">
                <select className="input" aria-label="Category" value={newHabitCategory} onChange={(e) => setNewHabitCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="input" aria-label="Type" value={newHabitType} onChange={(e) => setNewHabitType(e.target.value)}>
                  <option value="boolean">Done / missed</option>
                  <option value="numeric">Count</option>
                </select>
              </div>
              {newHabitType === 'numeric' && (<input className="input" type="number" min="1" aria-label="Daily target" placeholder="Daily target" value={newHabitTarget} onChange={(e) => setNewHabitTarget(e.target.value)} />)}
              <button type="submit" className="btn"><Plus size={16} />Add habit</button>
            </form>

            <section className="card" style={{ padding: '14px 18px' }}>
              <ul>
                {activeHabits.map((h) => (
                  <li key={h.id} className="item">
                    <div className="grow">
                      <p style={{ fontWeight: 600, fontSize: 14.5 }}>{h.name}</p>
                      <p className="mute xs">{h.category}{h.type === 'numeric' ? ` · target ${h.target}` : ''}</p>
                    </div>
                    <div className="row g8">
                      <button className="ghost icon" aria-label={`Archive ${h.name}`} onClick={() => archiveHabit(h)}><Archive size={16} /></button>
                      <button className="ghost icon danger" aria-label={`Delete ${h.name}`} onClick={() => deleteHabit(h)}><Trash2 size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
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