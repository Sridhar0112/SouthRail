import { Chip } from '@mui/material';
import { formatStatus, getStatusColor } from '../utils/bookingStatus.js';

export function RailwayStatusChip({ status, size = 'small', label }) {
  const displayLabel = label || formatStatus(status);
  const color = getStatusColor(status);
  return (
    <Chip
      size={size}
      label={displayLabel}
      color={color === 'default' ? undefined : color}
      variant={color === 'default' ? 'outlined' : 'filled'}
      sx={{
        maxWidth: '100%',
        fontWeight: 700,
        '& .MuiChip-label': { px: 0.85, overflow: 'hidden', textOverflow: 'ellipsis' }
      }}
    />
  );
}
