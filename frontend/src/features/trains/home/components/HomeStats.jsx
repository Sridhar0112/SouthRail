import { Paper, Stack, Typography } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import GroupsIcon from '@mui/icons-material/Groups';
import RouteIcon from '@mui/icons-material/Route';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import HomeSection from './HomeSection.jsx';

const stats = [
  { value: '2.4M+', label: 'journeys searched', copy: 'Fast route discovery across major South Indian corridors.', icon: <RouteIcon /> },
  { value: '98%', label: 'ticket visibility', copy: 'PNR, coach, passenger, and fare status in one place.', icon: <ConfirmationNumberIcon /> },
  { value: '24/7', label: 'support desk', copy: 'Dedicated booking and refund assistance whenever trips change.', icon: <SupportAgentIcon /> },
  { value: '180K+', label: 'monthly travellers', copy: 'Designed for families, commuters, and business passengers.', icon: <GroupsIcon /> }
];

export default function HomeStats() {
  return (
    <HomeSection id="southrail-stats" eyebrow="Live railway desk" title="Built for high-volume train booking workflows." copy="Search, compare, book, and manage train journeys with the information density passengers expect from modern travel platforms.">
      <div className="sr-stat-grid">
        {stats.map((stat) => (
          <Paper key={stat.label} className="sr-stat-card" elevation={0}>
            <Stack spacing={1.5}>
              <span className="sr-card-icon">{stat.icon}</span>
              <Typography className="sr-stat-value">{stat.value}</Typography>
              <Typography variant="h6">{stat.label}</Typography>
              <Typography color="text.secondary">{stat.copy}</Typography>
            </Stack>
          </Paper>
        ))}
      </div>
    </HomeSection>
  );
}
