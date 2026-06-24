import { Link } from 'react-router-dom';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';

export default function ResultsHeader({ hasValidSearch, search, loading, count }) {
  return (
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
      <Box>
        <Button component={Link} to="/" startIcon={<ArrowBackIcon />} variant="text">Modify search</Button>
        <Typography variant="h2">Train availability</Typography>
        <Typography color="text.secondary">{hasValidSearch ? `${search.source} → ${search.destination} · ${search.journeyDate} · ${search.travelClass} · ${search.quota}` : 'Start a valid train search from the home page.'}</Typography>
      </Box>
      <Chip icon={<SearchIcon />} color="primary" label={loading ? 'Searching inventory' : `${count} services found`} />
    </Stack>
  );
}
