import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DirectionsRailwayIcon from '@mui/icons-material/DirectionsRailway';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

const services = [
  { title: 'PNR status', to: '/pnr', icon: <ConfirmationNumberIcon /> },
  { title: 'My tickets', to: '/my-tickets', icon: <DirectionsRailwayIcon /> },
  { title: 'Offers', to: '#offers', icon: <LocalOfferIcon /> },
  { title: 'Support', to: '/support', icon: <CampaignIcon /> }
];

export default function QuickServices() {
  return <nav className="sr-quick-services" aria-label="Quick services">{services.map((service) => <Button key={service.title} component={Link} to={service.to} startIcon={service.icon} variant="contained">{service.title}</Button>)}</nav>;
}
