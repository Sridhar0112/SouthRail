import { useNavigate } from 'react-router-dom';
import BookingProcess from './components/BookingProcess.jsx';
import HeroViewport from './components/HeroViewport.jsx';
import HomeActions from './components/HomeActions.jsx';
import PopularRoutes from './components/PopularRoutes.jsx';
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
      <BookingProcess />
      <HomeActions />
    </main>
  );
}
