import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateFeedback.jsx';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { rememberSearch, searchTrains } from './trainSlice.js';
import { getLocalDateString } from '../../utils/date.js';

const classes = ['1A', '2A', '3A', 'SL', 'CC', '2S'];
const quotas = ['GENERAL', 'TATKAL', 'LADIES', 'SENIOR_CITIZEN', 'PREMIUM_TATKAL'];
const recentSearchKey = 'southrail_recent_searches';

export default function HomePage() {
  const today = useMemo(() => getToday(), []);
  const defaultValues = useMemo(() => getInitialSearchValues(today), [today]);
  const form = useForm({ defaultValues });
  const { register, handleSubmit, setError, clearErrors, setValue, watch, formState: { errors } } = form;
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
  const compactSearch = hasSearchAttempt;

  const loadStationOptions = useCallback(async (query, setOptions, setLoading, setFieldError) => {
    const searchQuery = normalizeStationQuery(query);
    if (searchQuery.length < 2) {
      setOptions([]);
      setFieldError('');
      return;
    }

    setLoading(true);
    setFieldError('');
    try {
      const { data } = await api.get(`/trains/stations?q=${encodeURIComponent(searchQuery)}&page=0&size=8`);
      setOptions(Array.isArray(data) ? data : data?.content || []);
    } catch (apiError) {
      setOptions([]);
      setFieldError(getApiErrorMessage(apiError, 'Unable to load station suggestions.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const query = normalizeStationQuery(sourceInput);
    if (!query || query === lastSourceQuery.current) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      lastSourceQuery.current = query;
      loadStationOptions(query, setSourceOptions, setSourceLoading, setSourceError);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [sourceInput, loadStationOptions]);

  useEffect(() => {
    const query = normalizeStationQuery(destinationInput);
    if (!query || query === lastDestinationQuery.current) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      lastDestinationQuery.current = query;
      loadStationOptions(query, setDestinationOptions, setDestinationLoading, setDestinationError);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [destinationInput, loadStationOptions]);

  const onSubmit = (values) => {
    const cleaned = cleanSearch(values);
    clearErrors();
    setSearchIssue(null);

    const issue = validateSearch(cleaned, today);
    if (issue) {
      if (issue.field) {
        setError(issue.field, { type: 'manual', message: issue.message });
      }
      setSearchIssue(issue);
      return;
    }

    const normalized = normalizeSearch(cleaned, today);
    Object.entries(normalized).forEach(([field, value]) => setValue(field, value, { shouldValidate: true }));
    const nextRecent = saveRecentSearch(normalized, today);
    setRecentSearches(nextRecent);
    dispatch(rememberSearch(normalized));
    dispatch(searchTrains(normalized));
  };

  const onInvalid = () => {
    setSearchIssue({
      title: 'Search could not be completed',
      message: 'Please check source, destination, date, and class.',
      actionLabel: null
    });
  };

  const useToday = () => {
    setValue('journeyDate', today, { shouldValidate: true });
    clearErrors('journeyDate');
    setSearchIssue(null);
  };

  const swap = () => {
    const source = watch('source');
    const destination = watch('destination');
    setValue('source', destination, { shouldValidate: true });
    setValue('destination', source, { shouldValidate: true });
    setSelectedSource(selectedDestination);
    setSelectedDestination(selectedSource);
    setSourceInput(destination || '');
    setDestinationInput(source || '');
    lastSourceQuery.current = destination || '';
    lastDestinationQuery.current = source || '';
  };

  const setStation = useCallback((field, option) => {
    const code = option?.code || '';
    setValue(field, code, { shouldValidate: true });
    clearErrors(field);
  }, [clearErrors, setValue]);

  const applyRecentSearch = (search) => {
    const normalized = normalizeSearch(search, today);
    Object.entries(normalized).forEach(([field, value]) => setValue(field, value, { shouldValidate: true }));
    setSelectedSource(stationFromCode(normalized.source));
    setSelectedDestination(stationFromCode(normalized.destination));
    setSourceInput(normalized.source);
    setDestinationInput(normalized.destination);
    setSourceOptions([]);
    setDestinationOptions([]);
    lastSourceQuery.current = normalized.source;
    lastDestinationQuery.current = normalized.destination;
    clearErrors();
    if (search.journeyDate && search.journeyDate < today) {
      setSearchIssue({
        title: 'Recent search updated',
        message: "That recent search used an old journey date, so today's date was selected.",
        actionLabel: null
      });
    } else {
      setSearchIssue(null);
    }
  };

  return (
    <>
      <Box
        className="hero-rail"
        sx={{
          color: 'white',
          minHeight: compactSearch ? 'auto' : { xs: 'auto', md: 430 },
          py: compactSearch ? { xs: 3, md: 4 } : { xs: 4, sm: 5, md: 5 },
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={compactSearch ? 2 : 4} alignItems="center" sx={{ minWidth: 0 }}>
            {!compactSearch && (
              <Grid item xs={12} md={6}>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                  <Typography variant="h2" sx={{ fontSize: { xs: '1.7rem', sm: '2.25rem', md: 46 }, lineHeight: 1.05, mb: 2, overflowWrap: 'anywhere' }}>
                    South Indian railway booking, refined.
                  </Typography>
                  <Typography variant="h6" sx={{ maxWidth: 660, color: 'rgba(255,255,255,.84)', fontSize: { xs: '1rem', sm: '1.05rem' } }}>
                    Search trains, check availability, review fare, and book tickets across supported South Indian routes.
                  </Typography>
                </motion.div>
              </Grid>
            )}
            <Grid item xs={12} md={compactSearch ? 12 : 6}>
              <Paper
                className="glass-panel"
                elevation={0}
                sx={{
                  p: { xs: 2, sm: compactSearch ? 2 : 3 },
                  borderRadius: 1,
                  color: 'text.primary',
                  width: '100%',
                  maxWidth: '100%',
                  minWidth: 0
                }}
              >
                {compactSearch && (
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>
                    Search trains
                  </Typography>
                )}
                <Box component="form" onSubmit={handleSubmit(onSubmit, onInvalid)}>
                  <input type="hidden" {...register('source', { required: 'Source station is required' })} />
                  <input type="hidden" {...register('destination', { required: 'Destination station is required' })} />
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={12} md={compactSearch ? 3 : 5}>
                      <StationAutocomplete
                        label="From"
                        value={selectedSource}
                        inputValue={sourceInput}
                        options={sourceOptions}
                        loading={sourceLoading}
                        onInput={(value) => {
                          setSourceInput(value);
                          setSelectedSource(null);
                          setValue('source', '', { shouldValidate: true });
                          if (!value.trim()) {
                            setSourceOptions([]);
                            setSourceError('');
                            lastSourceQuery.current = '';
                          }
                        }}
                        onClear={() => {
                          setSourceInput('');
                          setSelectedSource(null);
                          setSourceOptions([]);
                          lastSourceQuery.current = '';
                          setValue('source', '', { shouldValidate: true });
                        }}
                        onChange={(option) => {
                          setSelectedSource(option);
                          setStation('source', option);
                        }}
                        error={!!errors.source}
                        helperText={errors.source?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={12} md={compactSearch ? 1 : 2} sx={{ display: 'grid', placeItems: 'center' }}>
                      <Button type="button" onClick={swap} aria-label="Swap stations"><SwapHorizIcon /></Button>
                    </Grid>
                    <Grid item xs={12} sm={12} md={compactSearch ? 3 : 5}>
                      <StationAutocomplete
                        label="To"
                        value={selectedDestination}
                        inputValue={destinationInput}
                        options={destinationOptions}
                        loading={destinationLoading}
                        onInput={(value) => {
                          setDestinationInput(value);
                          setSelectedDestination(null);
                          setValue('destination', '', { shouldValidate: true });
                          if (!value.trim()) {
                            setDestinationOptions([]);
                            setDestinationError('');
                            lastDestinationQuery.current = '';
                          }
                        }}
                        onClear={() => {
                          setDestinationInput('');
                          setSelectedDestination(null);
                          setDestinationOptions([]);
                          lastDestinationQuery.current = '';
                          setValue('destination', '', { shouldValidate: true });
                        }}
                        onChange={(option) => {
                          setSelectedDestination(option);
                          setStation('destination', option);
                        }}
                        error={!!errors.destination}
                        helperText={errors.destination?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={compactSearch ? 2 : 4}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Journey date"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: today }}
                        error={!!errors.journeyDate}
                        helperText={errors.journeyDate?.message}
                        {...register('journeyDate', {
                          required: 'Journey date is required',
                          validate: (value) => value >= today || 'Please select today or a future journey date.'
                        })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={compactSearch ? 2 : 4}>
                      <TextField select fullWidth label="Class" error={!!errors.travelClass} helperText={errors.travelClass?.message}
                        {...register('travelClass', { required: 'Travel class is required' })}>
                        {classes.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={6} md={compactSearch ? 2 : 4}>
                      <TextField select fullWidth label="Quota" error={!!errors.quota} helperText={errors.quota?.message}
                        {...register('quota', { required: 'Quota is required' })}>
                        {quotas.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <Button fullWidth type="submit" variant="contained" size="medium" startIcon={<SearchIcon />} disabled={trains.loading}>
                        {trains.loading ? 'Searching...' : 'Search trains'}
                      </Button>
                    </Grid>
                    {recentSearches.length > 0 && (
                      <Grid item xs={12}>
                        <RecentSearches searches={recentSearches} onSelect={applyRecentSearch} onClear={() => { localStorage.removeItem(recentSearchKey); setRecentSearches([]); }} />
                      </Grid>
                    )}
                    {(sourceError || destinationError) && (
                      <Grid item xs={12}>
                        <Alert severity="warning">{sourceError || destinationError}</Alert>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: compactSearch ? 3 : 4 }}>
        <Stack spacing={2.5}>
          {searchIssue && (
            <ErrorState
              title={searchIssue.title}
              message={searchIssue.message}
              actionLabel={searchIssue.actionLabel}
              onAction={searchIssue.actionLabel === "Use today's date" ? useToday : undefined}
            />
          )}

          {!searchIssue && trains.error && (
            <ErrorState title="Search could not be completed" message={trains.error} actionLabel="Retry" onAction={handleSubmit(onSubmit, onInvalid)} />
          )}

          {trains.loading && <LoadingState message="Searching trains..." />}

          {!trains.loading && !searchIssue && !trains.error && !trains.hasSearched && null}

          {!trains.loading && !searchIssue && !trains.error && trains.hasSearched && !hasResults && (
            <EmptyState
              title="No trains found"
              message="No trains are available for this route, date, and class. Try another class, date, or reverse route."
            />
          )}

          {!trains.loading && !searchIssue && !trains.error && hasResults && (
            <>
              <Box sx={{ px: { xs: 0.5, sm: 0 } }}>
                <Typography variant="h4" fontWeight={800}>Available trains</Typography>
                <Typography color="text.secondary">Choose a train based on fare, duration, and availability.</Typography>
              </Box>
              <RouteComparison results={sortedResults} />
              <Grid container spacing={2}>
                {sortedResults.map((train) => <TrainResultCard key={train.trainId} train={train} search={trains.selectedSearch} />)}
              </Grid>
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

function StationAutocomplete({ label, value, inputValue, options, loading, onInput, onClear, onChange, error, helperText }) {
  return (
    <Autocomplete
      value={value}
      inputValue={inputValue}
      options={options}
      loading={loading}
      filterOptions={(items) => items}
      getOptionLabel={(option) => option ? formatStationLabel(option) : ''}
      isOptionEqualToValue={(option, selected) => option?.code === selected?.code}
      onInputChange={(_, nextValue, reason) => {
        if (reason === 'input') {
          onInput(nextValue);
        }
        if (reason === 'clear') {
          onClear();
        }
        // MUI sends "reset" after option selection; searching here causes repeated station API calls.
      }}
      onChange={(_, option) => onChange(option)}
      renderInput={(params) => <TextField {...params} fullWidth label={label} error={error} helperText={helperText} />}
    />
  );
}

function RecentSearches({ searches, onSelect, onClear }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <Typography variant="body2" color="text.secondary">Recent searches</Typography>
      {searches.slice(0, 4).map((item) => (
        <Chip
          key={`${item.source}-${item.destination}-${item.journeyDate}-${item.travelClass}`}
          label={`${item.source} to ${item.destination} - ${item.journeyDate} - ${item.travelClass}`}
          onClick={() => onSelect(item)}
          variant="outlined"
        />
      ))}
      <Button type="button" size="small" onClick={onClear}>Clear</Button>
    </Stack>
  );
}

const TrainResultCard = memo(function TrainResultCard({ train, search }) {
  const availability = getAvailabilityStatus(train);
  const canBook = availability.canBook;
  const bookingParams = new URLSearchParams({
    sourceStationCode: train.sourceCode || search?.source || '',
    destinationStationCode: train.destinationCode || search?.destination || '',
    journeyDate: search?.journeyDate || getToday(),
    travelClass: search?.travelClass || '3A',
    quota: search?.quota || 'GENERAL'
  });

  return (
    <Grid item xs={12}>
      <Card
        variant="outlined"
        sx={{
          opacity: canBook ? 1 : 0.68,
          bgcolor: canBook ? 'background.paper' : 'action.disabledBackground',
          borderColor: canBook ? 'divider' : 'divider',
          transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
          '&:hover': canBook ? {
            borderColor: 'primary.main',
            boxShadow: 'var(--southrail-card-shadow)',
            transform: 'translateY(-1px)'
          } : {}
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="h6" fontWeight={800}>{train.trainName || 'Train'}</Typography>
              <Typography color="text.secondary">{train.trainNumber || '-'}</Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                <StationTime code={train.sourceCode} time={train.departureTime} label="Departure" />
                <Box sx={{ flex: 1, textAlign: 'center', px: 1 }}>
                  <Divider sx={{ borderColor: canBook ? 'primary.main' : 'divider', opacity: canBook ? 0.42 : 1 }} />
                  <Typography variant="caption" color="text.secondary">{formatDuration(train.durationMinutes)}</Typography>
                </Box>
                <StationTime code={train.destinationCode} time={train.arrivalTime} label="Arrival" align="right" />
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <Stack spacing={0.75} alignItems={{ xs: 'flex-start', md: 'center' }}>
                <Chip size="small" color={availability.color} label={availability.label} />
                <Typography variant="body2" color="text.secondary">{availability.detail}</Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <Typography color="text.secondary" variant="body2">Fare</Typography>
              <Typography fontWeight={800}>{formatFare(train.fare)}</Typography>
              <Typography color="text.secondary" variant="body2">{search?.travelClass || '3A'} / {search?.quota || 'GENERAL'}</Typography>
            </Grid>

            <Grid item xs={12} md={1.5}>
              <Tooltip title={canBook ? '' : 'Booking is unavailable for this train and class.'}>
                <span>
                  <Button
                    fullWidth
                    component={canBook ? Link : 'button'}
                    to={canBook ? `/booking/${train.trainId}?${bookingParams.toString()}` : undefined}
                    variant="contained"
                    disabled={!canBook}
                    type="button"
                  >
                    Book now
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
});

function StationTime({ code, time, label, align = 'left' }) {
  return (
    <Box sx={{ minWidth: { xs: 0, sm: 78 }, textAlign: { xs: 'center', sm: align }, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
      <Typography fontWeight={900}>{code || '-'}</Typography>
      <Typography fontWeight={800}>{formatTime(time)}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}

function RouteComparison({ results }) {
  const available = results.filter((item) => Number(item.availableSeats) > 0);
  const comparable = available.length > 0 ? available : results;
  const cheapest = comparable.filter((item) => item.fare != null).sort((a, b) => Number(a.fare) - Number(b.fare))[0];
  const fastest = comparable.filter((item) => item.durationMinutes != null).sort((a, b) => Number(a.durationMinutes) - Number(b.durationMinutes))[0];
  const bestAvailability = available.sort((a, b) => Number(b.availableSeats) - Number(a.availableSeats))[0];

  const metrics = [
    cheapest && { label: 'Cheapest', value: `${cheapest.trainNumber} - ${formatFare(cheapest.fare)}` },
    fastest && { label: 'Fastest', value: `${fastest.trainNumber} - ${formatDuration(fastest.durationMinutes)}` },
    bestAvailability && { label: 'Best availability', value: `${bestAvailability.trainNumber} - ${bestAvailability.availableSeats} seats` }
  ].filter(Boolean);

  if (metrics.length === 0) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1, sm: 1.25 },
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: 'var(--southrail-card-shadow)'
      }}
    >
      <Grid container spacing={1}>
        {metrics.map((item, index) => (
          <Grid item xs={12} sm={4} key={item.label}>
            <Box
              sx={{
                p: 1.25,
                borderRadius: 1,
                bgcolor: 'action.hover',
                borderRight: { sm: index < metrics.length - 1 ? 1 : 0 },
                borderColor: 'divider'
              }}
            >
              <Typography color="text.secondary" variant="body2">{item.label}</Typography>
              <Typography fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{item.value}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

function getToday() {
  return getLocalDateString();
}

function getInitialSearchValues(today) {
  const recent = readRecentSearches(today)[0];
  return recent || { source: '', destination: '', journeyDate: today, travelClass: '3A', quota: 'GENERAL' };
}

function stationFromCode(code) {
  return code ? { code, name: '' } : null;
}

function formatStationLabel(option) {
  if (!option) {
    return '';
  }
  return option.name ? `${option.code} - ${option.name}` : option.code;
}

function normalizeStationQuery(value) {
  const query = String(value || '').trim();
  const labelMatch = query.match(/^([A-Za-z0-9]+)\s+-\s+.+$/);
  return (labelMatch ? labelMatch[1] : query).toUpperCase();
}

function cleanSearch(values) {
  return {
    source: String(values.source || '').trim().toUpperCase(),
    destination: String(values.destination || '').trim().toUpperCase(),
    journeyDate: values.journeyDate || '',
    travelClass: values.travelClass || '3A',
    quota: values.quota || 'GENERAL'
  };
}

function normalizeSearch(values, today) {
  return {
    source: String(values.source || '').trim().toUpperCase(),
    destination: String(values.destination || '').trim().toUpperCase(),
    journeyDate: values.journeyDate && values.journeyDate >= today ? values.journeyDate : today,
    travelClass: values.travelClass || '3A',
    quota: values.quota || 'GENERAL'
  };
}

function validateSearch(values, today) {
  if (!values.source || !values.destination || !values.journeyDate || !values.travelClass || !values.quota) {
    return { title: 'Search could not be completed', message: 'Please check source, destination, date, and class.' };
  }
  if (values.source === values.destination) {
    return { title: 'Search could not be completed', message: 'Source and destination cannot be the same.', field: 'destination' };
  }
  if (values.journeyDate < today) {
    return {
      title: 'Search could not be completed',
      message: 'Please select today or a future journey date.',
      field: 'journeyDate',
      actionLabel: "Use today's date",
      fixDate: true
    };
  }
  return null;
}

function readRecentSearches(today) {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentSearchKey) || '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeSearch(item, today))
      .filter((item) => item.source && item.destination && item.source !== item.destination)
      .slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentSearch(search, today) {
  const current = readRecentSearches(today);
  const next = [search, ...current.filter((item) => (
    item.source !== search.source ||
    item.destination !== search.destination ||
    item.travelClass !== search.travelClass ||
    item.quota !== search.quota
  ))].slice(0, 5);
  localStorage.setItem(recentSearchKey, JSON.stringify(next));
  return next;
}

function sortResults(results) {
  return [...(results || [])].sort((a, b) => {
    const aSeats = Number(a.availableSeats || 0);
    const bSeats = Number(b.availableSeats || 0);
    if ((aSeats > 0) !== (bSeats > 0)) {
      return aSeats > 0 ? -1 : 1;
    }
    const timeCompare = minutesFromTime(a.departureTime) - minutesFromTime(b.departureTime);
    if (timeCompare !== 0) {
      return timeCompare;
    }
    return Number(a.durationMinutes || 0) - Number(b.durationMinutes || 0);
  });
}

function minutesFromTime(value) {
  const [hours = '0', minutes = '0'] = String(value || '00:00').split(':');
  return Number(hours) * 60 + Number(minutes);
}

function getAvailabilityStatus(train) {
  const seats = Number(train.availableSeats || 0);
  if (seats > 0) {
    return {
      canBook: true,
      color: seats < 10 ? 'warning' : 'success',
      label: seats < 10 ? 'Limited seats' : 'Available',
      detail: `${seats} seats available`
    };
  }
  const prediction = String(train.prediction || '').trim();
  const label = /class not available/i.test(prediction) ? 'Class not available' : 'Sold out';
  return {
    canBook: false,
    color: 'error',
    label,
    detail: prediction && prediction !== label ? prediction : 'Booking is unavailable for this class'
  };
}

function formatTime(value) {
  if (!value) {
    return '-';
  }
  const [hours = '00', minutes = '00'] = String(value).split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function formatDuration(minutes) {
  const total = Number(minutes || 0);
  const hours = Math.floor(total / 60);
  const remainingMinutes = total % 60;
  return `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`;
}

function formatFare(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '₹ -';
  }
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}
