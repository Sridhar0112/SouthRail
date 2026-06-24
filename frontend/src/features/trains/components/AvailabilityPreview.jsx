import { Link } from 'react-router-dom';
import { Button, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const preview = [
  { name: 'Pandian SF Express', number: '12637', from: 'MS', to: 'MDU', depart: '21:40', arrive: '05:25', duration: '7h 45m', seats: '42 seats', fare: '₹1,245', status: 'Available', color: 'success' },
  { name: 'Cheran SF Express', number: '12673', from: 'MAS', to: 'CBE', depart: '22:00', arrive: '06:50', duration: '8h 50m', seats: '9 seats', fare: '₹1,385', status: 'Limited', color: 'warning' },
  { name: 'Kanyakumari Express', number: '12633', from: 'MDU', to: 'NCJ', depart: '01:10', arrive: '05:45', duration: '4h 35m', seats: 'WL 4', fare: '₹875', status: 'Waitlist', color: 'error' }
];

export default function AvailabilityPreview() {
  return (
    <section className="sr-home-section" aria-labelledby="availability-title">
      <Container maxWidth="xl">
        <Stack className="sr-section-heading" spacing={0.75}>
          <Typography variant="overline">Live availability preview</Typography>
          <Typography id="availability-title" variant="h2">Results look like a working departures board.</Typography>
          <Typography color="text.secondary">Passengers can understand train identity, route timing, availability, class context, and fare before they reserve.</Typography>
        </Stack>
        <Stack spacing={1.25} className="sr-preview-board">
          {preview.map((train) => <PreviewRow key={train.number} train={train} />)}
        </Stack>
      </Container>
    </section>
  );
}

function PreviewRow({ train }) {
  return (
    <Paper className="sr-preview-row" elevation={0}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
        <div className="sr-preview-train"><Typography variant="h6">{train.name}</Typography><Typography color="text.secondary">{train.number} · 3A · General</Typography></div>
        <div className="sr-preview-route"><Station code={train.from} time={train.depart} /><i /><span>{train.duration}</span><i /><Station code={train.to} time={train.arrive} /></div>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap className="sr-preview-actions">
          <Chip color={train.color} label={`${train.status} · ${train.seats}`} />
          <Typography fontWeight={900}>{train.fare}</Typography>
          <Button component={Link} to="/" variant="outlined" endIcon={<ArrowForwardIcon />}>Reserve</Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function Station({ code, time }) { return <div><strong>{time}</strong><small>{code}</small></div>; }
