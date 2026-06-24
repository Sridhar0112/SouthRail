import { IconButton } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

export default function StationSwapButton({ onClick }) {
  return (
    <IconButton className="sr-swap-button" type="button" onClick={onClick} aria-label="Swap source and destination stations">
      <SwapHorizIcon />
    </IconButton>
  );
}
