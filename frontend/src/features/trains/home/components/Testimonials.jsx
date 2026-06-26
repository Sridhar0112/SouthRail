import { Avatar, Paper, Stack, Typography } from '@mui/material';
import HomeSection from './HomeSection.jsx';

const testimonials = [
  { name: 'Priya S.', route: 'Chennai → Madurai', text: 'The route cards and PNR tools make it easy to plan family travel without jumping between pages.' },
  { name: 'Arun K.', route: 'Coimbatore commuter', text: 'Recent searches, station codes, and dashboard history save time when booking repeat journeys.' },
  { name: 'Meera R.', route: 'Nagercoil link', text: 'Support and ticket downloads are exactly where I expect them after booking.' }
];

export default function Testimonials() {
  return (
    <HomeSection id="testimonials" className="sr-home-section--tinted" eyebrow="Passenger feedback" title="Designed around real railway decisions.">
      <div className="sr-testimonial-grid">
        {testimonials.map((item) => (
          <Paper key={item.name} className="sr-testimonial-card" elevation={0}>
            <Stack spacing={2}>
              <Typography className="sr-rating" aria-label="5 star rating">★★★★★</Typography>
              <Typography color="text.secondary">“{item.text}”</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 900 }}>{item.name[0]}</Avatar>
                <div>
                  <Typography variant="h6">{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{item.route}</Typography>
                </div>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </div>
    </HomeSection>
  );
}
