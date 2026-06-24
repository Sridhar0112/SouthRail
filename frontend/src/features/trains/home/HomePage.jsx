import { useNavigate } from 'react-router-dom';
import HeroViewport from './components/HeroViewport.jsx';
import PopularRoutes from './components/PopularRoutes.jsx';
import { HomeFooter, OffersSection, TravelServices } from './components/HomeMarketingSections.jsx';
import { useTrainSearchForm } from '../search/hooks/useTrainSearchForm.js';
import { toSearchParams } from '../searchUtils.js';
import './home.css';

export default function HomePage() {
  const navigate = useNavigate();
  const searchProps = useTrainSearchForm({
    onSearchComplete: (search) => navigate(`/trains/search?${toSearchParams(search)}`)
  });

  return (
    <main className="sr-home-page">
      <HeroViewport searchProps={searchProps} />
      <PopularRoutes />
      <OffersSection />
      <TravelServices />
      <HomeFooter />
    </main>
  );
}
