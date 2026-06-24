import { Grid, Paper, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SearchIcon from '@mui/icons-material/Search';
import TrainIcon from '@mui/icons-material/Train';
import HomeSection from './HomeSection.jsx';

const steps = [
  { title: 'Search route', copy: 'Enter station codes, date, class, and quota.', icon: <SearchIcon /> },
  { title: 'Compare trains', copy: 'Review timing, duration, availability, and fare.', icon: <TrainIcon /> },
  { title: 'Review ticket', copy: 'Add passengers and confirm the booking summary.', icon: <FactCheckIcon /> },
  { title: 'Manage by PNR', copy: 'Track status, download tickets, or request support.', icon: <CheckCircleOutlineIcon /> }
];

export default function BookingProcess() {
  return (
    <HomeSection id="booking-process" eyebrow="Booking flow" title="From search to PNR in four steps.">
      <Grid container spacing={1.5} alignItems="stretch">
        {steps.map((step, index) => (
          <Grid key={step.title} item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
            <Paper className="sr-info-card sr-process-card" elevation={0}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>{step.icon}</span>
                <Typography variant="overline">Step {index + 1}</Typography>
              </Stack>
              <Typography variant="h6">{step.title}</Typography>
              <Typography color="text.secondary">{step.copy}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </HomeSection>
  );
}
