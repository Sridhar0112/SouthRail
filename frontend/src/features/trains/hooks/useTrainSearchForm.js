import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../../services/api.js';
import { getApiErrorMessage } from '../../../utils/apiErrors.js';
import { rememberSearch, searchTrains } from '../trainSlice.js';
import { cleanSearch, getInitialSearchValues, getToday, normalizeSearch, normalizeStationQuery, readRecentSearches, saveRecentSearch, stationFromCode, validateSearch } from '../searchUtils.js';

export function useTrainSearchForm({ onSearchComplete } = {}) {
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

  const loadStationOptions = useCallback(async (query, setOptions, setLoading, setFieldError) => {
    const searchQuery = normalizeStationQuery(query);
    if (searchQuery.length < 2) { setOptions([]); setFieldError(''); return; }
    setLoading(true); setFieldError('');
    try { const { data } = await api.get(`/trains/stations?q=${encodeURIComponent(searchQuery)}&page=0&size=8`); setOptions(Array.isArray(data) ? data : data?.content || []); }
    catch (apiError) { setOptions([]); setFieldError(getApiErrorMessage(apiError, 'Unable to load station suggestions.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const query = normalizeStationQuery(sourceInput); if (!query || query === lastSourceQuery.current) return undefined; const timer = window.setTimeout(() => { lastSourceQuery.current = query; loadStationOptions(query, setSourceOptions, setSourceLoading, setSourceError); }, 300); return () => window.clearTimeout(timer); }, [sourceInput, loadStationOptions]);
  useEffect(() => { const query = normalizeStationQuery(destinationInput); if (!query || query === lastDestinationQuery.current) return undefined; const timer = window.setTimeout(() => { lastDestinationQuery.current = query; loadStationOptions(query, setDestinationOptions, setDestinationLoading, setDestinationError); }, 300); return () => window.clearTimeout(timer); }, [destinationInput, loadStationOptions]);

  const onSubmit = async (values) => {
    const cleaned = cleanSearch(values); clearErrors(); setSearchIssue(null);
    const issue = validateSearch(cleaned, today);
    if (issue) { if (issue.field) setError(issue.field, { type: 'manual', message: issue.message }); setSearchIssue(issue); return; }
    const normalized = normalizeSearch(cleaned, today);
    Object.entries(normalized).forEach(([field, value]) => setValue(field, value, { shouldValidate: true }));
    setRecentSearches(saveRecentSearch(normalized, today));
    dispatch(rememberSearch(normalized));
    await dispatch(searchTrains(normalized));
    onSearchComplete?.(normalized);
  };
  const onInvalid = () => setSearchIssue({ title: 'Search could not be completed', message: 'Please check source, destination, date, and class.', actionLabel: null });
  const useToday = () => { setValue('journeyDate', today, { shouldValidate: true }); clearErrors('journeyDate'); setSearchIssue(null); };
  const swap = () => { const source = watch('source'); const destination = watch('destination'); setValue('source', destination, { shouldValidate: true }); setValue('destination', source, { shouldValidate: true }); setSelectedSource(selectedDestination); setSelectedDestination(selectedSource); setSourceInput(destination || ''); setDestinationInput(source || ''); lastSourceQuery.current = destination || ''; lastDestinationQuery.current = source || ''; };
  const setStation = useCallback((field, option) => { const code = option?.code || ''; setValue(field, code, { shouldValidate: true }); clearErrors(field); }, [clearErrors, setValue]);
  const applyRecentSearch = (search) => { const normalized = normalizeSearch(search, today); Object.entries(normalized).forEach(([field, value]) => setValue(field, value, { shouldValidate: true })); setSelectedSource(stationFromCode(normalized.source)); setSelectedDestination(stationFromCode(normalized.destination)); setSourceInput(normalized.source); setDestinationInput(normalized.destination); setSourceOptions([]); setDestinationOptions([]); lastSourceQuery.current = normalized.source; lastDestinationQuery.current = normalized.destination; clearErrors(); setSearchIssue(search.journeyDate && search.journeyDate < today ? { title: 'Recent search updated', message: "That recent search used an old journey date, so today's date was selected.", actionLabel: null } : null); };

  return { today, register, handleSubmit, onSubmit, onInvalid, errors, trains, searchIssue, useToday, selectedSource, selectedDestination, sourceInput, destinationInput, sourceOptions, destinationOptions, sourceLoading, destinationLoading, sourceError, destinationError, recentSearches, applyRecentSearch, swap, onSourceInput: (value) => { setSourceInput(value); setSelectedSource(null); setValue('source', '', { shouldValidate: true }); if (!value.trim()) { setSourceOptions([]); setSourceError(''); lastSourceQuery.current = ''; } }, onSourceClear: () => { setSourceInput(''); setSelectedSource(null); setSourceOptions([]); lastSourceQuery.current = ''; setValue('source', '', { shouldValidate: true }); }, onSourceChange: (option) => { setSelectedSource(option); setStation('source', option); }, onDestinationInput: (value) => { setDestinationInput(value); setSelectedDestination(null); setValue('destination', '', { shouldValidate: true }); if (!value.trim()) { setDestinationOptions([]); setDestinationError(''); lastDestinationQuery.current = ''; } }, onDestinationClear: () => { setDestinationInput(''); setSelectedDestination(null); setDestinationOptions([]); lastDestinationQuery.current = ''; setValue('destination', '', { shouldValidate: true }); }, onDestinationChange: (option) => { setSelectedDestination(option); setStation('destination', option); } };
}
