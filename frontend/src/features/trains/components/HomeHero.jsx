import { Box, Chip, Container, Stack, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DirectionsRailwayIcon from '@mui/icons-material/DirectionsRailway';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SearchIcon from '@mui/icons-material/Search';
import TrainIcon from '@mui/icons-material/Train';
import JourneySearchCard from './JourneySearchCard.jsx';
import QuickActions from './QuickActions.jsx';

const tabs = ['Book ticket', 'PNR status', 'Live trains'];

export default function HomeHero({ searchProps }) {
  return (
    <section className="sr-home-hero" aria-labelledby="southrail-home-title">
      <Container maxWidth="xl" className="sr-hero-container">
        <Stack spacing={1.25} className="sr-hero-viewport">
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" className="sr-search-tabs" role="tablist" aria-label="Railway services">
            {tabs.map((tab, index) => <Chip key={tab} role="tab" aria-selected={index === 0} color={index === 0 ? 'primary' : 'default'} variant={index === 0 ? 'filled' : 'outlined'} icon={index === 0 ? <SearchIcon /> : undefined} label={tab} />)}
          </Stack>
          <Box className="sr-hero-grid">
            <Stack spacing={1} className="sr-hero-copy">
              <Chip className="sr-rail-chip" icon={<TrainIcon />} label="SouthRail booking desk" color="primary" />
              <Typography id="southrail-home-title" variant="h1" className="sr-home-title">Book southern rail journeys without losing the timetable.</Typography>
              <Typography color="text.secondary" className="sr-home-lede">Search trains, compare seats, check fares, and continue critical passenger services from a compact railway utility hub.</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap className="sr-alert-strip" aria-label="Rail alerts and news">
                <CampaignIcon fontSize="small" /><strong>Alerts</strong><span>Premium Tatkal opens 10:00</span><span>Festival demand high on MAS–MDU</span><span>Use PNR for coach updates</span>
              </Stack>
            </Stack>
            <JourneySearchCard compact searchProps={searchProps} {...searchProps} />
          </Box>
          <QuickActions variant="rail" actions={[{ title: 'PNR status', to: '/pnr', icon: <ConfirmationNumberIcon /> }, { title: 'My tickets', to: '/my-tickets', icon: <DirectionsRailwayIcon /> }, { title: 'Offers', to: '#offers', icon: <LocalOfferIcon /> }, { title: 'Support', to: '/support', icon: <CampaignIcon /> }]} />
        </Stack>
      </Container>
    </section>
  );
}
