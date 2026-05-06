const BASE = '/hrbot';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SHIFTS_CONFIG = [
  { key: 'morning',   label: 'Morning Shift',   time: '06:00 – 14:00' },
  { key: 'afternoon', label: 'Afternoon Shift',  time: '14:00 – 22:00' },
  { key: 'night',     label: 'Night Shift',      time: '22:00 – 06:00' },
];

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function getWeekDays() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      label: `${DAY_NAMES[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`,
      date:  d.toISOString().split('T')[0],
    };
  });
}

async function get(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json();
}

export async function fetchSummary() {
  return get('/api/summary');
}

export async function fetchRoster(date) {
  return get(`/api/roster/${date}`);
}

export async function generateRoster(date) {
  return get(`/api/roster/generate/${date}`);
}

export async function uploadEmployees(file) {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${BASE}/api/upload/employees`, { method: 'POST', body: fd });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `Upload failed: ${r.status}`);
  }
  return r.json();
}

export async function uploadShiftRequirements(file) {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${BASE}/api/upload/shifts`, { method: 'POST', body: fd });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `Upload failed: ${r.status}`);
  }
  return r.json();
}

export async function fetchChatResponse(message) {
  const r = await fetch(`${BASE}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message }),
  });
  if (!r.ok) throw new Error('Failed to get response');
  const data = await r.json();
  return data.response;
}
