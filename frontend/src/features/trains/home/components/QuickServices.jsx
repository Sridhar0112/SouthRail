import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DirectionsRailwayIcon from '@mui/icons-material/DirectionsRailway';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

const services = [
  { title: 'PNR status', to: '/pnr', icon: <ConfirmationNumberIcon /> },
  { title: 'My tickets', to: '/my-tickets', icon: <ReceiptLongIcon /> },
  { title: 'Dashboard', to: '/dashboard', icon: <DirectionsRailwayIcon /> },
  { title: 'Support', to: '/support', icon: <HelpOutlineIcon /> }
];

export default function QuickServices() {
  return <nav className="sr-quick-services" aria-label="Quick services">{services.map((service) => <Button key={service.title} component={Link} to={service.to} startIcon={service.icon} variant="contained">{service.title}</Button>)}</nav>;
}
