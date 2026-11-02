import { supabase, hasSupabase } from './supabase';

/* ─── Demo mode — in-memory only store ─── */
let _demoMode = false;
let _demoStore = {};

export function enableDemoMode(initialData = {}) {
  _demoMode = true;
  _demoStore = { ...initialData };
}
export function disableDemoMode() {
  _demoMode = false;
  _demoStore = {};
}
export function isDemoMode() { return _demoMode; }

export const KEYS = {
  API_KEY: 'mergee_api_key',
  STACKS: 'mergee_stacks',
  CONVERSATIONS: 'mergee_conversations',
  WRONG_NOTES: 'mergee_wrong_notes',
  STUDY_ACTIVITY: 'mergee_study_activity',
  STREAK: 'mergee_streak',
  RESUME_MATERIALS: 'mergee_resume_materials',
  COUNSELING_LOGS: 'mergee_counseling_logs',
  TASKS: 'mergee_tasks',
  TAGS: 'mergee_tags',
  TIMER_GOALS: 'mergee_timer_goals',
  QUICK_LINKS: 'mergee_quick_links',
  STACK_LIBRARY: 'mergee_stack_library',
  USER_ID: 'mergee_user_id',
  HABITS: 'mergee_habits',
  TIMETABLE: 'mergee_timetable',
  HABIT_LOGS: 'mergee_habit_logs',
};

// Device-local keys that are never synced (API key is sensitive, the rest are per-device)
const LOCAL_ONLY_KEYS = new Set([
  KEYS.API_KEY, KEYS.USER_ID,
  'mergee_nickname', 'mergee_notif', 'mergee_stack_collapsed', 'mergee_last_uid',
]);

// All app data syncs to Supabase: mergee_* and daily_log_*
export function isSyncedKey(key) {
  if (LOCAL_ONLY_KEYS.has(key)) return false;
  return key.startsWith('mergee_') || key.startsWith('daily_log_');
}

// Auth user ID — set by App.jsx when user logs in/out
let _authUserId = null;
export function setAuthUserId(id) { _authUserId = id; }

export const storage = {
  get: (key, defaultValue = null) => {
    if (_demoMode) {
      return key in _demoStore ? _demoStore[key] : defaultValue;
    }
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    if (_demoMode) {
      _demoStore[key] = value; // in-memory only — no localStorage, no Supabase
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error:', e);
    }
    // Sync only for a signed-in user, so pre-login/default writes never reach the server
    if (hasSupabase && _authUserId && isSyncedKey(key)) {
      supabase
        .from('mergee_data')
        .upsert({ user_id: _authUserId, key, value, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.warn('Supabase sync error:', error.message); });
    }
  },
  remove: (key) => {
    try { localStorage.removeItem(key); } catch {}
    if (hasSupabase && _authUserId && isSyncedKey(key)) {
      supabase
        .from('mergee_data')
        .delete()
        .eq('user_id', _authUserId)
        .eq('key', key)
        .then(({ error }) => { if (error) console.warn('Supabase delete error:', error.message); });
    }
  },
  getUserId: () => {
    // Prefer auth user ID when logged in
    if (_authUserId) return _authUserId;
    // Fallback: anonymous UUID stored in localStorage
    let id = localStorage.getItem(KEYS.USER_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEYS.USER_ID, id);
    }
    return id;
  },
};

function localSyncedKeys() {
  return Object.keys(localStorage).filter(isSyncedKey);
}

// Sync on login. Server wins for keys it already has; keys that exist only locally
// (data created before sync existed or before this account signed in) are uploaded once.
export async function pullFromSupabase() {
  if (!hasSupabase || !_authUserId) return;
  const userId = _authUserId;

  // A different account used this browser last: drop its cached data so it can't leak into this one
  const lastUid = localStorage.getItem('mergee_last_uid');
  if (lastUid && lastUid !== userId) {
    localSyncedKeys().forEach((k) => localStorage.removeItem(k));
  }
  localStorage.setItem('mergee_last_uid', userId);

  const { data, error } = await supabase
    .from('mergee_data')
    .select('key, value')
    .eq('user_id', userId);
  if (error) { console.warn('Supabase pull error:', error.message); return; }

  const serverKeys = new Set();
  for (const row of data) {
    serverKeys.add(row.key);
    if (row.value !== null) {
      localStorage.setItem(row.key, JSON.stringify(row.value));
    }
  }

  const now = new Date().toISOString();
  const toUpload = [];
  for (const key of localSyncedKeys()) {
    if (serverKeys.has(key)) continue;
    try {
      toUpload.push({ user_id: userId, key, value: JSON.parse(localStorage.getItem(key)), updated_at: now });
    } catch { /* skip unparsable values */ }
  }
  if (toUpload.length) {
    const { error: upErr } = await supabase.from('mergee_data').upsert(toUpload);
    if (upErr) console.warn('Supabase initial upload error:', upErr.message);
  }
}

// Wipe all app data locally and on the server (reset data / account deletion)
export async function clearAllData() {
  if (hasSupabase && _authUserId) {
    const { error } = await supabase.from('mergee_data').delete().eq('user_id', _authUserId);
    if (error) console.warn('Supabase clear error:', error.message);
  }
  Object.keys(localStorage)
    .filter(isSyncedKey)
    .forEach((k) => localStorage.removeItem(k));
}
