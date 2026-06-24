import { Link } from 'react-router-dom';
import { Button, Grid, Paper, Stack, Typography } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HomeSection from './HomeSection.jsx';

const actions = [
  { title: 'PNR status', copy: 'Track confirmation, coach, berth, and ticket status.', to: '/pnr', icon: <ConfirmationNumberIcon /> },
  { title: 'My tickets', copy: 'Open upcoming trips, download tickets, and review fares.', to: '/my-tickets', icon: <ReceiptLongIcon /> },
  { title: 'Dashboard', copy: 'Manage bookings, cancellations, refunds, and notifications.', to: '/dashboard', icon: <DashboardIcon /> },
  { title: 'Support', copy: 'Raise booking, refund, account, or ticket issues.', to: '/support', icon: <HelpOutlineIcon /> }
];

export default function HomeActions() {
  return (
    <HomeSection id="manage-journey" eyebrow="Manage journey" title="Ticket tools passengers need after search.">
      <Grid container spacing={1.5} alignItems="stretch">
        {actions.map((action) => (
          <Grid key={action.title} item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
            <Paper className="sr-info-card sr-action-card" elevation={0}>
              <span>{action.icon}</span>
              <Typography variant="h6">{action.title}</Typography>
              <Typography color="text.secondary">{action.copy}</Typography>
              <Button component={Link} to={action.to} variant="outlined" size="small" sx={{ mt: 'auto', alignSelf: 'flex-start' }}>
                Open
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </HomeSection>
  );
}
