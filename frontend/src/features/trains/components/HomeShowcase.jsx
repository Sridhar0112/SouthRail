import { Box, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material';
import ExploreIcon from '@mui/icons-material/Explore';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShieldIcon from '@mui/icons-material/Shield';
import trainAccentOne from '../../../assets/southrail/train-2.png';
import trainAccentTwo from '../../../assets/southrail/train-3.png';
import trainAccentThree from '../../../assets/southrail/hero-train.png';

const cards = [
  { icon: <ExploreIcon />, title: 'Scenic Southern Corridors', text: 'Coastal, temple-town, hill-country, and metro connections styled for fast decisions.', image: trainAccentOne },
  { icon: <AccessTimeIcon />, title: 'Smart Trip Intelligence', text: 'Compare timing, duration, fare, and seat signals before you choose a train.', image: trainAccentThree },
  { icon: <ShieldIcon />, title: 'Premium Secure Flow', text: 'A crisp booking path with focused route context and confidence-building states.', image: trainAccentTwo }
];

export default function HomeShowcase() {
  return <Container maxWidth="xl" className="sr-showcase"><Grid container spacing={2}>{cards.map((card) => <ShowcaseCard key={card.title} {...card} />)}</Grid></Container>;
}

function ShowcaseCard({ icon, title, text, image }) {
  return (
    <Grid item xs={12} md={4}>
      <Card className="sr-showcase-card">
        <Box component="img" src={image} alt="" aria-hidden="true" />
        <Box className="sr-showcase-overlay" />
        <CardContent>
          <Stack direction="row" spacing={1.35} alignItems="center">
            <Box className="sr-feature-icon">{icon}</Box>
            <Box>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="body2">{text}</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}
