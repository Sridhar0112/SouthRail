import { useNavigate } from 'react-router-dom';
import HomeHero from './components/HomeHero.jsx';
import PopularRoutes from './components/PopularRoutes.jsx';
import AvailabilityPreview from './components/AvailabilityPreview.jsx';
import QuickActions from './components/QuickActions.jsx';
import { HomeFooter, OffersSection, TravelServices } from './components/HomeMarketingSections.jsx';
import { useTrainSearchForm } from './hooks/useTrainSearchForm.js';
import { toSearchParams } from './searchUtils.js';
import './styles/home-page.css';

export default function HomePage() {
  const navigate = useNavigate();
  const searchProps = useTrainSearchForm({
    onSearchComplete: (search) => navigate(`/trains/search?${toSearchParams(search)}`)
  });

  return (
    <main className="sr-home-page">
      <HomeHero searchProps={searchProps} />
      <PopularRoutes />
      <OffersSection />
      <TravelServices />
      <QuickActions variant="section" />
      <AvailabilityPreview />
      <HomeFooter />
    </main>
  );
}
