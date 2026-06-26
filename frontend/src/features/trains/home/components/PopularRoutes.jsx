import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SearchIcon from '@mui/icons-material/Search';
import trainTwo from '../../../../assets/southrail/train-2.png';
import trainThree from '../../../../assets/southrail/train-3.png';
import heroTrain from '../../../../assets/southrail/hero-train.png';
import HomeSection from './HomeSection.jsx';
import { getToday, toSearchParams } from '../../searchUtils.js';

const routes = [
  { from: 'Chennai Egmore', to: 'Madurai', code: 'MS → MDU', source: 'MS', destination: 'MDU', time: '7h 45m', demand: 'High demand', price: 'from ₹420', seats: 'AVL 86', image: trainTwo },
  { from: 'Chennai Central', to: 'Coimbatore', code: 'MAS → CBE', source: 'MAS', destination: 'CBE', time: '6h 50m', demand: 'Frequent service', price: 'from ₹510', seats: 'WL 12', image: heroTrain },
  { from: 'Madurai', to: 'Nagercoil', code: 'MDU → NCJ', source: 'MDU', destination: 'NCJ', time: '4h 35m', demand: 'Coastal link', price: 'from ₹260', seats: 'AVL 42', image: trainThree }
];

export default function PopularRoutes() {
  return (
    <HomeSection id="popular-routes" eyebrow="Popular routes" title="Compare high-traffic corridors quickly." copy="Choose a route card to open train results with a default class and quota.">
      <div className="sr-route-grid">
        {routes.map((route) => <RouteCard key={route.code} route={route} />)}
      </div>
    </HomeSection>
  );
}

function RouteCard({ route }) {
  const search = toSearchParams({
    source: route.source,
    destination: route.destination,
    journeyDate: getToday(),
    travelClass: '3A',
    quota: 'GENERAL'
  });

  return (
    <Paper className="sr-route-card" elevation={0}>
        <Box component="img" src={route.image} alt={`${route.from} to ${route.to} SouthRail route train`} loading="lazy" />
        <Stack className="sr-route-card-content" spacing={1}>
          <Typography variant="overline">{route.code}</Typography>
          <Typography variant="h5">{route.from} <ArrowForwardIcon fontSize="inherit" /> {route.to}</Typography>
          <div className="sr-route-line"><strong>{route.source}</strong><i /><strong>{route.destination}</strong></div>
          <div className="sr-route-meta">
            <Chip label={route.time} variant="outlined" />
            <Chip label={route.seats} variant="outlined" />
            <Chip className="sr-price-badge" label={route.price} />
          </div>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', fontWeight: 800 }}>{route.demand}</Typography>
          <Button size="small" variant="contained" startIcon={<SearchIcon />} href={`/trains/search?${search}`}>Search trains</Button>
        </Stack>
    </Paper>
  );
}
