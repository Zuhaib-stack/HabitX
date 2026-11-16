import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  writeBatch
} from 'firebase/firestore';
import {
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  Circle,
  Calendar as CalendarIcon,
  BarChart3,
  ListChecks,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Flame,
  Trophy,
  Target,
  Sparkles,
  Download,
  Upload,
  Bell,
  Moon,
  Sun,
  Smartphone,
  Monitor,
  LogOut,
  LogIn,
  UserPlus,
  Cloud,
  CloudOff,
  Check,
  X,
  AlertCircle,
  FileText,
  TrendingUp,
  Award,
  RefreshCw,
  Share,
  MoreVertical,
  Info
} from 'lucide-react';

// ============================================================================
// FIREBASE CONFIGURATION
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
// CONSTANTS & DEFAULT DATA
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

const DISCIPLINE_QUOTES = [
  { text: "The most beloved deeds to Allah are those that are most consistent, even if they are small.", author: "Prophet Muhammad ﷺ (Sahih al-Bukhari)" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Take advantage of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your busyness, and your life before your death.", author: "Hadith (Al-Hakim)" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Indeed, prayer has been decreed upon the believers a decree of specified times.", author: "Surah An-Nisa (4:103)" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Guard strictly your prayers, especially the middle prayer, and stand before Allah with devotion.", author: "Surah Al-Baqarah (2:238)" },
];

const CATEGORIES = ['Islamic Routine', 'Discipline', 'Physical Health', 'Content Creation', 'Personal Growth'];

// ============================================================================
// HELPERS
// ============================================================================
const getLocalDateKey = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (dateKey, days) => {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return getLocalDateKey(d);
};

const formatDisplayDate = (dateKey) => {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getQuoteForDate = (dateKey) => {
  const num = dateKey.split('-').reduce((acc, val) => acc + parseInt(val, 10), 0);
  return DISCIPLINE_QUOTES[num % DISCIPLINE_QUOTES.length];
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey());
  const [theme, setTheme] = useState('dark');
  const [syncStatus, setSyncStatus] = useState('synced');
  const [toastMessage, setToastMessage] = useState(null);

  const [habits, setHabits] = useState([]);
  const [dailyRecords, setDailyRecords] = useState({});
  const [userSettings, setUserSettings] = useState({
    duroodTarget: 100,
    reminderEnabled: false,
    reminderTime: '04:00',
    reminderHabit: 'Wake up at 4:00 AM'
  });
  const [dataLoading, setDataLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('boolean');
  const [newHabitCategory, setNewHabitCategory] = useState('Discipline');
  const [newHabitTarget, setNewHabitTarget] = useState(100);

  const [noteDraft, setNoteDraft] = useState('');
  const noteTimeoutRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setDailyRecords({});
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const userId = user.uid;

    const habitsColRef = collection(db, 'artifacts', appId, 'users', userId, 'habits');
    const unsubHabits = onSnapshot(habitsColRef, async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          DEFAULT_HABITS.forEach((h) => {
            const hRef = doc(db, 'artifacts', appId, 'users', userId, 'habits', h.id);
            batch.set(hRef, { ...h, createdAt: Date.now() });
          });
          await batch.commit();
        } catch (err) {
          console.error(err);
        }
      } else {
        const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
        setHabits(loaded);
      }
      setDataLoading(false);
    });

    const recordsColRef = collection(db, 'artifacts', appId, 'users', userId, 'dailyRecords');
    const unsubRecords = onSnapshot(recordsColRef, (snapshot) => {
      const recs = {};
      snapshot.docs.forEach((d) => {
        recs[d.id] = d.data();
      });
      setDailyRecords(recs);
      setSyncStatus('synced');
    });

    const settingsDocRef = doc(db, 'artifacts', appId, 'users', userId, 'settings', 'preferences');
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserSettings((prev) => ({ ...prev, ...data }));
      }
    });

    return () => {
      unsubHabits();
      unsubRecords();
      unsubSettings();
    };
  }, [user]);

  useEffect(() => {
    const currentNote = dailyRecords[selectedDate]?.note || '';
    setNoteDraft(currentNote);
  }, [selectedDate, dailyRecords[selectedDate]?.note]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    try {
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        if (authName.trim()) {
          await updateProfile(cred.user, { displayName: authName.trim() });
        }
        showToast('Welcome to HabitX Pro!');
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        showToast('Signed in successfully!');
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleQuickDemoSignIn = async () => {
    setAuthError('');
    setAuthSubmitting(true);
    try {
      await signInAnonymously(auth);
      showToast('Signed in with Cloud Account!');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Logged out.');
    } catch (err) {
      showToast('Logout error', 'error');
    }
  };

  const updateHabitStatus = async (dateKey, habitId, newValue) => {
    if (!user) return;
    setSyncStatus('syncing');
    const existingRecord = dailyRecords[dateKey] || { statuses: {}, note: '' };
    const updatedStatuses = { ...(existingRecord.statuses || {}), [habitId]: newValue };

    setDailyRecords((prev) => ({
      ...prev,
      [dateKey]: { ...existingRecord, statuses: updatedStatuses, updatedAt: Date.now() }
    }));

    try {
      const recRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', dateKey);
      await setDoc(recRef, { date: dateKey, statuses: updatedStatuses, note: existingRecord.note || '', updatedAt: Date.now() }, { merge: true });
      setSyncStatus('synced');
    } catch (err) {
      setSyncStatus('error');
    }
  };

  const handleCycleBooleanHabit = (dateKey, habitId) => {
    const current = dailyRecords[dateKey]?.statuses?.[habitId] || 'empty';
    const next = current === 'empty' ? 'done' : current === 'done' ? 'missed' : 'empty';
    updateHabitStatus(dateKey, habitId, next);
  };

  const handleNoteChange = (val) => {
    setNoteDraft(val);
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      try {
        const existingRecord = dailyRecords[selectedDate] || { statuses: {}, note: '' };
        const recRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', selectedDate);
        await setDoc(recRef, { date: selectedDate, statuses: existingRecord.statuses || {}, note: val, updatedAt: Date.now() }, { merge: true });
      } catch (err) {}
    }, 600);
  };

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!user || !newHabitName.trim()) return;
    const id = `custom-${Date.now()}`;
    const maxOrder = habits.reduce((max, h) => Math.max(max, h.order || 0), 0);
    const newHabit = {
      id,
      name: newHabitName.trim(),
      type: newHabitType,
      category: newHabitCategory,
      order: maxOrder + 1,
      archived: false,
      ...(newHabitType === 'numeric' ? { target: Number(newHabitTarget) || 100 } : {}),
      createdAt: Date.now()
    };
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', id), newHabit);
      setNewHabitName('');
      showToast(`Added "${newHabit.name}"!`);
    } catch (err) {
      showToast('Failed to add habit', 'error');
    }
  };

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const booleanHabits = useMemo(() => activeHabits.filter((h) => h.type === 'boolean'), [activeHabits]);
  const duroodHabit = useMemo(() => activeHabits.find((h) => h.id === 'def-7') || activeHabits.find((h) => h.type === 'numeric'), [activeHabits]);

  const getDayMetrics = (dateKey) => {
    const rec = dailyRecords[dateKey]?.statuses || {};
    let completed = 0;
    let missed = 0;
    let pending = 0;
    booleanHabits.forEach((h) => {
      const st = rec[h.id];
      if (st === 'done') completed++;
      else if (st === 'missed') missed++;
      else pending++;
    });
    const totalBool = booleanHabits.length;
    const pct = totalBool > 0 ? Math.round((completed / totalBool) * 100) : 0;
    const duroodCount = duroodHabit ? Number(rec[duroodHabit.id] || 0) : 0;
    const duroodTarget = duroodHabit?.target || userSettings.duroodTarget || 100;
    const duroodPct = duroodTarget > 0 ? Math.min(100, Math.round((duroodCount / duroodTarget) * 100)) : 0;
    return { totalBool, completed, missed, pending, pct, duroodCount, duroodTarget, duroodPct };
  };

  const todayKey = getLocalDateKey();
  const todayMetrics = useMemo(() => getDayMetrics(todayKey), [dailyRecords, booleanHabits, duroodHabit, userSettings]);
  const selectedDayMetrics = useMemo(() => getDayMetrics(selectedDate), [selectedDate, dailyRecords, booleanHabits, duroodHabit, userSettings]);

  const analytics = useMemo(() => {
    const last7Keys = Array.from({ length: 7 }, (_, i) => addDays(todayKey, -(6 - i)));
    const last30Keys = Array.from({ length: 30 }, (_, i) => addDays(todayKey, -(29 - i)));
    const weeklyAvg = Math.round(last7Keys.reduce((acc, k) => acc + getDayMetrics(k).pct, 0) / 7);
    const monthlyAvg = Math.round(last30Keys.reduce((acc, k) => acc + getDayMetrics(k).pct, 0) / 30);

    const allRecordedDates = Object.keys(dailyRecords).sort();
    let bestStreak = 0;
    let runningStreak = 0;
    if (allRecordedDates.length > 0) {
      let cursor = allRecordedDates[0];
      while (cursor <= todayKey) {
        const m = getDayMetrics(cursor);
        if (m.completed > 0 && m.pct >= 70) {
          runningStreak++;
          if (runningStreak > bestStreak) bestStreak = runningStreak;
        } else if (cursor !== todayKey) {
          runningStreak = 0;
        }
        cursor = addDays(cursor, 1);
      }
    }

    let currentStreak = 0;
    let backCursor = todayKey;
    if (getDayMetrics(todayKey).pct < 70) backCursor = addDays(todayKey, -1);
    while (dailyRecords[backCursor] && getDayMetrics(backCursor).pct >= 70) {
      currentStreak++;
      backCursor = addDays(backCursor, -1);
    }

    const loggedDaysCount = allRecordedDates.length;
    const overallConsistency = loggedDaysCount > 0 ? Math.round(allRecordedDates.reduce((sum, k) => sum + getDayMetrics(k).pct, 0) / loggedDaysCount) : 0;

    return { last7Keys, weeklyAvg, monthlyAvg, currentStreak, bestStreak: Math.max(bestStreak, currentStreak), overallConsistency };
  }, [dailyRecords, booleanHabits, duroodHabit, todayKey]);

  // Auth Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center text-zinc-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
          <span className="text-sm font-medium">Loading HabitX Pro...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#030305] text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-md bg-zinc-900/70 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-zinc-950 font-black text-2xl mb-4">
              HX
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">HabitX Pro</h1>
            <p className="text-sm text-zinc-400 mt-1">Discipline, Islamic Routine & Personal Growth</p>
          </div>

          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Mohd Zuhaib Khan"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-zinc-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50"
            >
              {authSubmitting ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <button
              onClick={handleQuickDemoSignIn}
              disabled={authSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/50 text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Instant Cloud Session (Guest)</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError('');
              }}
              className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Authenticated Layout
  return (
    <div className="min-h-screen bg-[#030305] text-zinc-100 flex flex-col lg:flex-row pb-24 lg:pb-0 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-bounce bg-zinc-900 border border-emerald-500/40 text-zinc-100 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-zinc-950/80 backdrop-blur-2xl border-r border-zinc-800/60 p-6 flex-col justify-between sticky top-0 h-screen">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-zinc-950 font-black text-xl">
              HX
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                HabitX <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">Pro</span>
              </h1>
              <p className="text-[11px] text-zinc-400">Personal Discipline System</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'tracker', label: 'Daily Tracker', icon: ListChecks },
              { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
              { id: 'stats', label: 'Statistics', icon: BarChart3 },
              { id: 'manage', label: 'Manage Habits', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-xs transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-zinc-800/60">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 rounded-xl border border-zinc-800/60 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
              <span className="text-[11px] text-zinc-300 font-medium capitalize">{syncStatus}</span>
            </div>
            <Cloud className="w-4 h-4 text-zinc-400" />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-zinc-950 font-black text-lg">
            HX
          </div>
          <span className="font-bold text-sm text-white">HabitX Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Synced</span>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-10 max-w-6xl mx-auto w-full">
        {/* Quote Banner */}
        <div className="mb-6 p-4 lg:p-6 rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 border border-zinc-800/80 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs lg:text-sm text-zinc-200 font-medium italic">"{getQuoteForDate(todayKey).text}"</p>
              <p className="text-[11px] text-emerald-400 font-semibold mt-1">— {getQuoteForDate(todayKey).author}</p>
            </div>
          </div>
        </div>

        {/* ================= DASHBOARD TAB ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Executive Dashboard</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Your daily discipline & routine performance overview.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-300 font-medium">
                  {formatDisplayDate(todayKey)}
                </span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group shadow-xl">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-400">Today Completion</span>
                  <Target className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white">{todayMetrics.pct}%</div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${todayMetrics.pct}%` }}></div>
                </div>
              </div>

              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group shadow-xl">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-400">Current Streak</span>
                  <Flame className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white">{analytics.currentStreak} Days</div>
                <p className="text-[10px] text-zinc-400 mt-2">Best: <span className="text-amber-400 font-semibold">{analytics.bestStreak} Days</span></p>
              </div>

              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group shadow-xl">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-400">Weekly Average</span>
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white">{analytics.weeklyAvg}%</div>
                <p className="text-[10px] text-zinc-400 mt-2">Past 7 days performance</p>
              </div>

              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group shadow-xl">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-400">Overall Consistency</span>
                  <Award className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white">{analytics.overallConsistency}%</div>
                <p className="text-[10px] text-zinc-400 mt-2">All-time logged average</p>
              </div>
            </div>

            {/* Quick Actions & Durood Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Today's Habit Status Breakdown</span>
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 font-medium">Completed</span>
                    <div className="text-2xl font-bold text-emerald-300 mt-1">{todayMetrics.completed}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <span className="text-xs text-rose-400 font-medium">Missed</span>
                    <div className="text-2xl font-bold text-rose-300 mt-1">{todayMetrics.missed}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                    <span className="text-xs text-zinc-400 font-medium">Pending</span>
                    <div className="text-2xl font-bold text-zinc-200 mt-1">{todayMetrics.pending}</div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setActiveTab('tracker')}
                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    Open Today's Checklist
                  </button>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
                  >
                    View Calendar
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-2">Durood Shareef Counter</h3>
                  <p className="text-xs text-zinc-400 mb-4">Daily Target: {todayMetrics.duroodTarget} repetitions</p>
                  <div className="text-3xl font-extrabold text-emerald-400 mb-2">{todayMetrics.duroodCount}</div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${todayMetrics.duroodPct}%` }}></div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('tracker')}
                  className="mt-6 w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors"
                >
                  Update Durood Count
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= DAILY TRACKER TAB ================= */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Daily Habit Tracker</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Click status to toggle: Empty → Completed (✓) → Missed (✗)</p>
              </div>
              <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-2xl">
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-zinc-100 font-semibold px-2 focus:outline-none cursor-pointer"
                />
                <button
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Habits List Grouped by Category */}
            <div className="space-y-6">
              {CATEGORIES.map((cat) => {
                const catHabits = activeHabits.filter((h) => h.category === cat);
                if (catHabits.length === 0) return null;

                return (
                  <div key={cat} className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">{cat}</h3>
                    <div className="space-y-3">
                      {catHabits.map((habit) => {
                        const status = dailyRecords[selectedDate]?.statuses?.[habit.id] || 'empty';

                        if (habit.type === 'numeric') {
                          return (
                            <div key={habit.id} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className="font-semibold text-sm text-zinc-100">{habit.name}</span>
                                <p className="text-[11px] text-zinc-400 mt-0.5">Target: {habit.target || 100} per day</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={dailyRecords[selectedDate]?.statuses?.[habit.id] || ''}
                                  onChange={(e) => updateHabitStatus(selectedDate, habit.id, Number(e.target.value) || 0)}
                                  placeholder="0"
                                  className="w-24 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 text-sm font-bold text-center focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-xs text-zinc-400 font-medium">Count</span>
                              </div>
                            </div>
                          );
                        }

                        // Boolean Habit
                        return (
                          <div
                            key={habit.id}
                            onClick={() => handleCycleBooleanHabit(selectedDate, habit.id)}
                            className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                              status === 'done'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : status === 'missed'
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                            }`}
                          >
                            <span className="font-semibold text-sm">{habit.name}</span>
                            <div className="flex items-center gap-2">
                              {status === 'done' && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                  <CheckCircle2 className="w-4 h-4" /> Completed
                                </span>
                              )}
                              {status === 'missed' && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
                                  <XCircle className="w-4 h-4" /> Missed
                                </span>
                              )}
                              {status === 'empty' && (
                                <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-900 text-zinc-400 text-xs font-medium border border-zinc-800">
                                  <Circle className="w-4 h-4" /> Pending
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Daily Note Section */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">Daily Journal & Notes</h3>
              <textarea
                value={noteDraft}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Write your reflections, prayers, or key takeaways for this day..."
                rows={3}
                className="w-full p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 resize-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* ================= CALENDAR TAB ================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Calendar & History</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Select any date to view and edit historical records.</p>
            </div>
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl text-center">
              <p className="text-sm text-zinc-300">Use the date navigator in the Daily Tracker tab to inspect and edit past days securely.</p>
              <button
                onClick={() => setActiveTab('tracker')}
                className="mt-4 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                Go to Daily Tracker
              </button>
            </div>
          </div>
        )}

        {/* ================= STATISTICS TAB ================= */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Analytics & Statistics</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Comprehensive consistency and discipline metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                <span className="text-xs text-zinc-400 font-medium">7-Day Rolling Average</span>
                <div className="text-3xl font-extrabold text-white mt-2">{analytics.weeklyAvg}%</div>
              </div>
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                <span className="text-xs text-zinc-400 font-medium">30-Day Rolling Average</span>
                <div className="text-3xl font-extrabold text-white mt-2">{analytics.monthlyAvg}%</div>
              </div>
              <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800">
                <span className="text-xs text-zinc-400 font-medium">Best Streak</span>
                <div className="text-3xl font-extrabold text-amber-400 mt-2">{analytics.bestStreak} Days</div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MANAGE HABITS TAB ================= */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Manage Habits</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Add custom habits and configure your routine.</p>
            </div>

            {/* Add Habit Form */}
            <form onSubmit={handleAddHabit} className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white">Add New Habit</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Habit Name</label>
                  <input
                    type="text"
                    required
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="e.g. Read 10 Pages"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Category</label>
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                Add Habit
              </button>
            </form>

            {/* Existing Habits List */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-white mb-2">Active Habits</h3>
              {activeHabits.map((habit) => (
                <div key={habit.id} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-sm text-zinc-100">{habit.name}</span>
                    <span className="ml-3 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{habit.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* iPhone Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-2xl border-t border-zinc-800/80 px-4 py-2 flex items-center justify-around lg:hidden">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'tracker', label: 'Tracker', icon: ListChecks },
          { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
          { id: 'stats', label: 'Stats', icon: BarChart3 },
          { id: 'manage', label: 'Manage', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-emerald-400 bg-emerald-500/10 scale-105' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-1">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}