import { Link } from 'react-router-dom';
import { Box, Button, Chip, Grid, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltIcon from '@mui/icons-material/Bolt';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import HotelIcon from '@mui/icons-material/Hotel';
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TrainIcon from '@mui/icons-material/Train';
import HomeSection from './HomeSection.jsx';

const specialTrains = [
  { name: 'Pandian SF Express', route: 'Chennai Egmore → Madurai', tag: 'Overnight favourite', time: '21:40 · 7h 45m' },
  { name: 'Cheran SF Express', route: 'Chennai Central → Coimbatore', tag: 'Business corridor', time: '22:00 · 8h 50m' },
  { name: 'Kanyakumari Express', route: 'Madurai → Nagercoil', tag: 'Coastal connection', time: '01:10 · 4h 35m' }
];

const offers = [
  { title: 'Weekend family fares', copy: 'Plan round trips early and keep family passenger details ready for faster checkout.', icon: <FamilyRestroomIcon /> },
  { title: 'Premium Tatkal alerts', copy: 'Use quota-aware search to spot last-minute availability on busy southbound routes.', icon: <BoltIcon /> },
  { title: 'Partner travel savings', copy: 'Bundle rail journeys with destination services from the travel desk.', icon: <CardGiftcardIcon /> }
];

const services = [
  { title: 'Station meals', copy: 'Pre-plan onboard and station food options.', icon: <RestaurantIcon /> },
  { title: 'Cab pickup', copy: 'Arrange last-mile transfers at major stations.', icon: <LocalTaxiIcon /> },
  { title: 'Hotel stays', copy: 'Keep arrival city accommodation in one flow.', icon: <HotelIcon /> },
  { title: 'Rail support', copy: 'Get booking, refund, and ticket help.', icon: <TrainIcon /> }
];

export function SpecialTrains() {
  return (
    <HomeSection id="special-trains" eyebrow="Special trains" title="Featured services for high-demand corridors." copy="Balanced cards keep timing, route and booking actions scannable on every breakpoint.">
      <Grid container spacing={1.5} alignItems="stretch">
        {specialTrains.map((train) => (
          <Grid item xs={12} md={4} key={train.name} sx={{ display: 'flex' }}>
            <Paper className="sr-info-card sr-special-card" elevation={0}>
              <Stack spacing={1.25} height="100%">
                <Chip color="primary" label={train.tag} sx={{ alignSelf: 'flex-start' }} />
                <Typography variant="h5">{train.name}</Typography>
                <Typography color="text.secondary">{train.route}</Typography>
                <Box className="sr-card-meta">{train.time}</Box>
                <Button component={Link} to="/" variant="outlined" endIcon={<ArrowForwardIcon />} sx={{ mt: 'auto', alignSelf: 'flex-start' }}>Search this train</Button>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </HomeSection>
  );
}

export function OffersSection() {
  return (
    <HomeSection id="offers" className="sr-offers-section" eyebrow="Offers" title="Practical savings without distracting from booking." copy="Offer cards use the same reusable surface and spacing scale as route, train and service cards.">
      <Grid container spacing={1.5} alignItems="stretch">
        {offers.map((offer) => <InfoCard key={offer.title} {...offer} />)}
      </Grid>
    </HomeSection>
  );
}

export function TravelServices() {
  return (
    <HomeSection id="travel-services" eyebrow="Travel services" title="Everything passengers need around the rail journey.">
      <Grid container spacing={1.5} alignItems="stretch">
        {services.map((service) => <InfoCard key={service.title} md={3} {...service} />)}
      </Grid>
    </HomeSection>
  );
}

function InfoCard({ title, copy, icon, md = 4 }) {
  return (
    <Grid item xs={12} sm={6} md={md} sx={{ display: 'flex' }}>
      <Paper className="sr-info-card" elevation={0}>
        <span>{icon}</span>
        <Typography variant="h6">{title}</Typography>
        <Typography color="text.secondary">{copy}</Typography>
      </Paper>
    </Grid>
  );
}

export function HomeFooter() {
  return (
    <Box component="footer" className="sr-home-footer">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
        <Box><Typography variant="h5">SouthRail</Typography><Typography color="text.secondary">Production-grade railway reservations for southern corridors.</Typography></Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {['PNR', 'Support', 'My tickets', 'Dashboard'].map((item) => <Chip key={item} label={item} variant="outlined" />)}
        </Stack>
      </Stack>
    </Box>
  );
}
