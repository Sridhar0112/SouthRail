import { Paper, Stack, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import TuneIcon from '@mui/icons-material/Tune';
import HomeSection from './HomeSection.jsx';

const features = [
  { title: 'Smart route search', copy: 'Station autocomplete, station-code support, class, quota, and recent search shortcuts.', icon: <SpeedIcon /> },
  { title: 'Transparent fares', copy: 'Clear price cues, passenger details, and ticket review before confirmation.', icon: <AccountBalanceWalletIcon /> },
  { title: 'Seat-aware booking', copy: 'Coach and berth management flows are connected from booking to ticket download.', icon: <AirlineSeatReclineNormalIcon /> },
  { title: 'Real-time journey tools', copy: 'PNR lookup, notifications, dashboard history, and cancellation actions.', icon: <NotificationsActiveIcon /> },
  { title: 'Unified support', copy: 'Raise ticket, booking, account, and refund issues without leaving the product.', icon: <TuneIcon /> },
  { title: 'Secure passenger area', copy: 'Protected dashboard, profile, ticket, and admin experiences with consistent UI.', icon: <SecurityIcon /> }
];

export default function HomeFeatures() {
  return (
    <HomeSection id="features" className="sr-home-section--tinted" eyebrow="Platform features" title="Everything after train search stays connected." copy="SouthRail now uses a more consistent card, button, input, and spacing language across discovery and post-booking tasks.">
      <div className="sr-feature-grid">
        {features.map((feature) => (
          <Paper key={feature.title} className="sr-info-card" elevation={0}>
            <Stack spacing={1.5}>
              <span className="sr-card-icon">{feature.icon}</span>
              <Typography variant="h5">{feature.title}</Typography>
              <Typography color="text.secondary">{feature.copy}</Typography>
            </Stack>
          </Paper>
        ))}
      </div>
    </HomeSection>
  );
}
