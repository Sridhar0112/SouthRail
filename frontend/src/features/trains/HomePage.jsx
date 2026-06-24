import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import HomeHero from './components/HomeHero.jsx';
import PopularRoutes from './components/PopularRoutes.jsx';
import BookingBenefits from './components/BookingBenefits.jsx';
import AvailabilityPreview from './components/AvailabilityPreview.jsx';
import QuickActions from './components/QuickActions.jsx';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { rememberSearch, searchTrains } from './trainSlice.js';
import './styles/home-page.css';

const recentSearchKey = 'southrail_recent_searches';

export default function HomePage() {
  const today = useMemo(() => getToday(), []);
  const defaultValues = useMemo(() => getInitialSearchValues(today), [today]);
  const { register, handleSubmit, setError, clearErrors, setValue, watch, formState: { errors } } = useForm({ defaultValues });
  const dispatch = useDispatch();
  const trains = useSelector((state) => state.trains);
  const [selectedSource, setSelectedSource] = useState(() => stationFromCode(defaultValues.source));
  const [selectedDestination, setSelectedDestination] = useState(() => stationFromCode(defaultValues.destination));
  const [sourceInput, setSourceInput] = useState(defaultValues.source || '');
  const [destinationInput, setDestinationInput] = useState(defaultValues.destination || '');
  const [sourceOptions, setSourceOptions] = useState([]);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [destinationError, setDestinationError] = useState('');
  const [searchIssue, setSearchIssue] = useState(null);
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearches(today));
  const lastSourceQuery = useRef(sourceInput);
  const lastDestinationQuery = useRef(destinationInput);

  const sortedResults = useMemo(() => sortResults(trains.results), [trains.results]);
  const hasResults = sortedResults.length > 0;
  const hasSearchAttempt = trains.hasSearched || trains.loading || Boolean(searchIssue);

  const loadStationOptions = useCallback(async (query, setOptions, setLoading, setFieldError) => {
    const searchQuery = normalizeStationQuery(query);
    if (searchQuery.length < 2) { setOptions([]); setFieldError(''); return; }
    setLoading(true); setFieldError('');
    try {
      const { data } = await api.get(`/trains/stations?q=${encodeURIComponent(searchQuery)}&page=0&size=8`);
      setOptions(Array.isArray(data) ? data : data?.content || []);
    } catch (apiError) {
      setOptions([]); setFieldError(getApiErrorMessage(apiError, 'Unable to load station suggestions.'));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const query = normalizeStationQuery(sourceInput);
    if (!query || query === lastSourceQuery.current) return undefined;
    const timer = window.setTimeout(() => { lastSourceQuery.current = query; loadStationOptions(query, setSourceOptions, setSourceLoading, setSourceError); }, 300);
    return () => window.clearTimeout(timer);
  }, [sourceInput, loadStationOptions]);

  useEffect(() => {
    const query = normalizeStationQuery(destinationInput);
    if (!query || query === lastDestinationQuery.current) return undefined;
    const timer = window.setTimeout(() => { lastDestinationQuery.current = query; loadStationOptions(query, setDestinationOptions, setDestinationLoading, setDestinationError); }, 300);
    return () => window.clearTimeout(timer);
  }, [destinationInput, loadStationOptions]);

  const onSubmit = (values) => {
    const cleaned = cleanSearch(values); clearErrors(); setSearchIssue(null);
    const issue = validateSearch(cleaned, today);
    if (issue) { if (issue.field) setError(issue.field, { type: 'manual', message: issue.message }); setSearchIssue(issue); return; }
    const normalized = normalizeSearch(cleaned, today);
    Object.entries(normalized).forEach(([field, value]) => setValue(field, value, { shouldValidate: true }));
    const nextRecent = saveRecentSearch(normalized, today);
    setRecentSearches(nextRecent); dispatch(rememberSearch(normalized)); dispatch(searchTrains(normalized));
  };

  const onInvalid = () => setSearchIssue({ title: 'Search could not be completed', message: 'Please check source, destination, date, and class.', actionLabel: null });
  const useToday = () => { setValue('journeyDate', today, { shouldValidate: true }); clearErrors('journeyDate'); setSearchIssue(null); };
  const swap = () => {
    const source = watch('source'); const destination = watch('destination');
    setValue('source', destination, { shouldValidate: true }); setValue('destination', source, { shouldValidate: true });
    setSelectedSource(selectedDestination); setSelectedDestination(selectedSource); setSourceInput(destination || ''); setDestinationInput(source || '');
    lastSourceQuery.current = destination || ''; lastDestinationQuery.current = source || '';
  };
  const setStation = useCallback((field, option) => { const code = option?.code || ''; setValue(field, code, { shouldValidate: true }); clearErrors(field); }, [clearErrors, setValue]);
  const applyRecentSearch = (search) => {
    const normalized = normalizeSearch(search, today);
    Object.entries(normalized).forEach(([field, value]) => setValue(field, value, { shouldValidate: true }));
    setSelectedSource(stationFromCode(normalized.source)); setSelectedDestination(stationFromCode(normalized.destination));
    setSourceInput(normalized.source); setDestinationInput(normalized.destination); setSourceOptions([]); setDestinationOptions([]);
    lastSourceQuery.current = normalized.source; lastDestinationQuery.current = normalized.destination; clearErrors();
    setSearchIssue(search.journeyDate && search.journeyDate < today ? { title: 'Recent search updated', message: "That recent search used an old journey date, so today's date was selected.", actionLabel: null } : null);
  };

  const searchProps = { today, register, handleSubmit, onSubmit, onInvalid, errors, trains, selectedSource, selectedDestination, sourceInput, destinationInput, sourceOptions, destinationOptions, sourceLoading, destinationLoading, sourceError, destinationError, recentSearches, applyRecentSearch, swap, onSourceInput: (value) => { setSourceInput(value); setSelectedSource(null); setValue('source', '', { shouldValidate: true }); if (!value.trim()) { setSourceOptions([]); setSourceError(''); lastSourceQuery.current = ''; } }, onSourceClear: () => { setSourceInput(''); setSelectedSource(null); setSourceOptions([]); lastSourceQuery.current = ''; setValue('source', '', { shouldValidate: true }); }, onSourceChange: (option) => { setSelectedSource(option); setStation('source', option); }, onDestinationInput: (value) => { setDestinationInput(value); setSelectedDestination(null); setValue('destination', '', { shouldValidate: true }); if (!value.trim()) { setDestinationOptions([]); setDestinationError(''); lastDestinationQuery.current = ''; } }, onDestinationClear: () => { setDestinationInput(''); setSelectedDestination(null); setDestinationOptions([]); lastDestinationQuery.current = ''; setValue('destination', '', { shouldValidate: true }); }, onDestinationChange: (option) => { setSelectedDestination(option); setStation('destination', option); } };

  return (
    <main className="sr-home-page">
      <HomeHero searchProps={searchProps} hasSearchAttempt={hasSearchAttempt} />
      <PopularRoutes />
      <BookingBenefits />
      <AvailabilityPreview />
      {hasSearchAttempt && (
        <PremiumSearchResults
          searchIssue={searchIssue}
          trains={trains}
          sortedResults={sortedResults}
          hasResults={hasResults}
          onRetry={handleSubmit(onSubmit, onInvalid)}
          onUseToday={useToday}
          getAvailabilityStatus={getAvailabilityStatus}
          formatFare={formatFare}
          formatDuration={formatDuration}
          getToday={getToday}
        />
      )}
      <QuickActions />
    </main>
  );
}

