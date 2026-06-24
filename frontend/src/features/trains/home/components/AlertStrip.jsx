import { Stack } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';

export default function AlertStrip() {
  return (
    <Stack component="aside" direction="row" spacing={0.75} flexWrap="wrap" useFlexGap className="sr-alert-strip" aria-label="Rail alerts and news">
      <CampaignIcon fontSize="small" aria-hidden="true" />
      <strong>Alerts</strong>
      <span>Premium Tatkal opens 10:00</span>
      <span>Festival demand high on MAS–MDU</span>
      <span>Use PNR for coach updates</span>
    </Stack>
  );
}
