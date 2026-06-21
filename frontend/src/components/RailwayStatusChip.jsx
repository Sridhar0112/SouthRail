import { Chip } from '@mui/material';
import { getBookingStatusColor, normalizeBookingStatus } from '../utils/bookingStatus.js';

export function RailwayStatusChip({ status, size = 'small', label }) {
  const displayLabel = label || formatStatus(status);
  const color = getStatusColor(status);
  return <Chip size={size} label={displayLabel} color={color} variant={color === 'default' ? 'outlined' : 'filled'} sx={{ maxWidth: '100%', '& .MuiChip-label': { px: 0.85, overflow: 'hidden', textOverflow: 'ellipsis' } }} />;
}

export function getStatusColor(status) {
  return getBookingStatusColor(status);
}

export function formatStatus(status) {
  const value = normalizeBookingStatus(status);
  return value ? value.replaceAll('_', ' ') : 'UNKNOWN';
}
