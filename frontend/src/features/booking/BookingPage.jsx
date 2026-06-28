import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Card, CardContent, Chip, Container, Divider, Grid, LinearProgress,
  MenuItem, Paper, Stack, Step, StepLabel, Stepper, TextField, Typography, alpha
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PrintIcon from '@mui/icons-material/Print';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { downloadTicketPdf } from '../../services/downloadTicket.js';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SearchIcon from '@mui/icons-material/Search';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import TrainIcon from '@mui/icons-material/Train';
import api from '../../services/api.js';
import { EmptyState, ErrorState, LoadingState, SuccessState } from '../../components/StateFeedback.jsx';
import ReviewBookingPage from './ReviewBookingPage.jsx';
import { getApiErrorMessage, isAuthError } from '../../utils/apiErrors.js';
import { formatAmount, getBookingStatusLabel, getBookingStatusMessage, getBookingStatusTitle, getQueueText, normalizeBookingStatus, safeText } from '../../utils/bookingStatus.js';

const steps = ['Passenger details', 'Review booking', 'Confirmation'];
const travelClasses = ['1A', '2A', '3A', 'SL', 'CC', '2S'];
const quotas = ['GENERAL', 'TATKAL', 'LADIES', 'SENIOR_CITIZEN', 'PREMIUM_TATKAL'];
const genderOptions = ['Male', 'Female', 'Other'];
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
  const [showReview, setShowReview] = useState(false);
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      trainId,
      sourceStationCode: searchParams.get('sourceStationCode') || '',
      destinationStationCode: searchParams.get('destinationStationCode') || '',
      journeyDate: getSafeJourneyDate(searchParams.get('journeyDate'), today),
      travelClass: getSafeOption(searchParams.get('travelClass'), travelClasses, '3A'),
      quota: getSafeOption(searchParams.get('quota'), quotas, 'GENERAL'),
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
      .catch((apiError) => { setTrainError(getApiErrorMessage(apiError, 'Train details could not be loaded.')); })
      .finally(() => setLoadingTrain(false));
  }, [trainId]);

  const prepareReview = async (values) => {
    setError(''); setSubmitError(''); setResponse(null); setLoadingReview(true);
    try {
      const { data } = await api.post('/bookings/review', values);
      setReview(data); setReviewedSignature(JSON.stringify(values)); setShowReview(true);
    } catch (apiError) {
      setReview(null); setReviewedSignature(''); setShowReview(false);
      setError(isAuthError(apiError)
        ? 'Please login again to continue booking.'
        : getApiErrorMessage(apiError, 'Review could not be prepared. Check train, route, date, and passenger details.'));
    } finally { setLoadingReview(false); }
  };

  const submit = async (values) => {
    setError(''); setSubmitError('');
    if (!review || reviewedSignature !== JSON.stringify(values)) { setError('Please review the latest booking details before confirming.'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/bookings', values);
      setResponse(data);
      navigate(`/payment/${data.bookingId}`);
      setShowReview(false);
    } catch (apiError) {
      setSubmitError(isAuthError(apiError)
        ? 'Please login again to continue booking.'
        : getApiErrorMessage(apiError, 'Booking could not be completed. Please retry.'));
    } finally { setSubmitting(false); }
  };

  if (response) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 1.5, md: 2 } }}>
        <Stepper activeStep={2} sx={{ mb: 2, '& .MuiStepLabel-label': { fontSize: '0.78rem' }, '& .MuiStepIcon-root': { fontSize: 20 } }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
        <BookingSuccess response={response} fallbackValues={currentValues} />
      </Container>
    );
  }

  return (
    <Container maxWidth={showReview && review ? "xl" : "lg"} sx={{ py: { xs: 1.5, md: 2 } }}>
      {/* Page header */}
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrainIcon color="primary" /> Book ticket
        </Typography>
        <Typography color="text.secondary">
          Complete the steps below to book your train journey
        </Typography>
      </Stack>

      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          mb: 2.5,
          overflowX: 'auto',
          pb: 0.5,
          '& .MuiStepLabel-label': { fontSize: '0.78rem', fontWeight: 600 },
          '& .MuiStepIcon-root': { fontSize: 22 },
          '& .MuiStepConnector-line': { borderColor: 'divider' }
        }}
      >
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>

      <Stack spacing={2}>
        {loadingTrain && <LoadingState message="Loading train details..." />}
        {trainError && <Alert severity="warning" sx={{ borderRadius: 2 }}>{trainError}</Alert>}
        {train && <TrainSummary train={train} values={currentValues} />}
        {error && <ErrorState title="Booking review failed" message={error} />}
        {submitError && <BookingFailure message={submitError} retry={form.handleSubmit(submit)} />}
        {loadingReview && <LoadingState message="Preparing booking review..." />}
        {submitting && (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'var(--southrail-card-border)' }} role="status" aria-live="polite">
            <Stack spacing={1.5}>
              <LinearProgress sx={{ borderRadius: 999 }} aria-hidden="true" />
              <Typography fontWeight={800}>Processing your booking...</Typography>
              <Typography color="text.secondary" variant="body2">Please wait. Do not refresh or submit again.</Typography>
            </Stack>
          </Paper>
        )}

        {showReview && review ? (
          <ReviewBookingPage
            train={train}
            values={currentValues}
            review={review}
            reviewIsCurrent={reviewIsCurrent}
            passengerCount={passengerCount}
            submitting={submitting}
            loadingReview={loadingReview}
            submitError={submitError}
            onBackToEdit={() => setShowReview(false)}
            onConfirmBooking={form.handleSubmit(submit)}
          />
        ) : (
          <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: 4, borderLeftColor: 'primary.main' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Box component="form" onSubmit={form.handleSubmit(submit)}>
                <Stack spacing={2.5}>
                  {/* Journey details section */}
                  <Box>
                    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                      <Typography variant="overline" color="secondary" fontWeight={900} letterSpacing={1}>Journey details</Typography>
                      <Typography variant="subtitle1" fontWeight={900}>Route and fare options</Typography>
                      <Typography color="text.secondary" variant="body2">Confirm the stations, journey date, class, and quota before proceeding.</Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="From station code" disabled={submitting} error={!!form.formState.errors.sourceStationCode}
                          helperText={form.formState.errors.sourceStationCode?.message}
                          {...form.register('sourceStationCode', { required: 'Source station is required' })} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth label="To station code" disabled={submitting} error={!!form.formState.errors.destinationStationCode}
                          helperText={form.formState.errors.destinationStationCode?.message}
                          {...form.register('destinationStationCode', {
                            required: 'Destination station is required',
                            validate: (value) => value.trim().toUpperCase() !== String(form.getValues('sourceStationCode') || '').trim().toUpperCase() || 'Source and destination cannot be the same.'
                          })} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField fullWidth type="date" label="Date" disabled={submitting} InputLabelProps={{ shrink: true }}
                          inputProps={{ min: today }}
                          error={!!form.formState.errors.journeyDate} helperText={form.formState.errors.journeyDate?.message}
                          {...form.register('journeyDate', {
                            required: 'Journey date is required',
                            validate: (value) => value >= today || 'Please select today or a future journey date.'
                          })} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <ControlledSelect control={form.control} name="travelClass" label="Class" disabled={submitting} options={travelClasses} rules={{ required: 'Travel class is required' }} error={form.formState.errors.travelClass} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <ControlledSelect control={form.control} name="quota" label="Quota" disabled={submitting} options={quotas} rules={{ required: 'Quota is required' }} error={form.formState.errors.quota} formatOption={formatLabel} />
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider />

                  {/* Passenger details section */}
                  <Box>
                    <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                      <Typography variant="overline" color="secondary" fontWeight={900} letterSpacing={1}>Passenger details</Typography>
                      <Typography variant="subtitle1" fontWeight={900}>Add passenger information</Typography>
                      <Typography color="text.secondary" variant="body2">Details are used for ticket generation, berth planning, and final booking validation.</Typography>
                    </Stack>
                    <Stack spacing={2}>
                      {fields.map((field, index) => (
                        <Card key={field.id} variant="outlined" sx={{ borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) }}>
                          <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                            <Stack spacing={2}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <PersonIcon color="primary" sx={{ fontSize: 20 }} />
                                  <Typography variant="subtitle1" fontWeight={900}>Passenger {index + 1}</Typography>
                                </Stack>
                                <Chip size="small" color={index === 0 ? 'primary' : 'default'} variant={index === 0 ? 'filled' : 'outlined'} label={index === 0 ? 'Primary traveller' : 'Co-passenger'} />
                              </Stack>
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
                                    {...form.register(`passengers.${index}.age`, { valueAsNumber: true, required: 'Age is required', min: { value: 1, message: 'Age must be at least 1' }, max: { value: 125, message: 'Age must be 125 or below' } })} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                  <ControlledSelect control={form.control} name={`passengers.${index}.gender`} label="Gender" disabled={submitting} options={genderOptions} rules={{ required: 'Gender is required' }} error={form.formState.errors.passengers?.[index]?.gender} />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                  <ControlledSelect control={form.control} name={`passengers.${index}.berthPreference`} label="Berth preference" disabled={submitting} options={berthOptions} error={form.formState.errors.passengers?.[index]?.berthPreference} formatOption={formatLabel} />
                                </Grid>
                              </Grid>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>

                  <ReviewPanel review={review} isCurrent={reviewIsCurrent} passengerCount={passengerCount} />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Button type="button" startIcon={<AddIcon />} disabled={submitting} variant="outlined" sx={{ borderRadius: 2 }}
                      onClick={() => append({ fullName: '', age: 30, gender: 'Male', berthPreference: 'NO_PREFERENCE' })}>
                      Add passenger
                    </Button>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
                      <Button type="button" variant="outlined" startIcon={<RateReviewIcon />} onClick={form.handleSubmit(prepareReview)} disabled={loadingReview || submitting} sx={{ borderRadius: 2 }}>
                        {loadingReview ? 'Preparing review...' : 'Review booking'}
                      </Button>
                      <Button type="submit" variant="contained" startIcon={<ConfirmationNumberIcon />}
                        disabled={!reviewIsCurrent || review?.availableSeats === 0 || submitting} sx={{ borderRadius: 2 }}>
                        {submitting ? 'Processing...' : 'Confirm booking'}
                      </Button>
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
}

function ControlledSelect({ control, name, label, options, disabled, rules, error, formatOption = (value) => value }) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <TextField
          select fullWidth label={label} disabled={disabled}
          value={options.includes(field.value) ? field.value : ''}
          onChange={field.onChange} onBlur={field.onBlur}
          name={field.name} inputRef={field.ref}
          error={!!error} helperText={error?.message}
        >
          {!options.includes(field.value) && <MenuItem value="" disabled>Select {label.toLowerCase()}</MenuItem>}
          {options.map((item) => <MenuItem key={item} value={item}>{formatOption(item)}</MenuItem>)}
        </TextField>
      )}
    />
  );
}

