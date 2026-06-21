import { Alert, Box, Button, Chip, Divider, Grid, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';

const notes = [
  'Verify passenger details before confirming.',
  'Passenger name, age, and gender cannot be changed after booking.',
  'Booking is subject to availability.',
  'RAC/Waitlist may be assigned based on availability.',
  'Cancellation/refund rules apply.'
];

export default function ReviewBookingPage({
  train,
  values,
  review,
  reviewIsCurrent,
  passengerCount,
  submitting,
  loadingReview,
  submitError,
  onBackToEdit,
  onConfirmBooking
}) {
  const availableSeats = Number(review?.availableSeats ?? 0);
  const canConfirm = Boolean(review) && reviewIsCurrent && !submitting && !loadingReview && availableSeats !== 0;
  const fareLines = normalizeFareLines(review);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" fontWeight={900} gutterBottom>Review booking</Typography>
          <Typography color="text.secondary">Confirm the journey, passengers, fare, and availability before final booking.</Typography>
        </Box>

        {!reviewIsCurrent && (
          <Alert severity="warning">Booking details changed. Please review again before confirming.</Alert>
        )}
        {submitError && <Alert severity="error">{submitError}</Alert>}

        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} md={8}>
            <Stack spacing={2.5}>
              <ReviewCard title="Journey Summary">
                <Grid container spacing={2}>
                  <Detail label="Train" value={`${train?.name || 'Train'} ${train?.number ? `(${train.number})` : ''}`} />
                  <Detail label="Category" value={train?.category || 'Not specified'} />
                  <Detail label="Route" value={`${values.sourceStationCode || '-'} → ${values.destinationStationCode || '-'}`} strong />
                  <Detail label="From" value={values.sourceStationCode || '-'} />
                  <Detail label="To" value={values.destinationStationCode || '-'} />
                  <Detail label="Journey date" value={values.journeyDate || '-'} />
                  <Detail label="Travel class" value={values.travelClass || '-'} />
                  <Detail label="Quota" value={values.quota || '-'} />
                </Grid>
              </ReviewCard>

              <ReviewCard title="Passenger Details">
                <Stack spacing={1.5}>
                  {values.passengers?.map((passenger, index) => (
                    <Paper key={`${passenger.fullName}-${index}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2, minWidth: 0 }}>
                      <Grid container spacing={1.5} alignItems="center">
                        <Grid item xs={12} sm={5}>
                          <Typography variant="caption" color="text.secondary">Passenger {index + 1}</Typography>
                          <Typography fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{passenger.fullName || '-'}</Typography>
                        </Grid>
                        <Detail compact label="Age" value={passenger.age || '-'} />
                        <Detail compact label="Gender" value={passenger.gender || '-'} />
                        <Detail compact label="Berth preference" value={formatLabel(passenger.berthPreference || 'NO_PREFERENCE')} />
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              </ReviewCard>

              <ReviewCard title="Berth Suggestions">
                {review?.berthSuggestions?.length ? (
                  <Stack spacing={1.25}>
                    {review.berthSuggestions.map((item, index) => (
                      <Paper key={`${item.passengerName}-${index}`} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                        <Typography fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{item.passengerName || `Passenger ${index + 1}`}</Typography>
                        <Typography>{item.suggestion || item.suggestedBerth || 'No specific berth suggested'}</Typography>
                        {item.reason && <Typography variant="body2" color="text.secondary">{item.reason}</Typography>}
                      </Paper>
                    ))}
                  </Stack>
                ) : <Typography color="text.secondary">No berth suggestions returned for this review.</Typography>}
              </ReviewCard>

              <ReviewCard title="Important Notes">
                <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5 }}>
                  {notes.map((note) => <Typography key={note} component="li" color="text.secondary">{note}</Typography>)}
                </Stack>
              </ReviewCard>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={4} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, position: { md: 'sticky' }, top: { md: 24 }, width: '100%', maxWidth: '100%' }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography variant="h6" fontWeight={900}>Fare Summary</Typography>
                  <Chip color={availableSeats >= passengerCount ? 'success' : 'warning'} label={review?.availabilityStatus || 'Pending'} />
                </Stack>
                <Divider />
                {fareLines.map((line) => (
                  <Stack key={line.label} direction="row" justifyContent="space-between" spacing={2}>
                    <Typography color="text.secondary">{line.label}</Typography>
                    <Typography fontWeight={700}>Rs {line.amount}</Typography>
                  </Stack>
                ))}
                <Divider />
                <Stack direction="row" justifyContent="space-between" spacing={2} alignItems="baseline">
                  <Typography fontWeight={900}>Total payable</Typography>
                  <Typography variant="h4" fontWeight={900} color="primary">Rs {review?.totalFare ?? '-'}</Typography>
                </Stack>
                <Stack spacing={0.75}>
                  <Typography color="text.secondary">Passengers: <strong>{passengerCount}</strong></Typography>
                  <Typography color="text.secondary">Available seats: <strong>{review?.availableSeats ?? '-'}</strong></Typography>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1.5} sx={{ '& .MuiButton-root': { width: '100%' } }}>
                  <Button startIcon={<ArrowBackIcon />} onClick={onBackToEdit} disabled={submitting}>Back/Edit</Button>
                  <Button variant="contained" size="large" startIcon={<ConfirmationNumberIcon />} onClick={onConfirmBooking} disabled={!canConfirm}>
                    {submitting ? 'Processing...' : 'Confirm Booking'}
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

function ReviewCard({ title, children }) {
  return <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, width: '100%', maxWidth: '100%', minWidth: 0 }}><Typography variant="h6" fontWeight={900} gutterBottom>{title}</Typography>{children}</Paper>;
}

function Detail({ label, value, strong = false, compact = false }) {
  return <Grid item xs={compact ? 4 : 12} sm={compact ? 2.3 : 6} md={compact ? 2.3 : 3}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={strong ? 900 : 800} sx={{ overflowWrap: 'anywhere' }}>{value}</Typography></Grid>;
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
