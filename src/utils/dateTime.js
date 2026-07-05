/** Local date/time formatting for API timestamps. */

/** Parse API datetime — ISO with offset, Z, or naive IST from backend. */
export function parseApiDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const s = String(value).trim();
  if (!s) return null;

  if (/[+-]\d{2}:\d{2}$/.test(s) || s.endsWith('Z')) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [year, month, day] = s.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Naive backend timestamps are stored in IST.
  const d = new Date(`${s.replace(' ', 'T')}+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** dd/mm/yyyy or dd/mm/yyyy, h:mm am/pm in the user's local timezone. */
export function formatLocal(value, { dateOnly = false } = {}) {
  const d = parseApiDate(value);
  if (!d) return '—';

  if (dateOnly) {
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatLocalDate(value) {
  return formatLocal(value, { dateOnly: true });
}

/** Topbar / dashboard clock in local time. */
export function formatLocalNow(date = new Date()) {
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatLocalLongDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Today's date in local timezone as YYYY-MM-DD (for date inputs). */
export function todayISOLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add months to a YYYY-MM-DD value and return local YYYY-MM-DD. */
export function addMonthsISO(isoDate, months = 1) {
  if (!isoDate) return todayISOLocal();
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(year, month - 1 + months, day);
  return todayISOLocal(d);
}

export function formatLocalTime(date = new Date()) {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// Backward-compatible aliases used across the app.
export const formatIST = formatLocal;
export const formatISTDate = formatLocalDate;
export const formatISTNow = formatLocalNow;
export const formatISTLongDate = formatLocalLongDate;
export const todayISOIST = todayISOLocal;
export const formatISTTime = formatLocalTime;
