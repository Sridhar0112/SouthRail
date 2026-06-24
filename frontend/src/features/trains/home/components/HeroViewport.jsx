import { Box, Container, Stack, Typography } from '@mui/material';
import CompactJourneyCard from '../../search/components/CompactJourneyCard.jsx';
import AlertStrip from './AlertStrip.jsx';
import HeroBadge from './HeroBadge.jsx';
import QuickServices from './QuickServices.jsx';
import SearchTabs from '../../search/components/SearchTabs.jsx';

export default function HeroViewport({ searchProps }) {
  return (
    <section className="sr-hero-viewport" aria-labelledby="southrail-home-title">
      <Container maxWidth="xl" className="sr-hero-container">
        <Box className="sr-hero-shell">
          <Stack className="sr-hero-copy" spacing={1}>
            <HeroBadge />
            <Typography id="southrail-home-title" variant="h1" className="sr-home-title">Book southern rail journeys without losing the timetable.</Typography>
            <Typography className="sr-home-lede">Search trains, compare seats, check fares, and keep the booking workflow in one compact railway desk.</Typography>
          </Stack>
          <Box className="sr-booking-desk">
            <SearchTabs />
            <CompactJourneyCard {...searchProps} />
          </Box>
          <QuickServices />
          <AlertStrip />
        </Box>
      </Container>
    </section>
  );
}