function getToday() { return new Date().toISOString().slice(0, 10); }
function getInitialSearchValues(today) { const recent = readRecentSearches(today)[0]; return recent || { source: '', destination: '', journeyDate: today, travelClass: '3A', quota: 'GENERAL' }; }
function stationFromCode(code) { return code ? { code, name: '' } : null; }
function normalizeStationQuery(value) { const query = String(value || '').trim(); const labelMatch = query.match(/^([A-Za-z0-9]+)\s+-\s+.+$/); return (labelMatch ? labelMatch[1] : query).toUpperCase(); }
function cleanSearch(values) { return { source: String(values.source || '').trim().toUpperCase(), destination: String(values.destination || '').trim().toUpperCase(), journeyDate: values.journeyDate || '', travelClass: values.travelClass || '3A', quota: values.quota || 'GENERAL' }; }
function normalizeSearch(values, today) { return { source: String(values.source || '').trim().toUpperCase(), destination: String(values.destination || '').trim().toUpperCase(), journeyDate: values.journeyDate && values.journeyDate >= today ? values.journeyDate : today, travelClass: values.travelClass || '3A', quota: values.quota || 'GENERAL' }; }
function validateSearch(values, today) { if (!values.source || !values.destination || !values.journeyDate || !values.travelClass || !values.quota) return { title: 'Search could not be completed', message: 'Please check source, destination, date, and class.' }; if (values.source === values.destination) return { title: 'Search could not be completed', message: 'Source and destination cannot be the same.', field: 'destination' }; if (values.journeyDate < today) return { title: 'Search could not be completed', message: 'Please select today or a future journey date.', field: 'journeyDate', actionLabel: "Use today's date", fixDate: true }; return null; }
function readRecentSearches(today) { try { const parsed = JSON.parse(localStorage.getItem(recentSearchKey) || '[]'); if (!Array.isArray(parsed)) return []; return parsed.map((item) => normalizeSearch(item, today)).filter((item) => item.source && item.destination && item.source !== item.destination).slice(0, 5); } catch { return []; } }
function saveRecentSearch(search, today) { const current = readRecentSearches(today); const next = [search, ...current.filter((item) => item.source !== search.source || item.destination !== search.destination || item.travelClass !== search.travelClass || item.quota !== search.quota)].slice(0, 5); localStorage.setItem(recentSearchKey, JSON.stringify(next)); return next; }
function sortResults(results) { return [...(results || [])].sort((a, b) => { const aSeats = Number(a.availableSeats || 0); const bSeats = Number(b.availableSeats || 0); if ((aSeats > 0) !== (bSeats > 0)) return aSeats > 0 ? -1 : 1; const timeCompare = minutesFromTime(a.departureTime) - minutesFromTime(b.departureTime); if (timeCompare !== 0) return timeCompare; return Number(a.durationMinutes || 0) - Number(b.durationMinutes || 0); }); }
function minutesFromTime(value) { const [hours = '0', minutes = '0'] = String(value || '00:00').split(':'); return Number(hours) * 60 + Number(minutes); }
function getAvailabilityStatus(train) { const seats = Number(train.availableSeats || 0); if (seats > 0) return { canBook: true, color: seats < 10 ? 'warning' : 'success', label: seats < 10 ? 'Limited seats' : 'Available', detail: `${seats} seats available` }; const prediction = String(train.prediction || '').trim(); const label = /class not available/i.test(prediction) ? 'Class not available' : 'Sold out'; return { canBook: false, color: 'error', label, detail: prediction && prediction !== label ? prediction : 'Booking is unavailable for this class' }; }
function formatDuration(minutes) { const total = Number(minutes || 0); const hours = Math.floor(total / 60); const remainingMinutes = total % 60; return `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`; }
function formatFare(value) { const amount = Number(value); if (!Number.isFinite(amount)) return '₹ -'; return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`; }
function formatTime(value) { if (!value) return '--:--'; const [hours = '00', minutes = '00'] = String(value).split(':'); return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`; }


