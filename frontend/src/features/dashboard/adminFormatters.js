// Pure formatting and labeling helpers used across the admin dashboard.
// No JSX, no data aggregation — only value -> display-string transforms.

import { getApiErrorMessage, isAuthError } from '../../utils/apiErrors.js';

export function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase();
}

export function formatStatus(status) {
  const value = normalizeStatus(status);
  return value ? value.replaceAll('_', ' ') : 'UNKNOWN';
}

export function getStatusColor(status) {
  const value = normalizeStatus(status);
  if (value === 'CONFIRMED' || value === 'BOOKED') return 'success';
  if (value === 'RAC') return 'info';
  if (value === 'WAITLISTED' || value === 'WAITLIST' || value === 'PENDING') return 'warning';
  if (value === 'CANCELLED' || value === 'FAILED') return 'error';
  if (value === 'REFUNDED') return 'info';
  return 'default';
}

export function statusBarColor(status) {
  const color = getStatusColor(status);
  if (color === 'success') return 'success.main';
  if (color === 'warning') return 'warning.main';
  if (color === 'error') return 'error.main';
  if (color === 'info') return 'info.main';
  return 'primary.main';
}

export function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'Rs -';
  }
  return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }
  return String(value);
}

// value -> 'YYYY-MM-DD' (or '' if it can't be parsed). Used for grouping by journeyDate.
export function normalizeDateKey(value) {
  if (!value) return '';
  const text = String(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function shortDate(value) {
  const key = normalizeDateKey(value);
  if (!key) return '-';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(`${key}T00:00:00`));
}

export function formatDateTime(value) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(value);
}

// Resolves a "palette.shade" string (e.g. "success.main") to a real CSS color
// from the theme. Falls back to primary.main if the token can't be resolved.
// This replaces the old alpha(resolveColorString(color), 0.12) pattern, which
// could pass raw, non-CSS tokens like "success" straight into MUI's alpha().
export function resolveColor(theme, color) {
  if (!color) return theme.palette.primary.main;
  const [paletteKey, shade] = String(color).split('.');
  return theme.palette[paletteKey]?.[shade] || theme.palette[paletteKey]?.main || color;
}

export function getAdminErrorMessage(error, fallbackMessage) {
  if (isAuthError(error)) {
    return error.response?.status === 403
      ? 'You do not have permission to access admin management. Please login with an admin account.'
      : 'Please login with an admin account.';
  }
  if (error?.response?.status >= 500) {
    return 'Unable to load admin data right now. Please try again later.';
  }
  return getApiErrorMessage(error, fallbackMessage);
}