import { Chip, Stack, Typography } from '@mui/material';

export default function RecentSearchChips({ searches, onSelect }) {
  if (!searches?.length) return null;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap className="sr-recent-row" aria-label="Recent searches">
      <Typography variant="body2">Recent</Typography>
      {searches.slice(0, 3).map((item) => (
        <Chip
          className="sr-recent-chip"
          key={`${item.source}-${item.destination}-${item.journeyDate}-${item.travelClass}`}
          label={`${item.source} → ${item.destination} · ${item.travelClass}`}
          onClick={() => onSelect(item)}
          variant="outlined"
        />
      ))}
    </Stack>
  );
}
