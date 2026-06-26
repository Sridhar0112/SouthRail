import { Box, Paper, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import heroTrain from '../../../../assets/southrail/hero-train.png';
import HomeSection from './HomeSection.jsx';

const reasons = [
  'Consistent 1400px responsive layout across public and dashboard screens.',
  'Dense but readable booking cards inspired by leading travel products.',
  'Clear status, price, availability, and support cues for confident decisions.',
  'Mobile-first grids that avoid cropped content and horizontal overflow.'
];

export default function WhyChoose() {
  return (
    <HomeSection id="why-southrail" eyebrow="Why choose SouthRail" title="A railway-first experience instead of a generic form." copy="The homepage now gives passengers immediate search, route confidence, and post-booking reassurance.">
      <div className="sr-why-grid">
        <Stack spacing={2}>
          {reasons.map((reason) => (
            <Paper key={reason} className="sr-info-card" elevation={0}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <span className="sr-card-icon"><CheckCircleIcon /></span>
                <Typography variant="h6">{reason}</Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
        <Paper className="sr-why-visual" elevation={0}>
          <Stack spacing={1} sx={{ position: 'relative', zIndex: 1, maxWidth: 360 }}>
            <Typography variant="overline" color="secondary.light">Journey confidence</Typography>
            <Typography variant="h3" color="inherit">Search, compare, book, and resolve issues from one railway desk.</Typography>
          </Stack>
          <Box component="img" src={heroTrain} alt="SouthRail modern train illustration" className="sr-train-illustration" loading="lazy" />
        </Paper>
      </div>
    </HomeSection>
  );
}
