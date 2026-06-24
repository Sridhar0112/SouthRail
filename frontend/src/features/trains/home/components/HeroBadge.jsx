import { Chip } from '@mui/material';
import TrainIcon from '@mui/icons-material/Train';

export default function HeroBadge() {
  return <Chip className="sr-rail-chip" icon={<TrainIcon />} label="SouthRail booking desk" color="primary" />;
}
