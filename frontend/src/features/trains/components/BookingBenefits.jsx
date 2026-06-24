import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import trainThree from '../../../assets/southrail/train-3.png';

const benefits = [
  ['Availability before commitment', 'Seat signals, class selection, fare, and timings are evaluated before the passenger enters checkout.'],
  ['Reservation continuity', 'Search context carries into booking so the user never loses source, destination, date, class, or quota.'],
  ['Enterprise trust cues', 'Clear status language, restrained colors, and operational panels match SouthRail dashboards and ticket flows.']
];

export default function BookingBenefits() {
  return (
    <section className="sr-home-section sr-benefits-section" aria-labelledby="benefits-title">
      <Container maxWidth="xl">
        <Paper className="sr-benefit-panel" elevation={0}>
          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
            <Grid item xs={12} md={5}>
              <Box className="sr-benefit-image"><Box component="img" src={trainThree} alt="Premium SouthRail booking trust train visual" /></Box>
            </Grid>
            <Grid item xs={12} md={7}>
              <Stack spacing={1.5}>
                <Typography variant="overline">Why book with SouthRail</Typography>
                <Typography id="benefits-title" variant="h2">Designed around reservation confidence, not marketing noise.</Typography>
                <Typography color="text.secondary">The homepage uses the same operational hierarchy as booking, PNR, support, and dashboard screens: card surfaces, compact decisions, and clear next actions.</Typography>
                <Grid container spacing={1.25}>
                  {benefits.map(([title, copy], index) => (
                    <Grid item xs={12} key={title}>
                      <Paper className="sr-benefit-row" variant="outlined">
                        <b>{String(index + 1).padStart(2, '0')}</b>
                        <div><Typography variant="h6">{title}</Typography><Typography color="text.secondary">{copy}</Typography></div>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </section>
  );
}
