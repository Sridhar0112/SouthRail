import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import CompactJourneyCard from '../../search/components/CompactJourneyCard.jsx';
import AlertStrip from './AlertStrip.jsx';
import HeroBadge from './HeroBadge.jsx';
import QuickServices from './QuickServices.jsx';
import SearchTabs from '../../search/components/SearchTabs.jsx';

export default function HeroViewport({ searchProps }) {
  return (
    <section className="sr-hero-viewport" aria-labelledby="southrail-home-title">
      <Container maxWidth={false} className="sr-layout-container sr-hero-container">
        <Box className="sr-hero-shell">
          <Stack className="sr-hero-copy" spacing={0.75}>
            <HeroBadge />
            <Typography id="southrail-home-title" variant="h1" className="sr-home-title">Search trains and manage railway reservations.</Typography>
            <Typography className="sr-home-lede">Plan faster with station-code search, premium route cards, clear availability cues, PNR tracking, ticket downloads, and support tools in one modern railway platform.</Typography>
            <Box className="sr-hero-proof">
              <Chip label="Instant PNR tools" variant="outlined" />
              <Chip label="Live support workflows" variant="outlined" />
              <Chip label="Mobile-ready booking" variant="outlined" />
            </Box>
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
