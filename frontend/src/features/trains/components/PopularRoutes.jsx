import { Box, Button, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import trainTwo from '../../../assets/southrail/train-2.png';
import trainThree from '../../../assets/southrail/train-3.png';
import heroTrain from '../../../assets/southrail/hero-train.png';

const routes = [
  { from: 'Chennai', to: 'Madurai', code: 'MS → MDU', time: '7h 45m', demand: 'High demand', image: trainTwo },
  { from: 'Chennai', to: 'Coimbatore', code: 'MAS → CBE', time: '6h 50m', demand: 'Frequent service', image: heroTrain },
  { from: 'Madurai', to: 'Nagercoil', code: 'MDU → NCJ', time: '4h 35m', demand: 'Coastal link', image: trainThree },
  { from: 'Trichy', to: 'Salem', code: 'TPJ → SA', time: '3h 55m', demand: 'Business route', image: trainTwo }
];

export default function PopularRoutes() {
  return (
    <section className="sr-home-section" aria-labelledby="popular-routes-title">
      <Container maxWidth="xl">
        <SectionHeader eyebrow="Popular South Indian routes" title="Start with the corridors passengers search most." copy="Route cards keep railway context visible while giving returning passengers fast starting points for planning." />
        <Grid container spacing={1.5}>
          {routes.map((route) => <RouteCard key={route.code} route={route} />)}
        </Grid>
      </Container>
    </section>
  );
}

function RouteCard({ route }) {
  return (
    <Grid item xs={12} sm={6} lg={3}>
      <Paper className="sr-route-card" elevation={0}>
        <Box component="img" src={route.image} alt={`${route.from} to ${route.to} SouthRail route train`} />
        <Stack className="sr-route-card-content" spacing={1}>
          <Typography variant="overline">{route.code}</Typography>
          <Typography variant="h5">{route.from} <ArrowForwardIcon fontSize="inherit" /> {route.to}</Typography>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <span>{route.time}</span><span>{route.demand}</span>
          </Stack>
          <Button size="small" variant="contained">Check route</Button>
        </Stack>
      </Paper>
    </Grid>
  );
}

function SectionHeader({ eyebrow, title, copy }) {
  return <Stack className="sr-section-heading" spacing={0.75}><Typography variant="overline">{eyebrow}</Typography><Typography id="popular-routes-title" variant="h2">{title}</Typography><Typography color="text.secondary">{copy}</Typography></Stack>;
}
