import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Chip, Container, Grid, LinearProgress, MenuItem, Paper, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PrintIcon from '@mui/icons-material/Print';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../services/api.js';
import { EmptyState, ErrorState, LoadingState, SuccessState } from '../../components/StateFeedback.jsx';
import { getApiErrorMessage, isAuthError } from '../../utils/apiErrors.js';

const steps = ['Passenger details', 'Review booking', 'Confirmation'];
const travelClasses = ['1A', '2A', '3A', 'SL', 'CC', '2S'];
const quotas = ['GENERAL', 'TATKAL', 'LADIES', 'SENIOR_CITIZEN', 'PREMIUM_TATKAL'];
const berthOptions = ['LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER', 'NO_PREFERENCE'];

export default function BookingPage() {
  const { trainId } = useParams();
  const [searchParams] = useSearchParams();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [train, setTrain] = useState(null);
  const [trainError, setTrainError] = useState('');
  const [response, setResponse] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewedSignature, setReviewedSignature] = useState('');
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loadingTrain, setLoadingTrain] = useState(true);
  const [loadingReview, setLoadingReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      trainId,
      sourceStationCode: searchParams.get('sourceStationCode') || '',
      destinationStationCode: searchParams.get('destinationStationCode') || '',
      journeyDate: getSafeJourneyDate(searchParams.get('journeyDate'), today),
      travelClass: searchParams.get('travelClass') || '3A',
      quota: searchParams.get('quota') || 'GENERAL',
      passengers: [{ fullName: '', age: 30, gender: 'Male', berthPreference: 'LOWER' }]
    }
  });
  const { fields, append } = useFieldArray({ control: form.control, name: 'passengers' });
  const currentValues = form.watch();
  const currentSignature = useMemo(() => JSON.stringify(currentValues), [currentValues]);
  const reviewIsCurrent = review && reviewedSignature === currentSignature;
  const activeStep = response ? 2 : reviewIsCurrent || submitError ? 1 : 0;
  const passengerCount = currentValues.passengers?.length || 0;

  useEffect(() => {
    setLoadingTrain(true);
    api.get(`/trains/${trainId}`)
      .then(({ data }) => setTrain(data))
      .catch((apiError) => {
        console.error('Train detail load failed', apiError);
        setTrainError(getApiErrorMessage(apiError, 'Train details could not be loaded.'));
      })
      .finally(() => setLoadingTrain(false));
  }, [trainId]);

  const prepareReview = async (values) => {
    setError('');
    setSubmitError('');
    setResponse(null);
    setLoadingReview(true);
    try {
      const { data } = await api.post('/bookings/review', values);
      setReview(data);
      setReviewedSignature(JSON.stringify(values));
    } catch (apiError) {
      console.error('Booking review failed', apiError);
      setReview(null);
      setReviewedSignature('');
      setError(isAuthError(apiError)
        ? 'Please login again to continue booking.'
        : getApiErrorMessage(apiError, 'Review could not be prepared. Check train, route, date, and passenger details.'));
    } finally {
      setLoadingReview(false);
    }
  };

  const submit = async (values) => {
    setError('');
    setSubmitError('');
    if (!review || reviewedSignature !== JSON.stringify(values)) {
      setError('Please review the latest booking details before confirming.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/bookings', values);
      setResponse(data);
    } catch (apiError) {
      console.error('Booking confirmation failed', apiError);
      setSubmitError(isAuthError(apiError)
        ? 'Please login again to continue booking.'
        : getApiErrorMessage(apiError, 'Booking could not be completed. Please retry.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (response) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Stepper activeStep={2} sx={{ mb: 3 }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
        <BookingSuccess response={response} fallbackValues={currentValues} />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>Book ticket</Typography>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, overflowX: 'auto', pb: 1 }}>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Stack spacing={2}>
        {loadingTrain && <LoadingState message="Loading train details..." />}
        {trainError && <Alert severity="warning">{trainError}</Alert>}
        {train && <TrainSummary train={train} values={currentValues} />}
        {error && <ErrorState title="Booking review failed" message={error} />}
        {submitError && <BookingFailure message={submitError} retry={form.handleSubmit(submit)} />}
        {loadingReview && <LoadingState message="Preparing booking review..." />}
        {submitting && (
          <Paper sx={{ p: 2 }}>
            <Stack spacing={1}>
              <LinearProgress />
              <Typography fontWeight={800}>Processing your booking...</Typography>
              <Typography color="text.secondary">Please wait. Do not refresh or submit again.</Typography>
            </Stack>
          </Paper>
        )}

        <Paper sx={{ p: { xs: 2, md: 4 }, width: '100%', maxWidth: '100%', minWidth: 0 }}>
          <Box component="form" onSubmit={form.handleSubmit(submit)}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="From station code" disabled={submitting} error={!!form.formState.errors.sourceStationCode}
                  helperText={form.formState.errors.sourceStationCode?.message}
                  {...form.register('sourceStationCode', { required: 'Source station is required' })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="To station code" disabled={submitting} error={!!form.formState.errors.destinationStationCode}
                  helperText={form.formState.errors.destinationStationCode?.message}
                  {...form.register('destinationStationCode', {
                    required: 'Destination station is required',
                    validate: (value) => value.trim().toUpperCase() !== String(form.getValues('sourceStationCode') || '').trim().toUpperCase() || 'Source and destination cannot be the same.'
                  })} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="date" label="Date" disabled={submitting} InputLabelProps={{ shrink: true }}
                  inputProps={{ min: today }}
                  error={!!form.formState.errors.journeyDate} helperText={form.formState.errors.journeyDate?.message}
                  {...form.register('journeyDate', {
                    required: 'Journey date is required',
                    validate: (value) => value >= today || 'Please select today or a future journey date.'
                  })} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth label="Class" disabled={submitting} {...form.register('travelClass', { required: 'Travel class is required' })}>
                  {travelClasses.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select fullWidth label="Quota" disabled={submitting} {...form.register('quota', { required: 'Quota is required' })}>
                  {quotas.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" fontWeight={800}>Passenger details</Typography>
              </Grid>
              {fields.map((field, index) => (
                <Grid item xs={12} key={field.id}>
                  <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, width: '100%', maxWidth: '100%', minWidth: 0 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField fullWidth label="Passenger name" disabled={submitting}
                          error={!!form.formState.errors.passengers?.[index]?.fullName}
                          helperText={form.formState.errors.passengers?.[index]?.fullName?.message}
                          {...form.register(`passengers.${index}.fullName`, { required: 'Passenger name is required' })} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={2}>
                        <TextField fullWidth label="Age" type="number" disabled={submitting}
                          error={!!form.formState.errors.passengers?.[index]?.age}
                          helperText={form.formState.errors.passengers?.[index]?.age?.message}
                          {...form.register(`passengers.${index}.age`, {
                            valueAsNumber: true,
                            required: 'Age is required',
                            min: { value: 1, message: 'Age must be at least 1' },
                            max: { value: 125, message: 'Age must be 125 or below' }
                          })} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <TextField select fullWidth label="Gender" disabled={submitting} {...form.register(`passengers.${index}.gender`, { required: 'Gender is required' })}>
                          {['Male', 'Female', 'Other'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField select fullWidth label="Berth" disabled={submitting} {...form.register(`passengers.${index}.berthPreference`)}>
                          {berthOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                        </TextField>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              ))}

              <Grid item xs={12}>
                <ReviewPanel review={review} isCurrent={reviewIsCurrent} passengerCount={passengerCount} />
              </Grid>

              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
                  <Button type="button" startIcon={<AddIcon />} disabled={submitting}
                    onClick={() => append({ fullName: '', age: 30, gender: 'Male', berthPreference: 'NO_PREFERENCE' })}>
                    Add passenger
                  </Button>
                  <Button type="button" startIcon={<RateReviewIcon />} onClick={form.handleSubmit(prepareReview)} disabled={loadingReview || submitting}>
                    {loadingReview ? 'Preparing review...' : 'Review booking'}
                  </Button>
                  <Button type="submit" variant="contained" startIcon={<ConfirmationNumberIcon />}
                    disabled={!reviewIsCurrent || review.availableSeats === 0 || submitting}>
                    {submitting ? 'Processing...' : 'Confirm booking'}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Stack>
    </Container>
  );
}

function TrainSummary({ train, values }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{train.name} - {train.number}</Typography>
          <Typography color="text.secondary">{train.category}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Typography color="text.secondary">From</Typography>
          <Typography fontWeight={800}>{values.sourceStationCode || '-'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Typography color="text.secondary">To</Typography>
          <Typography fontWeight={800}>{values.destinationStationCode || '-'}</Typography>
        </Grid>
        <Grid item xs={6} md={1.5}>
          <Typography color="text.secondary">Date</Typography>
          <Typography fontWeight={800}>{values.journeyDate || '-'}</Typography>
        </Grid>
        <Grid item xs={6} md={1.5}>
          <Typography color="text.secondary">Class</Typography>
          <Typography fontWeight={800}>{values.travelClass || '-'}</Typography>
        </Grid>
      </Grid>
    </Paper>
  );
}

function ReviewPanel({ review, isCurrent, passengerCount }) {
  if (!review) {
    return <EmptyState title="Booking review required" message="Review fare, availability, passengers, and cancellation policy before confirming this booking." />;
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: isCurrent ? 'divider' : 'warning.main' }}>
      <Grid container spacing={2}>
        {!isCurrent && (
          <Grid item xs={12}>
            <Alert severity="warning">Booking details changed. Please review again before confirming.</Alert>
          </Grid>
        )}
        <Grid item xs={12} md={5}>
          <Typography variant="h6" fontWeight={800}>Fare breakdown</Typography>
          {review.fareBreakdown?.map((line) => (
            <Stack key={line.label} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
              <Typography color="text.secondary">{line.label}</Typography>
              <Typography>Rs {line.amount}</Typography>
            </Stack>
          ))}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography fontWeight={800}>Total</Typography>
            <Typography fontWeight={800}>Rs {review.totalFare}</Typography>
          </Stack>
        </Grid>
        <Grid item xs={12} md={3}>
          <Typography variant="h6" fontWeight={800}>Availability</Typography>
          <Stack spacing={1} alignItems="flex-start">
            <Chip color={review.availableSeats >= passengerCount ? 'success' : 'error'} label={`${review.availableSeats} seats - ${review.availabilityStatus}`} />
            <Typography color="text.secondary">Passengers: {passengerCount}</Typography>
          </Stack>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" fontWeight={800}>Berth suggestions</Typography>
          {review.berthSuggestions?.length ? review.berthSuggestions.map((item) => (
            <Typography key={item.passengerName}>{item.passengerName}: {item.suggestion}</Typography>
          )) : <Typography color="text.secondary">No berth preference selected.</Typography>}
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight={800}>Cancellation policy</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {review.cancellationPolicy?.map((item) => <Chip key={item} label={item} variant="outlined" />)}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}

function BookingSuccess({ response, fallbackValues }) {
  const hasPnr = Boolean(response?.pnr);
  return (
    <SuccessState title="Booking confirmed" message={hasPnr ? `Your ticket has been booked. PNR ${response.pnr}` : 'Booking completed, but PNR was not returned by the booking API.'}>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <Grid container spacing={2}>
          <Detail label="PNR" value={response?.pnr || 'Not returned'} />
          <Detail label="Train" value={`${response?.trainName || 'Train'} ${response?.trainNumber ? `- ${response.trainNumber}` : ''}`} />
          <Detail label="From" value={`${response?.sourceName || response?.sourceCode || fallbackValues.sourceStationCode || '-'}`} />
          <Detail label="To" value={`${response?.destinationName || response?.destinationCode || fallbackValues.destinationStationCode || '-'}`} />
          <Detail label="Journey date" value={response?.journeyDate || fallbackValues.journeyDate || '-'} />
          <Detail label="Class" value={response?.travelClass || fallbackValues.travelClass || '-'} />
          <Detail label="Passenger count" value={response?.passengerCount || fallbackValues.passengers?.length || 0} />
          <Detail label="Total fare" value={`Rs ${response?.totalFare || '-'}`} />
          <Detail label="Payment status" value={response?.paymentStatus || 'Not returned by API'} />
        </Grid>
      </Paper>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
        <Button component={Link} to={hasPnr ? `/pnr?pnr=${response.pnr}` : '/pnr'} variant="contained">View PNR</Button>
        <Button component={Link} to="/dashboard">View My Bookings</Button>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()}>Print Ticket</Button>
        <Button component={Link} to="/" startIcon={<SearchIcon />}>Back to Search</Button>
      </Stack>
    </SuccessState>
  );
}

function BookingFailure({ message, retry }) {
  return (
    <ErrorState title="Booking could not be completed" message={message}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
        <Button variant="contained" onClick={retry}>Retry Booking</Button>
        <Button component={Link} to="/">Back to Search</Button>
      </Stack>
    </ErrorState>
  );
}

function Detail({ label, value }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={800}>{value}</Typography>
    </Grid>
  );
}

function getSafeJourneyDate(value, today) {
  return value && value >= today ? value : today;
}