function formatLabel(value) { return String(value).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()); }

function TrainSummary({ train, values }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)}, ${alpha(theme.palette.primary.main, 0.02)})` }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TrainIcon color="primary" />
            <Typography variant="h6" fontWeight={800}>{train.name} - {train.number}</Typography>
            {train.category && <Chip label={train.category} size="small" variant="outlined" />}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} divider={<Divider orientation="vertical" flexItem />} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ textAlign: 'center', px: 1.5, py: 0.8, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">FROM</Typography>
                <Typography fontWeight={900}>{values.sourceStationCode || '-'}</Typography>
              </Box>
              <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Box sx={{ textAlign: 'center', px: 1.5, py: 0.8, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">TO</Typography>
                <Typography fontWeight={900}>{values.destinationStationCode || '-'}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">DATE</Typography>
                <Typography fontWeight={700}>{values.journeyDate || '-'}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">CLASS</Typography>
                <Typography fontWeight={700}>{values.travelClass || '-'}</Typography>
              </Box>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ReviewPanel({ review, isCurrent, passengerCount }) {
  if (!review) {
    return <EmptyState title="Booking review required" message="Review fare, availability, passengers, and cancellation policy before confirming this booking." />;
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderColor: isCurrent ? 'primary.main' : 'warning.main', bgcolor: (theme) => alpha(isCurrent ? theme.palette.primary.main : theme.palette.warning.main, 0.04) }}>
      <Grid container spacing={2}>
        {!isCurrent && (
          <Grid item xs={12}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>Booking details changed. Please review again before confirming.</Alert>
          </Grid>
        )}
        <Grid item xs={12} md={5}>
          <Typography variant="subtitle1" fontWeight={800}>Fare breakdown</Typography>
          {review.fareBreakdown?.map((line) => (
            <Stack key={line.label} direction="row" justifyContent="space-between">
              <Typography color="text.secondary" variant="body2">{line.label}</Typography>
              <Typography variant="body2" fontWeight={600}>\u20B9 {line.amount}</Typography>
            </Stack>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography fontWeight={800}>Total</Typography>
            <Typography fontWeight={800}>\u20B9 {review.totalFare}</Typography>
          </Stack>
        </Grid>
        <Grid item xs={12} md={3}>
          <Typography variant="subtitle1" fontWeight={800}>Availability</Typography>
          <Stack spacing={1} alignItems="flex-start">
            <Chip size="small" color={review.availableSeats >= passengerCount ? 'success' : 'error'} label={`${review.availableSeats} seats`} />
            <Typography color="text.secondary" variant="body2">Passengers: {passengerCount}</Typography>
          </Stack>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" fontWeight={800}>Berth suggestions</Typography>
          {review.berthSuggestions?.length ? review.berthSuggestions.map((item) => (
            <Typography key={item.passengerName} variant="body2">{item.passengerName}: {item.suggestion}</Typography>
          )) : <Typography color="text.secondary" variant="body2">No berth preference selected.</Typography>}
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" fontWeight={800}>Cancellation policy</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {review.cancellationPolicy?.map((item) => <Chip key={item} label={item} variant="outlined" size="small" />)}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}

function BookingSuccess({ response, fallbackValues }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const status = normalizeBookingStatus(response?.status);
  const title = getBookingStatusTitle(status);
  const message = response?.pnr
    ? `${getBookingStatusMessage(status)} PNR ${response.pnr}`
    : `${getBookingStatusMessage(status)} Booking completed, but PNR was not returned by the booking API.`;
  const reservationLabel = getBookingStatusLabel(status, response?.reservationLabel);
  const queueText = getQueueText(response?.queuePosition);
  const hasPnr = Boolean(response?.pnr);

  const handleDownloadTicket = async () => {
    if (!response?.pnr) { setDownloadError('PNR is not available for this booking.'); return; }
    setDownloading(true); setDownloadError('');
    try { await downloadTicketPdf(response.pnr); }
    catch (error) { setDownloadError(getApiErrorMessage(error, 'Unable to download ticket right now. Please try again.')); }
    finally { setDownloading(false); }
  };

  return (
    <SuccessState title={title} message={message}>
      <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: 4, borderLeftColor: status === 'CONFIRMED' ? 'success.main' : status === 'RAC' ? 'info.main' : 'warning.main' }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>PNR</Typography>
              <Typography fontWeight={900} sx={{ fontSize: '1.1rem', fontFamily: 'monospace', letterSpacing: 1 }}>{safeText(response?.pnr, 'Not returned')}</Typography>
            </Grid>
            <Detail label="Train" value={`${safeText(response?.trainName, 'Train')} ${response?.trainNumber ? `- ${response.trainNumber}` : ''}`} />
            <Detail label="From" value={safeText(response?.sourceName || response?.sourceCode || fallbackValues.sourceStationCode)} />
            <Detail label="To" value={safeText(response?.destinationName || response?.destinationCode || fallbackValues.destinationStationCode)} />
            <Detail label="Journey date" value={safeText(response?.journeyDate || fallbackValues.journeyDate)} />
            <Detail label="Class / quota" value={`${safeText(response?.travelClass || fallbackValues.travelClass)} / ${safeText(fallbackValues.quota)}`} />
            <Detail label="Passenger count" value={safeText(response?.passengerCount || fallbackValues.passengers?.length || 0)} />
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Booking status</Typography>
              <Chip color={status === 'CONFIRMED' ? 'success' : status === 'CANCELLED' ? 'error' : status === 'RAC' ? 'info' : 'warning'} label={safeText(response?.status, 'UNKNOWN')} />
            </Grid>
            <Detail label="Reservation" value={reservationLabel} />
            {status !== 'CONFIRMED' && <Detail label="Queue position" value={queueText} />}
            <Detail label="Total fare" value={formatAmount(response?.totalFare)} />
            <Detail label="Payment status" value={safeText(response?.paymentStatus, 'Not returned by API')} />
          </Grid>
        </CardContent>
      </Card>
      {downloadError && <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>{downloadError}</Alert>}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Button component={Link} to={hasPnr ? `/pnr?pnr=${response.pnr}` : '/pnr'} variant="contained" size="small" sx={{ borderRadius: 2 }}>View PNR</Button>
        <Button component={Link} to="/dashboard" variant="outlined" size="small" sx={{ borderRadius: 2 }}>My Bookings</Button>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()} variant="outlined" size="small" sx={{ borderRadius: 2 }}>Print</Button>
        <Button component={Link} to="/" startIcon={<SearchIcon />} variant="outlined" size="small" sx={{ borderRadius: 2 }}>New Search</Button>
        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={handleDownloadTicket} disabled={!hasPnr || downloading} size="small" sx={{ borderRadius: 2 }}>
          {downloading ? 'Downloading...' : 'Download PDF'}
        </Button>
      </Stack>
    </SuccessState>
  );
}

function BookingFailure({ message, retry }) {
  return (
    <ErrorState title="Booking could not be completed" message={message}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
        <Button variant="contained" onClick={retry} sx={{ borderRadius: 2 }}>Retry Booking</Button>
        <Button component={Link} to="/" variant="outlined" sx={{ borderRadius: 2 }}>Back to Search</Button>
      </Stack>
    </ErrorState>
  );
}

function Detail({ label, value }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={800}>{value}</Typography>
    </Grid>
  );
}

function getSafeJourneyDate(value, today) { return value && value >= today ? value : today; }
function getSafeOption(value, options, fallback) { return options.includes(value) ? value : fallback; }