function PremiumSearchResults({ searchIssue, trains, sortedResults, hasResults, onRetry, onUseToday, getAvailabilityStatus, formatFare, formatDuration, getToday }) {
  return (
    <section className="sr-home-section sr-search-results-section" id="results">
      <div className="sr-results-bridge">
        {searchIssue && <ResultMessage title={searchIssue.title} message={searchIssue.message} actionLabel={searchIssue.actionLabel} onAction={searchIssue.actionLabel === "Use today's date" ? onUseToday : undefined} />}
        {!searchIssue && trains.error && <ResultMessage title="Search could not be completed" message={trains.error} actionLabel="Retry" onAction={onRetry} />}
        {trains.loading && <ResultMessage title="Searching trains..." message="Checking route inventory and class availability." />}
        {!trains.loading && !searchIssue && !trains.error && trains.hasSearched && !hasResults && <ResultMessage title="No trains found" message="No trains are available for this route, date, and class. Try another class, date, or reverse route." />}
        {!trains.loading && !searchIssue && !trains.error && hasResults && sortedResults.map((train) => <SearchResultRow key={train.trainId} train={train} search={trains.selectedSearch} getAvailabilityStatus={getAvailabilityStatus} formatFare={formatFare} formatDuration={formatDuration} getToday={getToday} />)}
      </div>
    </section>
  );
}

function ResultMessage({ title, message, actionLabel, onAction }) {
  return <div className="sr-result-message"><strong>{title}</strong><span>{message}</span>{actionLabel && <button type="button" onClick={onAction}>{actionLabel}</button>}</div>;
}

function SearchResultRow({ train, search, getAvailabilityStatus, formatFare, formatDuration, getToday }) {
  const availability = getAvailabilityStatus(train);
  const canBook = availability.canBook;
  const bookingParams = new URLSearchParams({ sourceStationCode: train.sourceCode || search?.source || '', destinationStationCode: train.destinationCode || search?.destination || '', journeyDate: search?.journeyDate || getToday(), travelClass: search?.travelClass || '3A', quota: search?.quota || 'GENERAL' });
  return <article className="sr-live-result-row"><div><strong>{train.trainName || 'Train'}</strong><span>{train.trainNumber || '-'} · {search?.travelClass || '3A'} · {search?.quota || 'GENERAL'}</span></div><div className="sr-live-result-route"><b>{formatTime(train.departureTime)}</b><span>{train.sourceCode || search?.source}</span><i /> <small>{formatDuration(train.durationMinutes)}</small><i /><b>{formatTime(train.arrivalTime)}</b><span>{train.destinationCode || search?.destination}</span></div><div><b className={canBook ? 'sr-status-good' : 'sr-status-stop'}>{availability.detail}</b><strong>{formatFare(train.fare)}</strong><a className={canBook ? '' : 'sr-disabled-booking'} href={canBook ? `/booking/${train.trainId}?${bookingParams.toString()}` : '#'} onClick={(event) => { if (!canBook) event.preventDefault(); }}>{canBook ? 'Reserve seat' : availability.label}</a></div></article>;
}
