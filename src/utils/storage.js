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
};

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
  },
  remove: (key) => {
    try { localStorage.removeItem(key); } catch {}
  },
};
