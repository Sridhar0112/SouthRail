import { Box, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DirectionsRailwayIcon from '@mui/icons-material/DirectionsRailway';
import TrainIcon from '@mui/icons-material/Train';
import { motion } from 'framer-motion';
import JourneySearchCard from './JourneySearchCard.jsx';

export default function HomeHero({ compact = false, searchProps }) {
  return (
    <Box className={`sr-home-hero ${compact ? 'sr-home-hero--compact' : ''}`}>
      <Box className="sr-hero-blob sr-hero-blob--blue" />
      <Box className="sr-hero-blob sr-hero-blob--gold" />
      <Container maxWidth="xl" className="sr-hero-container">
        <Grid container spacing={{ xs: 3, md: compact ? 2 : 4 }} alignItems="center">
          {!compact && (
            <Grid item xs={12} md={6.7} lg={7}>
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
                <Stack spacing={{ xs: 1.7, md: 2.1 }} alignItems="flex-start">
                  <Chip className="sr-hero-kicker" icon={<DirectionsRailwayIcon />} label="SouthRail Premium Booking" />
                  <Typography variant="h1" className="sr-hero-title">Find Trains. Plan Journeys.<Box component="span">Create Memories.</Box></Typography>
                  <Typography variant="h6" className="sr-hero-subtitle">A premium way to search, compare, and book trains across Chennai, Bengaluru, Kochi, Hyderabad, Madurai, Mangaluru, and iconic South Indian routes.</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>{['Instant route search', 'Smart availability', 'Secure booking'].map((item) => <Chip key={item} className="sr-trust-chip" icon={<CheckCircleIcon />} label={item} />)}</Stack>
                  <Grid container spacing={1.25} className="sr-hero-stats"><HeroStat value="120+" label="Southern routes" /><HeroStat value="24/7" label="Booking support" /><HeroStat value="3 min" label="Average search" /></Grid>
                  <Box className="sr-route-visual" aria-hidden="true"><span>Chennai</span><i /><span>Bengaluru</span><i /><span>Kochi</span></Box>
                </Stack>
              </motion.div>
            </Grid>
          )}
          <Grid item xs={12} md={compact ? 12 : 5.3} lg={compact ? 12 : 5}>
            <Box className="sr-search-wrap">
              {!compact && <Box className="sr-floating-train"><TrainIcon /> Live southern routes</Box>}
              <JourneySearchCard compact={compact} {...searchProps} />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function HeroStat({ value, label }) {
  return <Grid item xs={4}><Box className="sr-hero-stat"><Typography variant="h4">{value}</Typography><Typography variant="caption">{label}</Typography></Box></Grid>;
}
