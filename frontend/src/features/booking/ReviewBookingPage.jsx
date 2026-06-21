import { Alert, Box, Button, Chip, Divider, Grid, Paper, Stack, Typography, alpha } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import RouteIcon from '@mui/icons-material/Route';
import TrainIcon from '@mui/icons-material/Train';

const notes = [
  'Verify passenger details before confirming.',
  'Passenger name, age, and gender cannot be changed after booking.',
  'Booking is subject to availability.',
  'RAC/Waitlist may be assigned based on availability.',
  'Cancellation/refund rules apply.'
];

export default function ReviewBookingPage({ train, values, review, reviewIsCurrent, passengerCount, submitting, loadingReview, submitError, onBackToEdit, onConfirmBooking }) {
  const theme = useTheme();
  const availableSeats = Number(review?.availableSeats ?? 0);
  const canConfirm = Boolean(review) && reviewIsCurrent && !submitting && !loadingReview;
  const fareLines = normalizeFareLines(review);
  const source = values.sourceStationCode || '-';
  const destination = values.destinationStationCode || '-';
  const likelyConfirmed = availableSeats >= passengerCount;
  const outcomeLabel = likelyConfirmed ? 'Likely confirmed' : 'RAC/Waitlist may be assigned';
  const outcomeMessage = likelyConfirmed
    ? 'Confirmed seats appear available for all passengers. Final status is assigned by the booking service at confirmation.'
    : 'Confirmed seats are limited for this passenger count. RAC or waitlist may be assigned during final confirmation.';

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Stack spacing={2.5}>
        <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.secondary.main, 0.10)})`, border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}` }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
            <Stack spacing={0.75} sx={{ minWidth: 0 }}>
              <Chip icon={<ConfirmationNumberIcon />} color="primary" label="Final confirmation" sx={{ width: 'fit-content' }} />
              <Typography variant="h4" fontWeight={900}>Review booking</Typography>
              <Typography color="text.secondary">Confirm journey, passengers, fare, and availability before SouthRail issues this ticket.</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip variant="outlined" label={`${passengerCount} passenger${passengerCount === 1 ? '' : 's'}`} />
              <Chip color={likelyConfirmed ? 'success' : 'warning'} label={outcomeLabel} sx={{ maxWidth: '100%' }} />
            </Stack>
          </Stack>
        </Paper>

        {!reviewIsCurrent && <Alert severity="warning">Booking details changed. Please review again before confirming.</Alert>}
        {submitError && <Alert severity="error">{submitError}</Alert>}
        <Alert severity={likelyConfirmed ? 'success' : 'warning'} sx={{ '& .MuiAlert-message': { overflowWrap: 'anywhere' } }}>{outcomeMessage}</Alert>

        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={8}>
            <Stack spacing={2.5}>
              <ReviewCard icon={<RouteIcon color="primary" />} title="Journey Summary">
                <Stack spacing={2.25}>
                  <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ minWidth: 0 }}>
                      <StationBlock label="FROM" value={source} />
                      <Box sx={{ flex: 1, minWidth: 44, borderTop: `2px dashed ${alpha(theme.palette.primary.main, 0.45)}` }} />
                      <TrainIcon color="primary" />
                      <Box sx={{ flex: 1, minWidth: 44, borderTop: `2px dashed ${alpha(theme.palette.primary.main, 0.45)}` }} />
                      <StationBlock label="TO" value={destination} align="right" />
                    </Stack>
                  </Paper>
                  <Grid container spacing={2}>
                    <Detail label="Train" value={`${train?.name || 'Train'} ${train?.number ? `(${train.number})` : ''}`} />
                    <Detail label="Category" value={train?.category || 'Not specified'} />
                    <Detail label="Journey date" value={values.journeyDate || '-'} />
                    <Detail label="Travel class" value={values.travelClass || '-'} chip />
                    <Detail label="Quota" value={formatLabel(values.quota || '-')} chip />
                  </Grid>
                </Stack>
              </ReviewCard>

              <ReviewCard icon={<EventSeatIcon color="primary" />} title="Passenger Details">
                <Stack spacing={1.5}>
                  {values.passengers?.map((passenger, index) => (
                    <Paper key={`${passenger.fullName}-${index}`} variant="outlined" sx={{ p: 1.75, borderRadius: 3, minWidth: 0 }}>
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <Chip size="small" variant="outlined" label={`Passenger ${index + 1}`} sx={{ mb: 0.75 }} />
                          <Typography fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>{passenger.fullName || '-'}</Typography>
                        </Grid>
                        <Detail compact label="Age" value={passenger.age || '-'} />
                        <Detail compact label="Gender" value={passenger.gender || '-'} />
                        <Detail compact label="Berth preference" value={formatLabel(passenger.berthPreference || 'NO_PREFERENCE')} chip />
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </ReviewCard>

              <ReviewCard icon={<EventSeatIcon color="primary" />} title="Berth Suggestions">
                {review?.berthSuggestions?.length ? (
                  <Stack spacing={1.25}>
                    {review.berthSuggestions.map((item, index) => (
                      <Paper key={`${item.passengerName}-${index}`} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                          <Typography fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>{item.passengerName || `Passenger ${index + 1}`}</Typography>
                          <Chip color="secondary" variant="outlined" label={formatLabel(item.suggestion || item.suggestedBerth || 'No specific berth')} />
                        </Stack>
                        {item.reason && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{item.reason}</Typography>}
                      </Paper>
                    ))}
                  </Stack>
                ) : <Typography color="text.secondary">No berth suggestions returned for this review.</Typography>}
              </ReviewCard>

              <ReviewCard icon={<InfoOutlinedIcon color="primary" />} title="Important Notes">
                <Stack spacing={1.25}>
                  {notes.map((note) => (
                    <Stack key={note} direction="row" spacing={1.25} alignItems="flex-start">
                      <InfoOutlinedIcon color="secondary" fontSize="small" sx={{ mt: 0.25 }} />
                      <Typography color="text.secondary">{note}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </ReviewCard>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={4} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, position: { md: 'sticky' }, top: { md: 24 }, width: '100%', maxWidth: '100%' }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center"><PaymentsIcon color="primary" /><Typography variant="h6" fontWeight={900}>Fare Summary</Typography></Stack>
                  <Chip color={likelyConfirmed ? 'success' : 'warning'} label={outcomeLabel} sx={{ maxWidth: '100%' }} />
                </Stack>
                <Divider />
                {fareLines.map((line) => (
                  <Stack key={line.label} direction="row" justifyContent="space-between" spacing={2}>
                    <Typography color="text.secondary">{line.label}</Typography>
                    <Typography fontWeight={800}>₹ {line.amount}</Typography>
                  </Stack>
                ))}
                <Divider />
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.07) }}>
                  <Stack spacing={0.5}>
                    <Typography color="text.secondary" fontWeight={700}>Total payable amount</Typography>
                    <Typography variant="h4" fontWeight={950} color="primary">₹ {review?.totalFare ?? '-'}</Typography>
                  </Stack>
                </Paper>
                <Stack spacing={0.75}>
                  <Typography color="text.secondary">Passenger count: <strong>{passengerCount}</strong></Typography>
                  <Typography color="text.secondary">Available seats: <strong>{review?.availableSeats ?? '-'}</strong></Typography>
                  <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>Availability: <strong>{review?.availabilityStatus || 'Pending'}</strong></Typography>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1.5} sx={{ '& .MuiButton-root': { width: '100%' } }}>
                  <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBackToEdit} disabled={submitting}>Back/Edit</Button>
                  <Button variant="contained" size="large" startIcon={<ConfirmationNumberIcon />} onClick={onConfirmBooking} disabled={!canConfirm}>
                    {submitting ? 'Processing...' : 'Confirm Final Booking'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

function ReviewCard({ icon, title, children }) {
  return <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, width: '100%', maxWidth: '100%', minWidth: 0 }}><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.75 }}>{icon}<Typography variant="h6" fontWeight={900}>{title}</Typography></Stack>{children}</Paper>;
}

function StationBlock({ label, value, align = 'left' }) {
  return <Box sx={{ minWidth: 0, textAlign: align }}><Typography variant="caption" color="text.secondary" fontWeight={900}>{label}</Typography><Typography variant="h5" fontWeight={950} sx={{ overflowWrap: 'anywhere' }}>{value}</Typography></Box>;
}

function Detail({ label, value, chip = false, compact = false }) {
  return <Grid item xs={compact ? 4 : 12} sm={compact ? 2.3 : 6} md={compact ? 2.3 : 4}><Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>{chip ? <Box sx={{ mt: 0.25 }}><Chip size="small" label={value} /></Box> : <Typography fontWeight={850} sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>}</Grid>;
}

function normalizeFareLines(review) {
  if (!review) return [];
  if (review.fareBreakdown?.length) return review.fareBreakdown;
  return [
    { label: 'Base fare', amount: review.baseFare ?? '-' },
    { label: 'Reservation charge', amount: review.reservationCharge ?? '-' },
    { label: 'Convenience fee', amount: review.convenienceFee ?? '-' },
    { label: 'GST', amount: review.gst ?? '-' }
  ];
}

function formatLabel(value) {
  return String(value).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
