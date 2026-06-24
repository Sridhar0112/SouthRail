import { Box, Chip, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrainIcon from '@mui/icons-material/Train';
import heroTrain from '../../../assets/southrail/hero-train.png';
import JourneySearchCard from './JourneySearchCard.jsx';

const operatingSignals = ['Search trains', 'Check seats', 'Reserve tickets'];

export default function HomeHero({ searchProps }) {
  return (
    <section className="sr-home-hero" aria-labelledby="southrail-home-title">
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 2, lg: 2.5 }} alignItems="stretch">
          <Grid item xs={12} lg={7.2}>
            <Paper className="sr-hero-panel sr-hero-panel--search" elevation={0}>
              <Stack spacing={{ xs: 1.35, md: 1.6 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Chip className="sr-rail-chip" icon={<TrainIcon />} label="SouthRail reservation desk" color="primary" />
                  <Chip className="sr-rail-chip" variant="outlined" label="Live route availability" />
                </Stack>
                <Box>
                  <Typography id="southrail-home-title" variant="h1" className="sr-home-title">
                    Search, check availability, and reserve South Indian trains.
                  </Typography>
                  <Typography color="text.secondary" className="sr-home-lede">
                    A booking-first railway workspace for Chennai, Madurai, Coimbatore, Nagercoil, Salem, and the wider southern corridor.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap className="sr-signal-row">
                  {operatingSignals.map((signal) => (
                    <span key={signal}><CheckCircleIcon fontSize="small" />{signal}</span>
                  ))}
                </Stack>
                <JourneySearchCard compact searchProps={searchProps} {...searchProps} />
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4.8}>
            <Paper className="sr-hero-panel sr-hero-panel--image" elevation={0}>
              <Box className="sr-hero-image-wrap">
                <Box component="img" src={heroTrain} alt="SouthRail train at a platform used as the main journey search visual" />
                <Box className="sr-platform-board">
                  <span>NEXT DEPARTURES</span>
                  <strong>MAS → MDU</strong>
                  <small>3A · General · Seats monitored</small>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </section>
  );
}
