import { supabase, hasSupabase } from './supabase';

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
  USER_ID: 'mergee_user_id',
};

// Keys that are synced to Supabase (exclude sensitive API key)
const SYNCED_KEYS = new Set([
  KEYS.STACKS, KEYS.CONVERSATIONS, KEYS.WRONG_NOTES,
  KEYS.STUDY_ACTIVITY, KEYS.STREAK, KEYS.RESUME_MATERIALS,
  KEYS.COUNSELING_LOGS, KEYS.TASKS, KEYS.TAGS,
  KEYS.TIMER_GOALS, KEYS.QUICK_LINKS,
]);

// Auth user ID — set by App.jsx when user logs in/out
let _authUserId = null;
export function setAuthUserId(id) { _authUserId = id; }

export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error:', e);
    }
    // Fire-and-forget sync to Supabase
    if (hasSupabase && (SYNCED_KEYS.has(key) || key.startsWith('daily_log_'))) {
      const userId = storage.getUserId();
      if (!userId) return;
      supabase
        .from('mergee_data')
        .upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() })
        .then(({ error }) => { if (error) console.warn('Supabase sync error:', error.message); });
    }
  },
  remove: (key) => {
    try { localStorage.removeItem(key); } catch {}
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

// Pull all data from Supabase into localStorage
export async function pullFromSupabase() {
  if (!hasSupabase) return;
  const userId = storage.getUserId();
  if (!userId) return;
  const { data, error } = await supabase
    .from('mergee_data')
    .select('key, value')
    .eq('user_id', userId);
  if (error) { console.warn('Supabase pull error:', error.message); return; }
  for (const row of data) {
    if (row.value !== null) {
      localStorage.setItem(row.key, JSON.stringify(row.value));
    }
  }
}
