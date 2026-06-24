import { Stack } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';

export default function AlertStrip() {
  return (
    <Stack component="aside" direction="row" spacing={0.75} flexWrap="wrap" useFlexGap className="sr-alert-strip" aria-label="Rail alerts and booking reminders">
      <CampaignIcon fontSize="small" aria-hidden="true" />
      <strong>Booking desk</strong>
      <span>Use station codes for fastest search</span>
      <span>Check PNR after ticket confirmation</span>
      <span>Support handles refund and ticket issues</span>
    </Stack>
  );
}
