import { Chip } from '@mui/material';

export function RailwayStatusChip({ status, size = 'small' }) {
  const label = formatStatus(status);
  return <Chip size={size} label={label} color={getStatusColor(status)} variant={getStatusColor(status) === 'default' ? 'outlined' : 'filled'} />;
}

export function getStatusColor(status) {
  const value = normalizeStatus(status);
  if (value === 'CONFIRMED' || value === 'BOOKED') {
    return 'success';
  }
  if (value === 'PENDING' || value === 'WAITLISTED' || value === 'WL' || value === 'RAC') {
    return 'warning';
  }
  if (value === 'CANCELLED' || value === 'FAILED') {
    return 'error';
  }
  if (value === 'REFUNDED') {
    return 'info';
  }
  return 'default';
}

export function formatStatus(status) {
  const value = normalizeStatus(status);
  return value ? value.replaceAll('_', ' ') : 'UNKNOWN';
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase();
}
