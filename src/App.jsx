import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, onSnapshot, collection, writeBatch } from 'firebase/firestore';
import {
  Sunrise, ListChecks, CalendarDays, BarChart3, SlidersHorizontal, Check, X,
  ChevronLeft, ChevronRight, Flame, LogOut, Plus, Archive, Trash2, AlertCircle, Cloud
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
// STYLES: pre-dawn palette, injected once
// ============================================================================
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
:root{
  --night:#0f0e1c; --deep:#171530; --veil:#211e45; --line:rgba(255,236,220,.09);
  --ink:#f6eee6; --mute:#a59fbd; --sun:#ffc27a; --coral:#ff8a7a; --rose:#e86f9a; --iris:#8b7cf8;
}
.hx{font-family:'Manrope',system-ui,sans-serif;color:#f6eee6;background:var(--night);min-height:100vh;
  background-image:radial-gradient(900px 500px at 50% -10%,rgba(139,124,248,.28),transparent 70%),
  radial-gradient(700px 400px at 100% 0%,rgba(255,138,122,.12),transparent 70%)}

.hx-mute{color:#a59fbd}.hx-sun{color:#ffc27a}.hx-coral{color:#ff8a7a}.hx-pink{color:#ff9db9}.hx-dark{color:#2a1420}
.hx-hover-sun:hover{color:#ffc27a}
.hx-divide>*+*{border-top:1px solid rgba(255,236,220,.09)}
.hx-divide-x>*+*{border-left:1px solid rgba(255,236,220,.09)}
.hx-border{border-color:rgba(255,236,220,.09)}
.hx-err{background:rgba(232,111,154,.1);border:1px solid rgba(232,111,154,.3)}
.hx-dark-scheme{color-scheme:dark}
.hx-icon{padding:.65rem!important}.hx-slim{padding-top:.5rem!important;padding-bottom:.5rem!important}.hx-count{width:6rem!important}
.hx button,.hx select,.hx textarea,.hx input{font-family:inherit}
.hx h1,.hx h2,.hx h3,.hx p,.hx blockquote{margin:0}
:where(.hx) button{color:#f6eee6;background:none;border:0;cursor:pointer}
:where(.hx) ul{list-style:none;margin:0;padding:0}
.hx .hx-btn{color:#2a1420}
.hx-serif{font-family:'Fraunces',Georgia,serif;font-weight:400;letter-spacing:-.01em}
.hx-card{background:linear-gradient(180deg,rgba(33,30,69,.7),rgba(23,21,48,.7));border:1px solid var(--line);border-radius:28px}
.hx-input{width:100%;background:rgba(15,14,28,.7);border:1px solid var(--line);border-radius:16px;padding:.8rem 1rem;color:#f6eee6;font-size:.9rem;outline:none}
.hx-input:focus{border-color:#ffc27a}
.hx-btn{background:linear-gradient(135deg,#ffc27a,#ff8a7a);color:#2a1420;font-weight:700;border-radius:999px;padding:.8rem 1.4rem;font-size:.85rem}
.hx-btn:disabled{opacity:.5}
.hx-ghost{background:rgba(255,236,220,.06);border:1px solid var(--line);color:#f6eee6;border-radius:999px;padding:.7rem 1.2rem;font-size:.8rem;font-weight:600}
.hx button:focus-visible,.hx input:focus-visible,.hx select:focus-visible{outline:2px solid #ffc27a;outline-offset:2px}
@keyframes hx-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.hx-rise{animation:hx-rise .7s ease-out both}
@media (prefers-reduced-motion:reduce){.hx-rise{animation:none}*{transition:none!important}}
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
  return (
    <svg viewBox="0 0 260 150" className="w-full max-w-sm mx-auto" role="img" aria-label={`${pct}% of today's habits completed`}>
      <defs>
        <linearGradient id="arc" x1="0" x2="1">
          <stop offset="0" stopColor="#8b7cf8" /><stop offset=".5" stopColor="#e86f9a" /><stop offset="1" stopColor="#ffc27a" />
        </linearGradient>
        <radialGradient id="glow"><stop offset="0" stopColor="#ffc27a" stopOpacity=".9" /><stop offset="1" stopColor="#ffc27a" stopOpacity="0" /></radialGradient>
      </defs>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,236,220,.08)" strokeWidth="14" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="url(#arc)" strokeWidth="14" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len * (1 - p)} style={{ transition: 'stroke-dashoffset .9s ease' }} />
      <circle cx={x} cy={y} r="26" fill="url(#glow)" />
      <circle cx={x} cy={y} r="9" fill="#ffe3b8" />
      <line x1="10" x2="250" y1={cy + 8} y2={cy + 8} stroke="rgba(255,236,220,.12)" />
    </svg>
  );
}

function StateButton({ status, onClick }) {
  const look = status === 'done'
    ? { background: '#ffc27a', borderColor: '#ffc27a', color: '#2a1420' }
    : status === 'missed'
    ? { background: 'rgba(232,111,154,.2)', borderColor: 'rgba(232,111,154,.6)', color: '#ff9db9' }
    : { background: 'transparent', borderColor: 'rgba(255,236,220,.22)', color: 'transparent' };
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
      style={{ ...look, borderWidth: 1, borderStyle: 'solid', transition: 'all .2s' }}
      aria-label={`Status: ${status === 'empty' ? 'pending' : status}. Tap to change.`}
    >
      {status === 'missed' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
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
    const cur = dailyRecords[dateKey]?.statuses?.[habitId] || 'empty';
    updateHabitStatus(dateKey, habitId, cur === 'empty' ? 'done' : cur === 'done' ? 'missed' : 'empty');
  };

  const handleNoteChange = (val) => {
    setNoteDraft(val);
    clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      try {
        const existing = dailyRecords[selectedDate] || { statuses: {} };
        await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', selectedDate),
          { date: selectedDate, statuses: existing.statuses || {}, note: val, updatedAt: Date.now() }, { merge: true });
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

  const getDayMetrics = (k) => {
    const rec = dailyRecords[k]?.statuses || {};
    let completed = 0, missed = 0, pending = 0;
    booleanHabits.forEach((h) => {
      const s = rec[h.id];
      if (s === 'done') completed++; else if (s === 'missed') missed++; else pending++;
    });
    const total = booleanHabits.length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const duroodCount = duroodHabit ? Number(rec[duroodHabit.id] || 0) : 0;
    const duroodTarget = duroodHabit?.target || userSettings.duroodTarget || 100;
    return { total, completed, missed, pending, pct, duroodCount, duroodTarget, duroodPct: Math.min(100, Math.round((duroodCount / duroodTarget) * 100)) };
  };

  const todayKey = getLocalDateKey();
  const today = useMemo(() => getDayMetrics(todayKey), [dailyRecords, booleanHabits, duroodHabit, userSettings]);

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
      <div className="hx flex items-center justify-center">
        <style>{STYLES}</style>
        <p className="hx-serif text-xl hx-mute">Loading your day…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="hx flex items-center justify-center p-5">
        <style>{STYLES}</style>
        <div className="hx-card w-full max-w-md p-8 hx-rise">
          <h1 className="hx-serif text-4xl leading-tight">Rise early.<br />Stay steady.</h1>
          <p className="text-sm hx-mute mt-3">HabitX tracks your prayers, discipline, health and creative work in one daily checklist.</p>

          {authError && (
            <div className="mt-5 p-3 rounded-2xl hx-err hx-pink text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /><span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="mt-6 space-y-3">
            {authMode === 'signup' && (
              <input className="hx-input" required placeholder="Your name" aria-label="Your name" value={authName} onChange={(e) => setAuthName(e.target.value)} />
            )}
            <input className="hx-input" type="email" required placeholder="Email" aria-label="Email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
            <input className="hx-input" type="password" required placeholder="Password" aria-label="Password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
            <button type="submit" disabled={authSubmitting} className="hx-btn w-full">
              {authSubmitting ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <button onClick={handleGuest} disabled={authSubmitting} className="hx-ghost w-full mt-3">Continue as guest</button>
          <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
            className="block mx-auto mt-5 text-xs hx-mute hover:hx-sun">
            {authMode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
        </div>
      </div>
    );
  }

  const firstName = (user.displayName || '').split(' ')[0];

  // month grid
  const monthLabel = monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstWeekday = monthCursor.getDay();
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) =>
    getLocalDateKey(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), i + 1)))];

  return (
    <div className="hx pb-32">
      <style>{STYLES}</style>

      {toast && (
        <div role="status" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 hx-card px-5 py-2.5 text-xs font-semibold">{toast}</div>
      )}

      <div className="max-w-3xl mx-auto px-5 pt-8">
        {/* top bar */}
        <header className="flex items-center justify-between mb-8">
          <p className="text-xs hx-mute flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5" />
            {syncStatus === 'synced' ? 'Saved' : syncStatus === 'syncing' ? 'Saving…' : 'Not saved. Check your connection.'}
          </p>
          <button onClick={handleLogout} className="hx-ghost flex items-center gap-2 !py-2"><LogOut className="w-3.5 h-3.5" />Sign out</button>
        </header>

        {/* ================= TODAY ================= */}
        {activeTab === 'today' && (
          <div className="space-y-5 hx-rise">
            <section className="hx-card px-6 pt-8 pb-7 text-center">
              <p className="text-sm hx-mute">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
              <SunArc pct={today.pct} />
              <div className="-mt-10 relative">
                <p className="hx-serif text-6xl">{today.pct}<span className="text-2xl hx-mute">%</span></p>
                <p className="text-sm hx-mute mt-1">{today.completed} of {today.total} done · {formatDisplayDate(todayKey)}</p>
              </div>
              <button onClick={() => { setSelectedDate(todayKey); setActiveTab('tracker'); }} className="hx-btn mt-6">Open today’s checklist</button>
            </section>

            <section className="hx-card grid grid-cols-3 hx-divide-x py-5 text-center">
              <div><p className="hx-serif text-3xl flex items-center justify-center gap-1.5"><Flame className="w-5 h-5 hx-coral" />{analytics.current}</p><p className="text-xs hx-mute mt-1">day streak</p></div>
              <div><p className="hx-serif text-3xl">{analytics.weekly}%</p><p className="text-xs hx-mute mt-1">last 7 days</p></div>
              <div><p className="hx-serif text-3xl">{analytics.best}</p><p className="text-xs hx-mute mt-1">best streak</p></div>
            </section>

            <section className="hx-card p-6">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Durood Shareef</h2>
                  <p className="text-xs hx-mute mt-0.5">Target {today.duroodTarget} today</p>
                </div>
                <p className="hx-serif text-4xl">{today.duroodCount}</p>
              </div>
              <div className="h-2 rounded-full bg-white/10 mt-4 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${today.duroodPct}%`, background: 'linear-gradient(90deg,#8b7cf8,#e86f9a,#ffc27a)', transition: 'width .6s ease' }} />
              </div>
            </section>

            <blockquote className="px-3 pt-3">
              <p className="hx-serif text-xl leading-snug">“{quote.text}”</p>
              <footer className="text-xs hx-sun mt-3">{quote.author}</footer>
            </blockquote>
          </div>
        )}

        {/* ================= TRACKER ================= */}
        {activeTab === 'tracker' && (
          <div className="space-y-5 hx-rise">
            <div className="flex items-center justify-between">
              <h2 className="hx-serif text-3xl">{selectedDate === todayKey ? 'Today' : formatDisplayDate(selectedDate)}</h2>
              <div className="flex items-center gap-1.5">
                <button className="hx-ghost hx-icon" aria-label="Previous day" onClick={() => setSelectedDate(addDays(selectedDate, -1))}><ChevronLeft className="w-4 h-4" /></button>
                <input type="date" aria-label="Pick a date" value={selectedDate} onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-semibold px-1 w-[7.5rem] cursor-pointer hx-dark-scheme" />
                <button className="hx-ghost hx-icon" aria-label="Next day" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <p className="text-xs hx-mute -mt-2">Tap the circle to cycle: pending, done, missed.</p>

            {CATEGORIES.map((cat) => {
              const list = activeHabits.filter((h) => h.category === cat);
              if (!list.length) return null;
              return (
                <section key={cat} className="hx-card p-5">
                  <h3 className="text-sm font-semibold mb-3 hx-sun">{cat}</h3>
                  <ul className="divide-y hx-divide">
                    {list.map((h) => {
                      const val = dailyRecords[selectedDate]?.statuses?.[h.id];
                      if (h.type === 'numeric') {
                        return (
                          <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                            <div>
                              <p className="text-sm font-medium">{h.name}</p>
                              <p className="text-xs hx-mute">Target {h.target || 100} per day</p>
                            </div>
                            <input type="number" min="0" inputMode="numeric" value={val || ''} placeholder="0" aria-label={`${h.name} count`}
                              onChange={(e) => updateHabitStatus(selectedDate, h.id, Number(e.target.value) || 0)}
                              className="hx-input hx-count text-center font-bold" />
                          </li>
                        );
                      }
                      const status = val || 'empty';
                      return (
                        <li key={h.id} className="flex items-center gap-4 py-3 cursor-pointer" onClick={() => cycleHabit(selectedDate, h.id)}>
                          <StateButton status={status} onClick={(e) => { e.stopPropagation(); cycleHabit(selectedDate, h.id); }} />
                          <p className={`text-sm font-medium flex-1 ${status === 'done' ? 'hx-mute line-through ' : ''}`}>{h.name}</p>
                          {status === 'missed' && <span className="text-xs hx-pink">Missed</span>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            <section className="hx-card p-5">
              <h3 className="text-sm font-semibold mb-3 hx-sun">Journal</h3>
              <textarea value={noteDraft} onChange={(e) => handleNoteChange(e.target.value)} rows={4}
                placeholder="What went well today? What will you do differently tomorrow?" className="hx-input resize-none" />
            </section>
          </div>
        )}

        {/* ================= CALENDAR ================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-5 hx-rise">
            <div className="flex items-center justify-between">
              <h2 className="hx-serif text-3xl">{monthLabel}</h2>
              <div className="flex gap-1.5">
                <button className="hx-ghost hx-icon" aria-label="Previous month" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}><ChevronLeft className="w-4 h-4" /></button>
                <button className="hx-ghost hx-icon" aria-label="Next month" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <section className="hx-card p-4 sm:p-6">
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[11px] hx-mute mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {cells.map((k, i) => {
                  if (!k) return <span key={`e${i}`} />;
                  const logged = !!dailyRecords[k];
                  const pct = getDayMetrics(k).pct;
                  const isToday = k === todayKey;
                  return (
                    <button key={k} onClick={() => goDay(k)} aria-label={`${formatDisplayDate(k)}: ${pct}% complete`}
                      className="aspect-square rounded-2xl text-xs font-semibold flex items-center justify-center"
                      style={{
                        background: logged ? `rgba(255,194,122,${0.1 + (pct / 100) * 0.75})` : 'rgba(255,236,220,.04)',
                        color: logged && pct > 55 ? '#2a1420' : '#f6eee6',
                        outline: isToday ? '2px solid #8b7cf8' : 'none',
                      }}>
                      {parseDateKey(k).getDate()}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs hx-mute mt-4">Brighter days mean more habits done. Tap a day to edit it.</p>
            </section>
          </div>
        )}

        {/* ================= STATS ================= */}
        {activeTab === 'stats' && (
          <div className="space-y-5 hx-rise">
            <h2 className="hx-serif text-3xl">Your consistency</h2>
            <section className="hx-card grid grid-cols-3 hx-divide-x py-5 text-center">
              <div><p className="hx-serif text-3xl">{analytics.weekly}%</p><p className="text-xs hx-mute mt-1">7-day average</p></div>
              <div><p className="hx-serif text-3xl">{analytics.monthly}%</p><p className="text-xs hx-mute mt-1">30-day average</p></div>
              <div><p className="hx-serif text-3xl">{analytics.overall}%</p><p className="text-xs hx-mute mt-1">all time</p></div>
            </section>
            <section className="hx-card p-6">
              <h3 className="text-sm font-semibold mb-5">Last 14 days</h3>
              <div className="flex items-end gap-1.5 h-40">
                {analytics.last14.map((k) => {
                  const pct = getDayMetrics(k).pct;
                  return (
                    <div key={k} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5" title={`${formatDisplayDate(k)}: ${pct}%`}>
                      <div className="w-full rounded-full" style={{ height: `${Math.max(pct, 4)}%`, background: pct ? 'linear-gradient(180deg,#ffc27a,#e86f9a)' : 'rgba(255,236,220,.08)' }} />
                      <span className="text-[10px] hx-mute">{parseDateKey(k).getDate()}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ================= MANAGE ================= */}
        {activeTab === 'manage' && (
          <div className="space-y-5 hx-rise">
            <h2 className="hx-serif text-3xl">Your habits</h2>
            <form onSubmit={handleAddHabit} className="hx-card p-5 space-y-3">
              <h3 className="text-sm font-semibold hx-sun">Add a habit</h3>
              <input className="hx-input" required placeholder="e.g. Read 10 pages" aria-label="Habit name" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select className="hx-input" aria-label="Category" value={newHabitCategory} onChange={(e) => setNewHabitCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="hx-input" aria-label="Type" value={newHabitType} onChange={(e) => setNewHabitType(e.target.value)}>
                  <option value="boolean">Done / missed</option>
                  <option value="numeric">Count</option>
                </select>
              </div>
              {newHabitType === 'numeric' && (
                <input className="hx-input" type="number" min="1" aria-label="Daily target" placeholder="Daily target" value={newHabitTarget} onChange={(e) => setNewHabitTarget(e.target.value)} />
              )}
              <button type="submit" className="hx-btn flex items-center gap-2"><Plus className="w-4 h-4" />Add habit</button>
            </form>

            <section className="hx-card p-5">
              <ul className="divide-y hx-divide">
                {activeHabits.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{h.name}</p>
                      <p className="text-xs hx-mute">{h.category}{h.type === 'numeric' ? ` · target ${h.target}` : ''}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button className="hx-ghost hx-icon" aria-label={`Archive ${h.name}`} onClick={() => archiveHabit(h)}><Archive className="w-4 h-4" /></button>
                      <button className="hx-ghost hx-icon hx-pink" aria-label={`Delete ${h.name}`} onClick={() => deleteHabit(h)}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>

      {/* floating nav */}
      <nav aria-label="Main" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex gap-1 p-1.5 rounded-full border hx-border"
        style={{ background: 'rgba(23,21,48,.82)', backdropFilter: 'blur(18px)', paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)} aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2.5 text-xs font-semibold transition-colors ${active ? 'hx-dark' : 'hx-mute'}`}
              style={active ? { background: 'linear-gradient(135deg,#ffc27a,#ff8a7a)' } : undefined}>
              <Icon className="w-4 h-4" />
              {active && <span>{label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
