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
          <Stack className="sr-hero-copy" spacing={0.75}>
            <HeroBadge />
            <Typography id="southrail-home-title" variant="h1" className="sr-home-title">Search trains and manage railway reservations.</Typography>
            <Typography className="sr-home-lede">Start with route, date, class, and quota. Then compare availability, book tickets, track PNR, or get support from the same product desk.</Typography>
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
