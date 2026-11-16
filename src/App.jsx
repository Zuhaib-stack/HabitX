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
// FIREBASE INITIALIZATION & CONFIGURATION
// ============================================================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'habitx-discipline-app';

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
// DATE & HELPER UTILITIES
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

// ============================================================================
// PWA MANIFEST & META INJECTOR
// ============================================================================
const injectPWAMetadata = () => {
  try {
    document.title = 'HabitX — Personal Discipline & Habit Tracker';
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'HabitX' },
      { name: 'theme-color', content: '#09090b' },
      { name: 'mobile-web-app-capable', content: 'yes' }
    ];
    metaTags.forEach(({ name, content }) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    const manifestObj = {
      name: 'HabitX - Personal Daily Habit Tracker',
      short_name: 'HabitX',
      start_url: '.',
      display: 'standalone',
      background_color: '#09090b',
      theme_color: '#10b981',
      description: 'Personal discipline, Islamic routine, health, and content creation habit tracker.',
      icons: [
        {
          src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="%2309090b"/><path d="M150 265l72 72 140-152" stroke="%2310b981" stroke-width="48" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
          sizes: '512x512',
          type: 'image/svg+xml'
        }
      ]
    };
    const stringManifest = JSON.stringify(manifestObj);
    const blob = new Blob([stringManifest], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'manifest');
      document.head.appendChild(link);
    }
    link.setAttribute('href', manifestURL);
  } catch (e) {
    console.warn('PWA metadata injection warning:', e);
  }
};

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Authentication & User State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('tracker'); // 'dashboard' | 'tracker' | 'calendar' | 'stats' | 'manage' | 'settings'
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'error'
  const [toastMessage, setToastMessage] = useState(null);

  // Cloud Data State
  const [habits, setHabits] = useState([]);
  const [dailyRecords, setDailyRecords] = useState({}); // { 'YYYY-MM-DD': { statuses: { [habitId]: 'done'|'missed'|'pending'|number }, note: string } }
  const [userSettings, setUserSettings] = useState({
    duroodTarget: 100,
    reminderEnabled: false,
    reminderTime: '04:00',
    reminderHabit: 'Wake up at 4:00 AM',
    theme: 'dark'
  });
  const [dataLoading, setDataLoading] = useState(true);

  // Modals & Forms State
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [editingHabit, setEditingHabit] = useState(null); // null or habit object
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState('boolean');
  const [newHabitCategory, setNewHabitCategory] = useState('Discipline');
  const [newHabitTarget, setNewHabitTarget] = useState(100);

  // Statistics Month Comparison State
  const [compareMonthA, setCompareMonthA] = useState(() => getLocalDateKey().slice(0, 7));
  const [compareMonthB, setCompareMonthB] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return getLocalDateKey(d).slice(0, 7);
  });

  // Note draft state for smooth typing before cloud sync
  const [noteDraft, setNoteDraft] = useState('');
  const noteTimeoutRef = useRef(null);

  // ==========================================================================
  // 1. INITIALIZE PWA & AUTH LISTENER
  // ==========================================================================
  useEffect(() => {
    injectPWAMetadata();

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else if (!auth.currentUser) {
          // Allow user to see login/signup screen if no custom token, unless already signed in
          setAuthLoading(false);
        }
      } catch (err) {
        console.error('Initial auth error:', err);
        setAuthLoading(false);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // ==========================================================================
  // 2. CLOUD FIRESTORE REAL-TIME SUBSCRIPTIONS & AUTO-SEEDING
  // ==========================================================================
  useEffect(() => {
    if (!user) {
      setHabits([]);
      setDailyRecords({});
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const userId = user.uid;

    // 1. Subscribe to Habits Collection
    const habitsColRef = collection(db, 'artifacts', appId, 'users', userId, 'habits');
    const unsubHabits = onSnapshot(
      habitsColRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Seed default 11 habits on first login/signup
          try {
            const batch = writeBatch(db);
            DEFAULT_HABITS.forEach((h) => {
              const hRef = doc(db, 'artifacts', appId, 'users', userId, 'habits', h.id);
              batch.set(hRef, { ...h, createdAt: Date.now() });
            });
            await batch.commit();
          } catch (seedErr) {
            console.error('Error seeding default habits:', seedErr);
          }
        } else {
          const loaded = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
          setHabits(loaded);
        }
        setDataLoading(false);
      },
      (err) => {
        console.error('Habits snapshot error:', err);
        setSyncStatus('error');
        setDataLoading(false);
      }
    );

    // 2. Subscribe to Daily Records Collection
    const recordsColRef = collection(db, 'artifacts', appId, 'users', userId, 'dailyRecords');
    const unsubRecords = onSnapshot(
      recordsColRef,
      (snapshot) => {
        const recs = {};
        snapshot.docs.forEach((d) => {
          recs[d.id] = d.data();
        });
        setDailyRecords(recs);
        setSyncStatus('synced');
      },
      (err) => {
        console.error('Daily records snapshot error:', err);
        setSyncStatus('error');
      }
    );

    // 3. Subscribe to User Settings Document
    const settingsDocRef = doc(db, 'artifacts', appId, 'users', userId, 'settings', 'preferences');
    const unsubSettings = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserSettings((prev) => ({ ...prev, ...data }));
          if (data.theme) setTheme(data.theme);
        }
      },
      (err) => {
        console.error('Settings snapshot error:', err);
      }
    );

    return () => {
      unsubHabits();
      unsubRecords();
      unsubSettings();
    };
  }, [user]);

  // Sync note draft whenever selectedDate or dailyRecords changes externally
  useEffect(() => {
    const currentNote = dailyRecords[selectedDate]?.note || '';
    setNoteDraft(currentNote);
  }, [selectedDate, dailyRecords[selectedDate]?.note]);

  // Habit Reminder Check Interval
  useEffect(() => {
    if (!userSettings.reminderEnabled) return;
    const interval = setInterval(() => {
      const now = new Date();
      const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (currentHM === userSettings.reminderTime && now.getSeconds() < 15) {
        triggerReminderNotification();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [userSettings]);

  // ==========================================================================
  // 3. HELPER FUNCTIONS & ACTIONS
  // ==========================================================================
  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3200);
  };

  const triggerReminderNotification = () => {
    const msg = `HabitX Reminder: Time for "${userSettings.reminderHabit}"! Stay disciplined.`;
    showToast(msg, 'info');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('HabitX Discipline Reminder', { body: msg });
    }
  };

  // Authentication Actions
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
        showToast('Welcome to HabitX! Your discipline journey begins.');
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
        showToast('Signed in! Syncing your habit records...');
      }
    } catch (err) {
      const code = err.code || '';
      if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
        setAuthError('Invalid email or password. Please check and try again.');
      } else if (code.includes('auth/email-already-in-use')) {
        setAuthError('An account with this email already exists. Please sign in.');
      } else if (code.includes('auth/weak-password')) {
        setAuthError('Password should be at least 6 characters.');
      } else {
        setAuthError(err.message || 'Authentication failed.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleQuickDemoSignIn = async () => {
    setAuthError('');
    setAuthSubmitting(true);
    try {
      await signInAnonymously(auth);
      showToast('Signed in with Instant Cloud Account!');
    } catch (err) {
      setAuthError(err.message || 'Could not start instant session.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Logged out safely.');
    } catch (err) {
      showToast('Error logging out.', 'error');
    }
  };

  // Update Habit Status for a Date
  const updateHabitStatus = async (dateKey, habitId, newValue) => {
    if (!user) return;
    setSyncStatus('syncing');
    const existingRecord = dailyRecords[dateKey] || { statuses: {}, note: '' };
    const updatedStatuses = {
      ...(existingRecord.statuses || {}),
      [habitId]: newValue
    };

    // Optimistic UI update
    setDailyRecords((prev) => ({
      ...prev,
      [dateKey]: {
        ...existingRecord,
        statuses: updatedStatuses,
        updatedAt: Date.now()
      }
    }));

    try {
      const recRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', dateKey);
      await setDoc(
        recRef,
        {
          date: dateKey,
          statuses: updatedStatuses,
          note: existingRecord.note || '',
          updatedAt: Date.now()
        },
        { merge: true }
      );
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to update status:', err);
      setSyncStatus('error');
      showToast('Sync error. Check your connection.', 'error');
    }
  };

  // Cycle Three-State Boolean Habit: empty -> done -> missed -> empty
  const handleCycleBooleanHabit = (dateKey, habitId) => {
    const current = dailyRecords[dateKey]?.statuses?.[habitId] || 'empty';
    const next = current === 'empty' ? 'done' : current === 'done' ? 'missed' : 'empty';
    updateHabitStatus(dateKey, habitId, next);
  };

  // Save Daily Note (Debounced)
  const handleNoteChange = (val) => {
    setNoteDraft(val);
    if (noteTimeoutRef.current) clearTimeout(noteTimeoutRef.current);
    noteTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      setSyncStatus('syncing');
      try {
        const existingRecord = dailyRecords[selectedDate] || { statuses: {}, note: '' };
        const recRef = doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', selectedDate);
        await setDoc(
          recRef,
          {
            date: selectedDate,
            statuses: existingRecord.statuses || {},
            note: val,
            updatedAt: Date.now()
          },
          { merge: true }
        );
        setSyncStatus('synced');
      } catch (err) {
        setSyncStatus('error');
      }
    }, 600);
  };

  // Manage Habits: Add, Edit, Reorder, Archive/Delete
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
      const hRef = doc(db, 'artifacts', appId, 'users', user.uid, 'habits', id);
      await setDoc(hRef, newHabit);
      setNewHabitName('');
      setNewHabitTarget(100);
      showToast(`Added "${newHabit.name}"!`);
    } catch (err) {
      showToast('Failed to add habit.', 'error');
    }
  };

  const handleSaveEditedHabit = async (e) => {
    e.preventDefault();
    if (!user || !editingHabit || !editingHabit.name.trim()) return;
    try {
      const hRef = doc(db, 'artifacts', appId, 'users', user.uid, 'habits', editingHabit.id);
      await setDoc(hRef, { ...editingHabit, name: editingHabit.name.trim() }, { merge: true });
      if (editingHabit.id === 'def-7' && editingHabit.target) {
        await updateSettings({ duroodTarget: Number(editingHabit.target) });
      }
      setEditingHabit(null);
      showToast('Habit updated!');
    } catch (err) {
      showToast('Error updating habit.', 'error');
    }
  };

  const handleMoveHabit = async (index, direction) => {
    if (!user) return;
    const activeList = habits.filter((h) => !h.archived);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= activeList.length) return;

    const itemA = activeList[index];
    const itemB = activeList[targetIndex];
    const orderA = itemA.order ?? index;
    const orderB = itemB.order ?? targetIndex;

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', itemA.id), { order: orderB });
      batch.update(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', itemB.id), { order: orderA });
      await batch.commit();
    } catch (err) {
      showToast('Failed to reorder habits.', 'error');
    }
  };

  const handleArchiveOrDeleteHabit = (habit) => {
    setConfirmModal({
      title: `Remove "${habit.name}"?`,
      message: 'This habit will be removed from your active daily checklist, while preserving all historical records in your statistics and exports.',
      onConfirm: async () => {
        try {
          const hRef = doc(db, 'artifacts', appId, 'users', user.uid, 'habits', habit.id);
          await setDoc(hRef, { archived: true }, { merge: true });
          showToast(`"${habit.name}" archived safely.`);
        } catch (err) {
          showToast('Error removing habit.', 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  // Update User Settings
  const updateSettings = async (partial) => {
    if (!user) return;
    const updated = { ...userSettings, ...partial };
    setUserSettings(updated);
    if (partial.theme) setTheme(partial.theme);
    try {
      const sRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences');
      await setDoc(sRef, updated, { merge: true });
    } catch (err) {
      console.error('Settings update error:', err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const sortedDates = Object.keys(dailyRecords).sort();
    if (sortedDates.length === 0) {
      showToast('No records available to export yet.', 'error');
      return;
    }

    const headers = ['Date', ...habits.map((h) => `"${h.name.replace(/"/g, '""')}"`), 'Daily Note'];
    const rows = sortedDates.map((dKey) => {
      const rec = dailyRecords[dKey] || { statuses: {}, note: '' };
      const cols = habits.map((h) => {
        const val = rec.statuses?.[h.id];
        if (h.type === 'numeric') return val || 0;
        if (val === 'done') return 'Completed';
        if (val === 'missed') return 'Missed';
        return 'Pending';
      });
      const safeNote = `"${(rec.note || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      return [dKey, ...cols, safeNote].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HabitX_Export_${getLocalDateKey()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported all habit records to CSV!');
  };

  // JSON Backup & Restore
  const handleExportBackupJSON = () => {
    const backup = {
      app: 'HabitX',
      exportedAt: new Date().toISOString(),
      habits,
      dailyRecords,
      userSettings
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `HabitX_Backup_${getLocalDateKey()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Backup JSON downloaded!');
  };

  const handleRestoreBackupJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.habits || !parsed.dailyRecords) {
          throw new Error('Invalid HabitX backup file.');
        }
        const batch = writeBatch(db);
        parsed.habits.forEach((h) => {
          batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', h.id), h);
        });
        Object.entries(parsed.dailyRecords).forEach(([dateKey, rec]) => {
          batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'dailyRecords', dateKey), rec);
        });
        if (parsed.userSettings) {
          batch.set(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'preferences'), parsed.userSettings);
        }
        await batch.commit();
        showToast('Backup restored and synced to cloud!');
      } catch (err) {
        showToast('Failed to restore backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // ==========================================================================
  // 4. ANALYTICS & STATISTICS COMPUTATIONS
  // ==========================================================================
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const booleanHabits = useMemo(() => activeHabits.filter((h) => h.type === 'boolean'), [activeHabits]);
  const duroodHabit = useMemo(
    () => activeHabits.find((h) => h.id === 'def-7') || activeHabits.find((h) => h.type === 'numeric'),
    [activeHabits]
  );

  // Compute day stats helper
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

    return {
      totalBool,
      completed,
      missed,
      pending,
      pct,
      duroodCount,
      duroodTarget,
      duroodPct
    };
  };

  const todayKey = getLocalDateKey();
  const todayMetrics = useMemo(() => getDayMetrics(todayKey), [dailyRecords, booleanHabits, duroodHabit, userSettings]);
  const selectedDayMetrics = useMemo(
    () => getDayMetrics(selectedDate),
    [selectedDate, dailyRecords, booleanHabits, duroodHabit, userSettings]
  );

  // Streaks, Weekly, Monthly, Consistency, Leaderboard
  const analytics = useMemo(() => {
    const last7Keys = Array.from({ length: 7 }, (_, i) => addDays(todayKey, -(6 - i)));
    const last30Keys = Array.from({ length: 30 }, (_, i) => addDays(todayKey, -(29 - i)));

    const weeklyAvg = Math.round(
      last7Keys.reduce((acc, k) => acc + getDayMetrics(k).pct, 0) / 7
    );
    const monthlyAvg = Math.round(
      last30Keys.reduce((acc, k) => acc + getDayMetrics(k).pct, 0) / 30
    );

    // Current & Best Streak (days with >= 70% boolean habit completion)
    const allRecordedDates = Object.keys(dailyRecords).sort();
    let bestStreak = 0;
    let runningStreak = 0;

    if (allRecordedDates.length > 0) {
      const startDate = allRecordedDates[0];
      let cursor = startDate;
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

    // Current streak walking backwards from today
    let currentStreak = 0;
    let backCursor = todayKey;
    // If today is still in progress (<70%), check if yesterday continued a streak
    if (getDayMetrics(todayKey).pct < 70) {
      backCursor = addDays(todayKey, -1);
    }
    while (dailyRecords[backCursor] && getDayMetrics(backCursor).pct >= 70) {
      currentStreak++;
      backCursor = addDays(backCursor, -1);
    }

    // Overall consistency across all logged days
    const loggedDaysCount = allRecordedDates.length;
    const overallConsistency =
      loggedDaysCount > 0
        ? Math.round(allRecordedDates.reduce((sum, k) => sum + getDayMetrics(k).pct, 0) / loggedDaysCount)
        : 0;

    // Monthly Durood Total
    const currentMonthPrefix = todayKey.slice(0, 7);
    const monthlyDuroodTotal = Object.entries(dailyRecords)
      .filter(([k]) => k.startsWith(currentMonthPrefix))
      .reduce((sum, [, rec]) => sum + (duroodHabit ? Number(rec.statuses?.[duroodHabit.id] || 0) : 0), 0);

    // Habit Consistency Leaderboard (last 30 days or all logged days)
    const evalDays = loggedDaysCount > 0 ? allRecordedDates.slice(-30) : [];
    const habitRates = booleanHabits.map((h) => {
      if (evalDays.length === 0) return { ...h, rate: 0, doneCount: 0, missedCount: 0 };
      let doneCount = 0;
      let missedCount = 0;
      evalDays.forEach((d) => {
        const st = dailyRecords[d]?.statuses?.[h.id];
        if (st === 'done') doneCount++;
        if (st === 'missed') missedCount++;
      });
      const rate = Math.round((doneCount / evalDays.length) * 100);
      return { ...h, rate, doneCount, missedCount };
    });

    const mostConsistent = [...habitRates].sort((a, b) => b.rate - a.rate).slice(0, 5);
    const frequentlyMissed = [...habitRates]
      .filter((h) => h.rate < 80)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);

    return {
      last7Keys,
      last30Keys,
      weeklyAvg,
      monthlyAvg,
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      overallConsistency,
      monthlyDuroodTotal,
      mostConsistent,
      frequentlyMissed
    };
  }, [dailyRecords, booleanHabits, duroodHabit, todayKey, userSettings]);

  // Month Comparison Helper
  const getMonthSummary = (yyyyMm) => {
    const keys = Object.keys(dailyRecords).filter((k) => k.startsWith(yyyyMm));
    if (keys.length === 0) return { daysLogged: 0, avgPct: 0, totalDurood: 0, perfectDays: 0 };
    let pctSum = 0;
    let totalDurood = 0;
    let perfectDays = 0;
    keys.forEach((k) => {
      const m = getDayMetrics(k);
      pctSum += m.pct;
      totalDurood += m.duroodCount;
      if (m.pct === 100) perfectDays++;
    });
    return {
      daysLogged: keys.length,
      avgPct: Math.round(pctSum / keys.length),
      totalDurood,
      perfectDays
    };
  };

  // ==========================================================================
  // 5. THEME CLASSES & STYLING HELPERS
  // ==========================================================================
  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-[#09090b] text-zinc-100' : 'bg-zinc-50 text-zinc-900';
  const bgCard = isDark ? 'bg-[#121215] border-zinc-800/80' : 'bg-white border-zinc-200 shadow-sm';
  const bgSubtle = isDark ? 'bg-zinc-900/70 border-zinc-800' : 'bg-zinc-100/80 border-zinc-200';
  const textMuted = isDark ? 'text-zinc-400' : 'text-zinc-500';

  // ==========================================================================
  // 6. AUTHENTICATION SCREEN (IF NOT SIGNED IN)
  // ==========================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 animate-pulse">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">HabitX</h1>
        <p className="text-sm text-zinc-400 mt-1">Initializing secure cloud workspace...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">HabitX</h1>
            <p className="text-zinc-400 text-sm mt-2">
              Personal Discipline, Islamic Routine & Consistency System
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-[#121215] border border-zinc-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900 rounded-xl mb-6 border border-zinc-800">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`py-2 text-sm font-medium rounded-lg transition-all ${
                  authMode === 'login'
                    ? 'bg-emerald-500 text-zinc-950 font-semibold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                className={`py-2 text-sm font-medium rounded-lg transition-all ${
                  authMode === 'signup'
                    ? 'bg-emerald-500 text-zinc-950 font-semibold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g., Abdullah"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {authMode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {authSubmitting
                  ? 'Connecting...'
                  : authMode === 'login'
                  ? 'Sign In & Sync Devices'
                  : 'Create HabitX Account'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-[#121215] text-zinc-500">or quick access</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleQuickDemoSignIn}
              disabled={authSubmitting}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Continue with Instant Cloud Session
            </button>
          </div>

          <p className="text-center text-xs text-zinc-500 mt-6">
            Real-time sync across iPhone Safari & Windows Chrome/Edge
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 7. NAVIGATION ITEMS DEFINITION
  // ==========================================================================
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tracker', label: 'Daily Tracker', icon: CheckCircle2 },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'manage', label: 'Habits', icon: ListChecks },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // ==========================================================================
  // 8. MAIN AUTHENTICATED APPLICATION SHELL
  // ==========================================================================
  return (
    <div className={`min-h-screen ${bgMain} flex flex-col md:flex-row transition-colors duration-200 pb-20 md:pb-0`}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-sm animate-fade-in">
          <div
            className={`px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 text-sm font-medium ${
              toastMessage.type === 'error'
                ? 'bg-red-950/95 border-red-500/40 text-red-200'
                : 'bg-zinc-900/95 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.msg}</span>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside
        className={`hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r ${
          isDark ? 'bg-[#0c0c0e] border-zinc-800/80' : 'bg-white border-zinc-200'
        } z-30`}
      >
        {/* Brand */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight block leading-none">HabitX</span>
              <span className={`text-[11px] ${textMuted}`}>Discipline System</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : `${textMuted} hover:bg-zinc-800/50 hover:text-zinc-200`
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Sync Status, Install PWA, Account */}
        <div className="p-4 border-t border-zinc-800/80 space-y-3">
          <button
            onClick={() => setShowInstallModal(true)}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition ${
              isDark
                ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-emerald-500/40'
                : 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            Install App (iOS / Windows)
          </button>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs">
              {syncStatus === 'synced' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                  <span className={textMuted}>Cloud Synced</span>
                </>
              ) : syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-amber-400">Syncing...</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400">Offline</span>
                </>
              )}
            </div>
            <button
              onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
              className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'}`}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header
        className={`md:hidden sticky top-0 z-30 px-4 py-3 border-b backdrop-blur-md flex items-center justify-between ${
          isDark ? 'bg-[#09090b]/90 border-zinc-800/80' : 'bg-white/90 border-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="font-bold text-base tracking-tight">HabitX</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cloud className="w-3 h-3" />
            {syncStatus === 'syncing' ? 'Syncing' : 'Synced'}
          </span>
          <button
            onClick={() => setShowInstallModal(true)}
            className={`p-2 rounded-lg border ${
              isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-200 text-zinc-700'
            }`}
            aria-label="Install App"
          >
            <Smartphone className="w-4 h-4 text-emerald-500" />
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 md:pl-64">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {dataLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-sm font-medium">Loading your habits & records...</p>
            </div>
          ) : (
            <>
              {/* ============================================================
                  VIEW 1: DASHBOARD
                  ============================================================ */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Discipline Dashboard</h1>
                      <p className={`text-sm ${textMuted} mt-0.5`}>
                        {formatDisplayDate(todayKey)} • Overview of your consistency
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDate(todayKey);
                        setActiveTab('tracker');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Open Today&apos;s Tracker
                    </button>
                  </div>

                  {/* Motivation Quote Card */}
                  <div className={`p-4 sm:p-5 rounded-2xl border ${bgCard} flex items-start gap-3.5`}>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-base font-medium italic leading-relaxed">
                        &ldquo;{getQuoteForDate(todayKey).text}&rdquo;
                      </p>
                      <p className={`text-xs ${textMuted} mt-1.5`}>— {getQuoteForDate(todayKey).author}</p>
                    </div>
                  </div>

                  {/* Primary KPI Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Today Completion */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${bgCard}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${textMuted}`}>Today&apos;s Progress</span>
                        <Target className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{todayMetrics.pct}%</span>
                        <span className={`text-xs ${textMuted}`}>
                          ({todayMetrics.completed}/{todayMetrics.totalBool})
                        </span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${todayMetrics.pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Current Streak */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${bgCard}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${textMuted}`}>Current Streak</span>
                        <Flame className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold">{analytics.currentStreak}</span>
                        <span className={`text-xs ${textMuted}`}>days</span>
                      </div>
                      <p className={`text-xs ${textMuted} mt-3`}>
                        Best Streak: <span className="text-amber-400 font-semibold">{analytics.bestStreak} days</span>
                      </p>
                    </div>

                    {/* Weekly & Monthly Completion */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${bgCard}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${textMuted}`}>Weekly / Monthly</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold">{analytics.weeklyAvg}%</span>
                        <span className={`text-xs ${textMuted}`}>7d avg</span>
                      </div>
                      <p className={`text-xs ${textMuted} mt-3`}>
                        30-Day Avg: <span className="text-emerald-400 font-semibold">{analytics.monthlyAvg}%</span>
                      </p>
                    </div>

                    {/* Overall Consistency */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${bgCard}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${textMuted}`}>Overall Consistency</span>
                        <Trophy className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-bold">{analytics.overallConsistency}%</span>
                        <span className={`text-xs ${textMuted}`}>all-time</span>
                      </div>
                      <p className={`text-xs ${textMuted} mt-3`}>
                        Total Active Habits: <span className="font-semibold">{activeHabits.length}</span>
                      </p>
                    </div>
                  </div>

                  {/* Today's Status Breakdown + Durood Shareef Target */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Circular Ring & Counts */}
                    <div className={`p-5 rounded-2xl border ${bgCard} flex items-center gap-6`}>
                      <div className="relative w-24 h-24 shrink-0">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            strokeWidth="10"
                            className={isDark ? 'stroke-zinc-800' : 'stroke-zinc-200'}
                            fill="none"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            strokeWidth="10"
                            strokeDasharray="251.2"
                            strokeDashoffset={251.2 - (251.2 * todayMetrics.pct) / 100}
                            strokeLinecap="round"
                            className="stroke-emerald-500 transition-all duration-500"
                            fill="none"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-lg font-bold">{todayMetrics.pct}%</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-sm">Today&apos;s Breakdown</h3>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
                          </span>
                          <span className="font-bold">{todayMetrics.completed}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-red-400">
                            <span className="w-2 h-2 rounded-full bg-red-500" /> Missed
                          </span>
                          <span className="font-bold">{todayMetrics.missed}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={`flex items-center gap-1.5 ${textMuted}`}>
                            <span className="w-2 h-2 rounded-full bg-zinc-500" /> Pending
                          </span>
                          <span className="font-bold">{todayMetrics.pending}</span>
                        </div>
                      </div>
                    </div>

                    {/* Durood Shareef Dedicated Card */}
                    <div className={`p-5 rounded-2xl border ${bgCard} lg:col-span-2 flex flex-col justify-between`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                            Daily Spiritual Target
                          </span>
                          <h3 className="text-lg font-bold mt-0.5">Durood Shareef Progress</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-emerald-400">{todayMetrics.duroodCount}</span>
                          <span className={`text-sm ${textMuted}`}> / {todayMetrics.duroodTarget}</span>
                        </div>
                      </div>

                      <div className="my-4">
                        <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${todayMetrics.duroodPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className={textMuted}>
                          Monthly Total: <strong className="text-emerald-400">{analytics.monthlyDuroodTotal.toLocaleString()}</strong> Durood
                        </span>
                        {duroodHabit && (
                          <div className="flex items-center gap-1.5">
                            {[10, 50, 100].map((inc) => (
                              <button
                                key={inc}
                                onClick={() =>
                                  updateHabitStatus(todayKey, duroodHabit.id, todayMetrics.duroodCount + inc)
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-semibold border border-emerald-500/25 transition"
                              >
                                +{inc}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 7-Day Completion Trend Bar Chart */}
                  <div className={`p-5 rounded-2xl border ${bgCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-base">7-Day Discipline Trend</h3>
                        <p className={`text-xs ${textMuted}`}>Daily completion percentage over the past week</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">Avg: {analytics.weeklyAvg}%</span>
                    </div>

                    <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-40 pt-4">
                      {analytics.last7Keys.map((dKey) => {
                        const m = getDayMetrics(dKey);
                        const dObj = parseDateKey(dKey);
                        const dayLabel = dObj.toLocaleDateString('en-US', { weekday: 'short' });
                        const isToday = dKey === todayKey;
                        return (
                          <button
                            key={dKey}
                            onClick={() => {
                              setSelectedDate(dKey);
                              setActiveTab('tracker');
                            }}
                            className="flex flex-col items-center h-full justify-end group"
                          >
                            <span className={`text-[11px] font-semibold mb-1.5 ${isToday ? 'text-emerald-400' : textMuted}`}>
                              {m.pct}%
                            </span>
                            <div className="w-full max-w-[40px] h-24 bg-zinc-800/70 rounded-xl flex items-end overflow-hidden p-0.5">
                              <div
                                className={`w-full rounded-lg transition-all duration-500 ${
                                  m.pct >= 70
                                    ? 'bg-emerald-500'
                                    : m.pct >= 40
                                    ? 'bg-amber-500'
                                    : m.pct > 0
                                    ? 'bg-red-500'
                                    : 'bg-zinc-700'
                                }`}
                                style={{ height: `${Math.max(8, m.pct)}%` }}
                              />
                            </div>
                            <span
                              className={`text-xs mt-2 font-medium ${
                                isToday ? 'text-emerald-400 font-bold' : textMuted
                              }`}
                            >
                              {dayLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================
                  VIEW 2: DAILY HABIT TRACKER
                  ============================================================ */}
              {activeTab === 'tracker' && (
                <div className="space-y-5">
                  {/* Date Navigation Bar */}
                  <div className={`p-4 rounded-2xl border ${bgCard} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <button
                        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                        className={`p-2.5 rounded-xl border ${bgSubtle} hover:border-emerald-500/40 transition`}
                        aria-label="Previous Day"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="text-center sm:text-left min-w-[180px]">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <h2 className="text-lg sm:text-xl font-bold">{formatDisplayDate(selectedDate)}</h2>
                          {selectedDate === todayKey && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Today
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${textMuted}`}>
                          {selectedDayMetrics.completed} of {selectedDayMetrics.totalBool} completed ({selectedDayMetrics.pct}%)
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        className={`p-2.5 rounded-xl border ${bgSubtle} hover:border-emerald-500/40 transition`}
                        aria-label="Next Day"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedDate !== todayKey && (
                        <button
                          onClick={() => setSelectedDate(todayKey)}
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/25 transition"
                        >
                          Jump to Today
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('calendar')}
                        className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl border ${bgSubtle} text-xs font-medium flex items-center justify-center gap-1.5 hover:border-emerald-500/40 transition`}
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                        Pick Date
                      </button>
                    </div>
                  </div>

                  {/* Progress Strip */}
                  <div className={`p-4 rounded-2xl border ${bgCard}`}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-semibold">Daily Completion Rate</span>
                      <span className="font-bold text-emerald-400">{selectedDayMetrics.pct}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${selectedDayMetrics.pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Habits List (Touch-Friendly Cards on Mobile + Clean Rows on Desktop) */}
                  <div className="space-y-2.5">
                    {activeHabits.map((habit, idx) => {
                      const rawVal = dailyRecords[selectedDate]?.statuses?.[habit.id];
                      const isNumeric = habit.type === 'numeric';

                      if (isNumeric) {
                        const numVal = Number(rawVal || 0);
                        const target = habit.target || userSettings.duroodTarget || 100;
                        const pct = target > 0 ? Math.min(100, Math.round((numVal / target) * 100)) : 0;

                        return (
                          <div
                            key={habit.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              numVal >= target
                                ? isDark
                                  ? 'bg-emerald-950/20 border-emerald-500/40'
                                  : 'bg-emerald-50 border-emerald-300'
                                : bgCard
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-mono ${textMuted}`}>
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                  <h3 className="font-semibold text-base">{habit.name}</h3>
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                                    {habit.category || 'Numeric'}
                                  </span>
                                </div>
                                <p className={`text-xs ${textMuted} mt-1`}>
                                  Target: {target} • Progress: <span className="text-emerald-400 font-semibold">{pct}%</span>
                                </p>
                              </div>

                              {/* Numeric Input & Quick Increment Tap Buttons */}
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={numVal === 0 ? '' : numVal}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value || '0', 10));
                                    updateHabitStatus(selectedDate, habit.id, val);
                                  }}
                                  className={`w-24 px-3 py-2.5 rounded-xl border text-center font-bold text-base focus:outline-none focus:border-emerald-500 ${
                                    isDark
                                      ? 'bg-zinc-900 border-zinc-700 text-white'
                                      : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                                  }`}
                                />
                                {[10, 50, 100].map((step) => (
                                  <button
                                    key={step}
                                    type="button"
                                    onClick={() => updateHabitStatus(selectedDate, habit.id, numVal + step)}
                                    className="px-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 text-emerald-400 font-semibold text-xs border border-emerald-500/25 transition"
                                  >
                                    +{step}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Numeric Progress Bar */}
                            <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      }

                      // Boolean Tick / Cross / Empty Habit Row
                      const status = rawVal || 'empty';
                      const isDone = status === 'done';
                      const isMissed = status === 'missed';

                      return (
                        <div
                          key={habit.id}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isDone
                              ? isDark
                                ? 'bg-emerald-950/20 border-emerald-500/40'
                                : 'bg-emerald-50/80 border-emerald-300'
                              : isMissed
                              ? isDark
                                ? 'bg-red-950/20 border-red-500/40'
                                : 'bg-red-50/80 border-red-300'
                              : bgCard
                          }`}
                        >
                          {/* Clicking Habit Name cycles state: Empty -> Tick -> Cross -> Empty */}
                          <button
                            type="button"
                            onClick={() => handleCycleBooleanHabit(selectedDate, habit.id)}
                            className="flex-1 text-left flex items-center gap-3 min-w-0 py-1"
                          >
                            <span className={`text-xs font-mono ${textMuted} shrink-0`}>
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`font-semibold text-sm sm:text-base truncate ${
                                  isDone
                                    ? 'text-emerald-400'
                                    : isMissed
                                    ? 'text-red-400'
                                    : ''
                                }`}
                              >
                                {habit.name}
                              </p>
                              <span className={`text-[11px] ${textMuted}`}>{habit.category}</span>
                            </div>
                          </button>

                          {/* Large Touch-Friendly Tick & Cross Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                updateHabitStatus(selectedDate, habit.id, isDone ? 'empty' : 'done')
                              }
                              aria-label="Mark Completed"
                              className={`w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/25'
                                  : isDark
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400'
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:border-emerald-400'
                              }`}
                            >
                              <Check className="w-5 h-5 stroke-[2.5]" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateHabitStatus(selectedDate, habit.id, isMissed ? 'empty' : 'missed')
                              }
                              aria-label="Mark Missed"
                              className={`w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
                                isMissed
                                  ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/25'
                                  : isDark
                                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-red-500/50 hover:text-red-400'
                                  : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:border-red-400'
                              }`}
                            >
                              <X className="w-5 h-5 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Daily Reflection & Notes Card */}
                  <div className={`p-4 sm:p-5 rounded-2xl border ${bgCard}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        Daily Reflection & Journal Notes
                      </label>
                      <span className={`text-[11px] ${textMuted}`}>Auto-saved per date</span>
                    </div>
                    <textarea
                      rows={3}
                      value={noteDraft}
                      onChange={(e) => handleNoteChange(e.target.value)}
                      placeholder="Write about your discipline, energy levels, prayers, or improvements for today..."
                      className={`w-full p-3.5 rounded-xl border text-sm focus:outline-none focus:border-emerald-500 transition ${
                        isDark
                          ? 'bg-zinc-900/90 border-zinc-800 text-zinc-100 placeholder-zinc-500'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* ============================================================
                  VIEW 3: DAILY CALENDAR
                  ============================================================ */}
              {activeTab === 'calendar' && (() => {
                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth();
                const firstDayOfWeek = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const monthTitle = calendarMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                });

                const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);
                const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                return (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight">Habit Calendar</h1>
                        <p className={`text-sm ${textMuted}`}>
                          Tap any date to inspect or update historical habit records
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
                          className={`p-2.5 rounded-xl border ${bgCard} hover:border-emerald-500/40`}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className={`px-4 py-2 rounded-xl border ${bgCard} font-semibold text-sm min-w-[150px] text-center`}>
                          {monthTitle}
                        </div>
                        <button
                          onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                          className={`p-2.5 rounded-xl border ${bgCard} hover:border-emerald-500/40`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className={`p-4 sm:p-6 rounded-2xl border ${bgCard}`}>
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center mb-3">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                          <div key={d} className={`text-xs font-semibold py-1 ${textMuted}`}>
                            {d}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {blanks.map((b) => (
                          <div key={`b-${b}`} className="aspect-square" />
                        ))}

                        {dayNumbers.map((dayNum) => {
                          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          const hasRecord = Boolean(dailyRecords[dateKey]);
                          const m = getDayMetrics(dateKey);
                          const isToday = dateKey === todayKey;
                          const isSelected = dateKey === selectedDate;

                          let cellBg = isDark ? 'bg-zinc-900/60 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200';
                          if (hasRecord && m.completed + m.missed > 0) {
                            if (m.pct >= 75) {
                              cellBg = isDark
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-emerald-100 border-emerald-400 text-emerald-900';
                            } else if (m.pct >= 40) {
                              cellBg = isDark
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-amber-100 border-amber-400 text-amber-900';
                            } else {
                              cellBg = isDark
                                ? 'bg-red-500/15 border-red-500/40 text-red-300'
                                : 'bg-red-100 border-red-400 text-red-900';
                            }
                          }

                          return (
                            <button
                              key={dateKey}
                              onClick={() => {
                                setSelectedDate(dateKey);
                                setActiveTab('tracker');
                              }}
                              className={`aspect-square rounded-xl border p-1.5 flex flex-col items-center justify-between transition hover:scale-[1.03] ${cellBg} ${
                                isToday ? 'ring-2 ring-emerald-400' : ''
                              } ${isSelected ? 'ring-2 ring-white' : ''}`}
                            >
                              <span className={`text-xs sm:text-sm font-bold ${isToday ? 'text-emerald-400' : ''}`}>
                                {dayNum}
                              </span>
                              {hasRecord && (m.completed + m.missed > 0) ? (
                                <span className="text-[10px] font-semibold">{m.pct}%</span>
                              ) : (
                                <span className="text-[10px] opacity-30">—</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-zinc-800/60 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-500" /> High (75%+)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-amber-500/40 border border-amber-500" /> Partial (40–74%)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-red-500/40 border border-red-500" /> Low (&lt;40%)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded ring-2 ring-emerald-400" /> Today
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ============================================================
                  VIEW 4: STATISTICS & REPORTS
                  ============================================================ */}
              {activeTab === 'stats' && (() => {
                const compA = getMonthSummary(compareMonthA);
                const compB = getMonthSummary(compareMonthB);

                return (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
                      <p className={`text-sm ${textMuted}`}>
                        30-day consistency heatmap, Durood analytics, and habit performance insights
                      </p>
                    </div>

                    {/* 30-Day Consistency Heatmap */}
                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-base">30-Day Discipline Heatmap</h3>
                          <p className={`text-xs ${textMuted}`}>Green = High completion • Red = Low performance</p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400">
                          30-Day Avg: {analytics.monthlyAvg}%
                        </span>
                      </div>

                      <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
                        {analytics.last30Keys.map((dKey) => {
                          const m = getDayMetrics(dKey);
                          const hasActivity = m.completed + m.missed > 0;
                          let boxColor = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200';
                          if (hasActivity) {
                            if (m.pct >= 75) boxColor = 'bg-emerald-500 text-zinc-950 border-emerald-400';
                            else if (m.pct >= 40) boxColor = 'bg-amber-500/80 text-zinc-950 border-amber-400';
                            else boxColor = 'bg-red-500/80 text-white border-red-400';
                          }

                          return (
                            <button
                              key={dKey}
                              onClick={() => {
                                setSelectedDate(dKey);
                                setActiveTab('tracker');
                              }}
                              title={`${formatDisplayDate(dKey)}: ${m.pct}%`}
                              className={`p-2 rounded-xl border flex flex-col items-center justify-center transition hover:scale-105 ${boxColor}`}
                            >
                              <span className="text-[10px] font-bold">{dKey.slice(8)}</span>
                              <span className="text-[9px] opacity-85">{hasActivity ? `${m.pct}%` : '-'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Most Consistent vs Frequently Missed Habits */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Consistent */}
                      <div className={`p-5 rounded-2xl border ${bgCard}`}>
                        <div className="flex items-center gap-2 mb-4">
                          <Award className="w-5 h-5 text-emerald-400" />
                          <h3 className="font-semibold text-base">Most Consistent Habits</h3>
                        </div>
                        <div className="space-y-3">
                          {analytics.mostConsistent.map((h) => (
                            <div key={h.id}>
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span>{h.name}</span>
                                <span className="text-emerald-400 font-bold">{h.rate}%</span>
                              </div>
                              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${h.rate}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Frequently Missed */}
                      <div className={`p-5 rounded-2xl border ${bgCard}`}>
                        <div className="flex items-center gap-2 mb-4">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <h3 className="font-semibold text-base">Needs Focus (Frequently Missed)</h3>
                        </div>
                        {analytics.frequentlyMissed.length === 0 ? (
                          <p className={`text-sm ${textMuted}`}>
                            Great discipline! No habits below 80% consistency.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {analytics.frequentlyMissed.map((h) => (
                              <div key={h.id}>
                                <div className="flex justify-between text-xs font-medium mb-1">
                                  <span>{h.name}</span>
                                  <span className="text-red-400 font-bold">{h.rate}%</span>
                                </div>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-red-500 rounded-full"
                                    style={{ width: `${Math.max(6, h.rate)}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Durood Shareef Daily Bar Chart (Last 14 Days) */}
                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                          <h3 className="font-semibold text-base">Durood Shareef Daily Recitation (Last 14 Days)</h3>
                          <p className={`text-xs ${textMuted}`}>
                            Daily target: {userSettings.duroodTarget || 100} Durood
                          </p>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold text-emerald-400">
                          This Month Total: {analytics.monthlyDuroodTotal.toLocaleString()}
                        </div>
                      </div>

                      <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-36 pt-4">
                        {Array.from({ length: 14 }, (_, i) => addDays(todayKey, -(13 - i))).map((dKey) => {
                          const m = getDayMetrics(dKey);
                          const barPct = Math.min(100, Math.round((m.duroodCount / Math.max(1, m.duroodTarget)) * 100));
                          return (
                            <div key={dKey} className="flex flex-col items-center h-full justify-end">
                              <span className="text-[10px] text-emerald-400 font-semibold mb-1">
                                {m.duroodCount > 0 ? m.duroodCount : ''}
                              </span>
                              <div className="w-full h-20 bg-zinc-800/70 rounded-lg flex items-end p-0.5">
                                <div
                                  className="w-full bg-emerald-500 rounded-md transition-all"
                                  style={{ height: `${Math.max(4, barPct)}%` }}
                                />
                              </div>
                              <span className={`text-[10px] mt-1.5 ${textMuted}`}>{dKey.slice(8)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Month-over-Month Comparison */}
                    <div className={`p-5 rounded-2xl border ${bgCard}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div>
                          <h3 className="font-semibold text-base">Month-over-Month Comparison</h3>
                          <p className={`text-xs ${textMuted}`}>Compare performance across two months</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="month"
                            value={compareMonthA}
                            onChange={(e) => setCompareMonthA(e.target.value)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium ${
                              isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300'
                            }`}
                          />
                          <span className={`text-xs ${textMuted}`}>vs</span>
                          <input
                            type="month"
                            value={compareMonthB}
                            onChange={(e) => setCompareMonthB(e.target.value)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-medium ${
                              isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: compareMonthA, data: compA, accent: 'text-emerald-400' },
                          { label: compareMonthB, data: compB, accent: 'text-zinc-300' }
                        ].map((item) => (
                          <div key={item.label} className={`p-4 rounded-xl border ${bgSubtle} space-y-2.5`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm">{item.label}</span>
                              <span className={`text-lg font-bold ${item.accent}`}>{item.data.avgPct}% Avg</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-zinc-800/60">
                              <div>
                                <span className={`block ${textMuted}`}>Days Logged</span>
                                <span className="font-bold">{item.data.daysLogged}</span>
                              </div>
                              <div>
                                <span className={`block ${textMuted}`}>Perfect Days</span>
                                <span className="font-bold">{item.data.perfectDays}</span>
                              </div>
                              <div>
                                <span className={`block ${textMuted}`}>Total Durood</span>
                                <span className="font-bold text-emerald-400">{item.data.totalDurood}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ============================================================
                  VIEW 5: MANAGE HABITS
                  ============================================================ */}
              {activeTab === 'manage' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Habits</h1>
                    <p className={`text-sm ${textMuted}`}>
                      Add custom habits, edit titles/targets, or reorder without losing historical logs
                    </p>
                  </div>

                  {/* Add New Habit Form */}
                  <form onSubmit={handleAddHabit} className={`p-5 rounded-2xl border ${bgCard} space-y-4`}>
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      Create New Custom Habit
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className={`block text-xs font-medium ${textMuted} mb-1`}>Habit Name</label>
                        <input
                          type="text"
                          required
                          value={newHabitName}
                          onChange={(e) => setNewHabitName(e.target.value)}
                          placeholder="e.g., Read 10 Pages, Tahajjud, Gym Workout"
                          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-emerald-500 ${
                            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300'
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-medium ${textMuted} mb-1`}>Tracking Type</label>
                        <select
                          value={newHabitType}
                          onChange={(e) => setNewHabitType(e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-emerald-500 ${
                            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300'
                          }`}
                        >
                          <option value="boolean">Tick / Cross</option>
                          <option value="numeric">Numeric Counter</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-medium ${textMuted} mb-1`}>Category</label>
                        <select
                          value={newHabitCategory}
                          onChange={(e) => setNewHabitCategory(e.target.value)}
                          className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-emerald-500 ${
                            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300'
                          }`}
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {newHabitType === 'numeric' && (
                      <div className="max-w-xs">
                        <label className={`block text-xs font-medium ${textMuted} mb-1`}>Daily Numeric Target</label>
                        <input
                          type="number"
                          min="1"
                          value={newHabitTarget}
                          onChange={(e) => setNewHabitTarget(e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-xl border text-sm ${
                            isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300'
                          }`}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Habit to Daily Routine
                    </button>
                  </form>

                  {/* Active Habits Reorder & Edit List */}
                  <div className="space-y-2.5">
                    {activeHabits.map((habit, idx) => (
                      <div
                        key={habit.id}
                        className={`p-4 rounded-2xl border ${bgCard} flex items-center justify-between gap-3`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-xs font-mono ${textMuted}`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base truncate">{habit.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs ${textMuted}`}>{habit.category}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {habit.type === 'numeric' ? `Numeric (Target: ${habit.target || 100})` : 'Tick / Cross'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveHabit(idx, -1)}
                            className={`p-2 rounded-lg border ${bgSubtle} disabled:opacity-30 hover:border-emerald-500/40`}
                            title="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeHabits.length - 1}
                            onClick={() => handleMoveHabit(idx, 1)}
                            className={`p-2 rounded-lg border ${bgSubtle} disabled:opacity-30 hover:border-emerald-500/40`}
                            title="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingHabit({ ...habit })}
                            className={`p-2 rounded-lg border ${bgSubtle} hover:border-emerald-500/40 text-emerald-400`}
                            title="Edit Habit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchiveOrDeleteHabit(habit)}
                            className={`p-2 rounded-lg border ${bgSubtle} hover:border-red-500/40 text-red-400`}
                            title="Remove Habit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================
                  VIEW 6: SETTINGS & DATA MANAGEMENT
                  ============================================================ */}
              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings & Sync</h1>
                    <p className={`text-sm ${textMuted}`}>
                      Customize targets, reminders, appearance, exports, and device installation
                    </p>
                  </div>

                  {/* Account & Sync Card */}
                  <div className={`p-5 rounded-2xl border ${bgCard} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                        Cloud Account Connected
                      </span>
                      <h3 className="text-base font-bold mt-1">
                        {user.displayName || user.email || 'HabitX Cloud Member'}
                      </h3>
                      <p className={`text-xs ${textMuted} mt-0.5`}>
                        {user.email ? user.email : `Cloud Sync ID: ${user.uid}`}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>

                  {/* Daily Durood Target & Appearance */}
                  <div className={`p-5 rounded-2xl border ${bgCard} space-y-5`}>
                    <h3 className="font-semibold text-base">Targets & Appearance</h3>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Daily Durood Shareef Target</p>
                        <p className={`text-xs ${textMuted}`}>Set your daily recitation goal</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={userSettings.duroodTarget}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value || '100', 10));
                          updateSettings({ duroodTarget: val });
                          if (duroodHabit && user) {
                            setDoc(
                              doc(db, 'artifacts', appId, 'users', user.uid, 'habits', duroodHabit.id),
                              { target: val },
                              { merge: true }
                            );
                          }
                        }}
                        className={`w-32 px-3.5 py-2 rounded-xl border text-sm font-bold ${
                          isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/60">
                      <div>
                        <p className="text-sm font-medium">Interface Theme</p>
                        <p className={`text-xs ${textMuted}`}>Switch between Dark Charcoal and Clean Light mode</p>
                      </div>
                      <button
                        onClick={() => updateSettings({ theme: isDark ? 'light' : 'dark' })}
                        className={`px-4 py-2 rounded-xl border ${bgSubtle} text-xs font-semibold flex items-center gap-2`}
                      >
                        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
                        {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      </button>
                    </div>
                  </div>

                  {/* Habit Reminder Notifications */}
                  <div className={`p-5 rounded-2xl border ${bgCard} space-y-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-5 h-5 text-emerald-400" />
                        <div>
                          <h3 className="font-semibold text-base">Daily Discipline Reminder</h3>
                          <p className={`text-xs ${textMuted}`}>Receive browser and in-app reminders for key habits</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const nextState = !userSettings.reminderEnabled;
                          if (nextState && 'Notification' in window && Notification.permission !== 'granted') {
                            await Notification.requestPermission();
                          }
                          updateSettings({ reminderEnabled: nextState });
                          showToast(nextState ? 'Habit reminder enabled!' : 'Habit reminder disabled.');
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                          userSettings.reminderEnabled
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                            : `${bgSubtle}`
                        }`}
                      >
                        {userSettings.reminderEnabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className={`block text-xs ${textMuted} mb-1`}>Reminder Time</label>
                        <input
                          type="time"
                          value={userSettings.reminderTime}
                          onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border text-sm ${
                            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs ${textMuted} mb-1`}>Focus Habit</label>
                        <select
                          value={userSettings.reminderHabit}
                          onChange={(e) => updateSettings({ reminderHabit: e.target.value })}
                          className={`w-full px-3 py-2 rounded-xl border text-sm ${
                            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300'
                          }`}
                        >
                          {activeHabits.map((h) => (
                            <option key={h.id} value={h.name}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={triggerReminderNotification}
                      className={`text-xs font-medium text-emerald-400 hover:underline`}
                    >
                      Send Test Notification Now
                    </button>
                  </div>

                  {/* Export, Backup & PWA Install */}
                  <div className={`p-5 rounded-2xl border ${bgCard} space-y-4`}>
                    <h3 className="font-semibold text-base">Data Export, Backup & App Installation</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={handleExportCSV}
                        className={`p-3.5 rounded-xl border ${bgSubtle} hover:border-emerald-500/40 flex items-center gap-3 text-left transition`}
                      >
                        <Download className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="block text-sm font-semibold">Export to Excel / CSV</span>
                          <span className={`text-xs ${textMuted}`}>Download complete habit history</span>
                        </div>
                      </button>

                      <button
                        onClick={handleExportBackupJSON}
                        className={`p-3.5 rounded-xl border ${bgSubtle} hover:border-emerald-500/40 flex items-center gap-3 text-left transition`}
                      >
                        <Download className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="block text-sm font-semibold">Download JSON Backup</span>
                          <span className={`text-xs ${textMuted}`}>Full snapshot of habits & logs</span>
                        </div>
                      </button>

                      <label
                        className={`p-3.5 rounded-xl border ${bgSubtle} hover:border-emerald-500/40 flex items-center gap-3 text-left transition cursor-pointer`}
                      >
                        <Upload className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="block text-sm font-semibold">Restore from Backup</span>
                          <span className={`text-xs ${textMuted}`}>Upload a HabitX .json file</span>
                        </div>
                        <input type="file" accept=".json" onChange={handleRestoreBackupJSON} className="hidden" />
                      </label>

                      <button
                        onClick={() => setShowInstallModal(true)}
                        className={`p-3.5 rounded-xl border ${bgSubtle} hover:border-emerald-500/40 flex items-center gap-3 text-left transition`}
                      >
                        <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="block text-sm font-semibold">Install HabitX App</span>
                          <span className={`text-xs ${textMuted}`}>iPhone Safari & Windows guide</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (iPhone / Small Screens) */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-lg ${
          isDark ? 'bg-[#09090b]/95 border-zinc-800/90' : 'bg-white/95 border-zinc-200'
        }`}
      >
        <div className="grid grid-cols-6 py-1.5 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
                  active ? 'text-emerald-400' : textMuted
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium truncate max-w-full px-0.5">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ====================================================================
          MODAL 1: EDIT HABIT MODAL
          ==================================================================== */}
      {editingHabit && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 ${bgCard} shadow-2xl`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Edit Habit</h3>
              <button onClick={() => setEditingHabit(null)} className={textMuted}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedHabit} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium ${textMuted} mb-1`}>Habit Name</label>
                <input
                  type="text"
                  required
                  value={editingHabit.name}
                  onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium ${textMuted} mb-1`}>Category</label>
                <select
                  value={editingHabit.category || 'Discipline'}
                  onChange={(e) => setEditingHabit({ ...editingHabit, category: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300'
                  }`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {editingHabit.type === 'numeric' && (
                <div>
                  <label className={`block text-xs font-medium ${textMuted} mb-1`}>Daily Target</label>
                  <input
                    type="number"
                    min="1"
                    value={editingHabit.target || 100}
                    onChange={(e) => setEditingHabit({ ...editingHabit, target: Number(e.target.value) })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-300'
                    }`}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingHabit(null)}
                  className={`px-4 py-2 rounded-xl border ${bgSubtle} text-xs font-semibold`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: CONFIRMATION DIALOG (REPLACES WINDOW.CONFIRM)
          ==================================================================== */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-6 ${bgCard} shadow-2xl space-y-4`}>
            <h3 className="text-lg font-bold">{confirmModal.title}</h3>
            <p className={`text-sm ${textMuted}`}>{confirmModal.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className={`px-4 py-2 rounded-xl border ${bgSubtle} text-xs font-semibold`}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-semibold"
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: PWA INSTALL GUIDE (IPHONE SAFARI & WINDOWS DESKTOP)
          ==================================================================== */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 ${bgCard} shadow-2xl space-y-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold">Install HabitX on Your Devices</h3>
              </div>
              <button onClick={() => setShowInstallModal(false)} className={textMuted}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {deferredPrompt && (
              <button
                onClick={async () => {
                  deferredPrompt.prompt();
                  await deferredPrompt.userChoice;
                  setDeferredPrompt(null);
                  setShowInstallModal(false);
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                One-Click Install App Now
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* iPhone Safari Instructions */}
              <div className={`p-4 rounded-xl border ${bgSubtle} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                  iPhone (Safari)
                </div>
                <ol className={`text-xs ${textMuted} space-y-1.5 list-decimal list-inside`}>
                  <li>Open HabitX in <strong>Safari</strong> on your iPhone.</li>
                  <li>
                    Tap the <strong>Share</strong> icon <Share className="w-3.5 h-3.5 inline text-emerald-400" /> at the bottom bar.
                  </li>
                  <li>
                    Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                  </li>
                  <li>Tap <strong>Add</strong> to launch HabitX full-screen like a native app.</li>
                </ol>
              </div>

              {/* Windows Chrome / Edge Instructions */}
              <div className={`p-4 rounded-xl border ${bgSubtle} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                  <Monitor className="w-4 h-4" />
                  Windows (Chrome / Edge)
                </div>
                <ol className={`text-xs ${textMuted} space-y-1.5 list-decimal list-inside`}>
                  <li>Open HabitX in <strong>Chrome</strong> or <strong>Microsoft Edge</strong>.</li>
                  <li>Click the <strong>Install App</strong> icon in the right side of the address bar.</li>
                  <li>Or open browser menu <MoreVertical className="w-3.5 h-3.5 inline" /> &rarr; <strong>Apps &rarr; Install HabitX</strong>.</li>
                  <li>Pin it to your Windows Taskbar for instant daily access.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowInstallModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-semibold text-xs"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}