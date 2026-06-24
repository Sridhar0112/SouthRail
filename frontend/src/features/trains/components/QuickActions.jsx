import { Link } from 'react-router-dom';
import { Button, Container, Grid, Paper, Stack, Typography } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TrainIcon from '@mui/icons-material/Train';

const actions = [
  { title: 'PNR status', copy: 'Track confirmation, coach, berth, and cancellation status.', to: '/pnr', icon: <ConfirmationNumberIcon /> },
  { title: 'My tickets', copy: 'Review booked journeys and download tickets.', to: '/my-tickets', icon: <TrainIcon /> },
  { title: 'Support', copy: 'Raise or continue a booking support conversation.', to: '/support', icon: <SupportAgentIcon /> },
  { title: 'Dashboard', copy: 'Open your passenger command center.', to: '/dashboard', icon: <DashboardIcon /> }
];

export default function QuickActions() {
  return (
    <section className="sr-home-section sr-quick-section" aria-labelledby="quick-actions-title">
      <Container maxWidth="xl">
        <Stack className="sr-section-heading" spacing={0.75}>
          <Typography variant="overline">Quick actions</Typography>
          <Typography id="quick-actions-title" variant="h2">Continue the journey from one operational hub.</Typography>
        </Stack>
        <Grid container spacing={1.25}>
          {actions.map((action) => (
            <Grid item xs={12} sm={6} lg={3} key={action.title}>
              <Paper className="sr-quick-card" elevation={0}>
                <span>{action.icon}</span>
                <Typography variant="h6">{action.title}</Typography>
                <Typography color="text.secondary">{action.copy}</Typography>
                <Button component={Link} to={action.to} variant="text">Open</Button>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </section>
  );
}
