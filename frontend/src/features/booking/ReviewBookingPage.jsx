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
  const canConfirm = Boolean(review) && reviewIsCurrent && !submitting && !loadingReview;
  const fareLines = normalizeFareLines(review);
  const source = values.sourceStationCode || '-';
  const destination = values.destinationStationCode || '-';
  const availability = getAvailabilityCopy(review, passengerCount);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <Stack spacing={{ xs: 1.35, md: 1.75 }} sx={{ width: '100%', minWidth: 0 }}>
        <Paper elevation={0} sx={{ p: { xs: 1.35, sm: 1.6, md: 1.8 }, borderRadius: 2.5, overflow: 'hidden', background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.08)})`, border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}` }}>
          <Stack spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-start' }}>
              <Stack spacing={1} sx={{ minWidth: 0, maxWidth: 820 }}>
                <Chip icon={<ConfirmationNumberIcon />} color="primary" label="Final confirmation" sx={{ width: 'fit-content', fontWeight: 800 }} />
                <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: '1.18rem', md: '1.35rem' }, letterSpacing: -0.8 }}>Review booking</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.84rem', md: '0.88rem' }, lineHeight: 1.45 }}>Confirm journey, passengers, fare, and availability before SouthRail issues this ticket.</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' }, maxWidth: '100%' }}>
                <Chip variant="outlined" label={`${passengerCount} passenger${passengerCount === 1 ? '' : 's'}`} sx={{ fontWeight: 800 }} />
                <Chip color={availability.color} label={availability.shortLabel} sx={{ fontWeight: 800 }} />
              </Stack>
            </Stack>
            {availability.message && (
              <Typography color="text.secondary" sx={{ maxWidth: 900, overflowWrap: 'anywhere', lineHeight: 1.45 }}>{availability.message}</Typography>
            )}
          </Stack>
        </Paper>

        {!reviewIsCurrent && <Alert severity="warning">Booking details changed. Please review again before confirming.</Alert>}
        {submitError && <Alert severity="error">{submitError}</Alert>}

        <Grid container spacing={{ xs: 1.25, md: 1.5 }} alignItems="flex-start" sx={{ width: '100%', m: 0 }}>
          <Grid item xs={12} lg={8} sx={{ minWidth: 0, pl: '0 !important', pt: '0 !important' }}>
            <Stack spacing={{ xs: 1.35, md: 1.75 }} sx={{ minWidth: 0 }}>
              <ReviewCard icon={<RouteIcon color="primary" />} title="Journey Summary">
                <Stack spacing={1.1}>
                  <Paper variant="outlined" sx={{ p: { xs: 1.15, sm: 1.25, md: 1.35 }, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.055), borderColor: alpha(theme.palette.primary.main, 0.18), minWidth: 0 }}>
                    <Stack direction="row" spacing={{ xs: 1, sm: 2 }} alignItems="center" justifyContent="space-between" sx={{ minWidth: 0 }}>
                      <StationBlock label="FROM" value={source} />
                      <RouteLine />
                      <TrainIcon color="primary" sx={{ flexShrink: 0 }} />
                      <RouteLine />
                      <StationBlock label="TO" value={destination} align="right" />
                    </Stack>
                  </Paper>
                  <Grid container spacing={1}>
                    <Detail label="Train" value={`${train?.name || 'Train'} ${train?.number ? `(${train.number})` : ''}`} wide />
                    <Detail label="Category" value={train?.category || 'Not specified'} />
                    <Detail label="Journey date" value={values.journeyDate || '-'} />
                    <Detail label="Travel class" value={values.travelClass || '-'} chip />
                    <Detail label="Quota" value={formatLabel(values.quota || '-')} chip />
                  </Grid>
                </Stack>
              </ReviewCard>

              <ReviewCard icon={<EventSeatIcon color="primary" />} title="Passenger Details">
                <Grid container spacing={1.25}>
                  {values.passengers?.map((passenger, index) => (
                    <Grid item xs={12} sm={6} key={`${passenger.fullName}-${index}`} sx={{ minWidth: 0 }}>
                      <Paper variant="outlined" sx={{ p: { xs: 1.15, md: 1.35 }, borderRadius: 2.5, minWidth: 0, height: '100%', bgcolor: alpha(theme.palette.background.paper, 0.74) }}>
                        <Stack spacing={1.1} sx={{ minWidth: 0 }}>
                          <Chip size="small" variant="outlined" label={`Passenger ${index + 1}`} sx={{ width: 'fit-content', fontWeight: 800 }} />
                          <Typography variant="h6" fontWeight={900} sx={{ overflowWrap: 'anywhere', lineHeight: 1.25 }}>{passenger.fullName || '-'}</Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            <Chip label={`Age ${passenger.age || '-'}`} />
                            <Chip label={passenger.gender || '-'} />
                            <Chip color="secondary" variant="outlined" label={formatLabel(passenger.berthPreference || 'NO_PREFERENCE')} />
                          </Stack>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </ReviewCard>

              <ReviewCard icon={<EventSeatIcon color="primary" />} title="Berth Suggestions">
                {review?.berthSuggestions?.length ? (
                  <Stack spacing={1}>
                    {review.berthSuggestions.map((item, index) => (
                      <Paper key={`${item.passengerName}-${index}`} variant="outlined" sx={{ p: 1.15, borderRadius: 2.5, minWidth: 0 }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }}>
                          <Typography fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>{item.passengerName || `Passenger ${index + 1}`}</Typography>
                          <Chip color="secondary" variant="outlined" label={formatLabel(item.suggestion || item.suggestedBerth || 'No specific berth')} />
                        </Stack>
                        {item.reason && <Typography color="text.secondary" sx={{ mt: 0.75 }}>{item.reason}</Typography>}
                      </Paper>
                    ))}
                  </Stack>
                ) : <Typography color="text.secondary">No berth suggestions returned for this review.</Typography>}
              </ReviewCard>

              <ReviewCard icon={<InfoOutlinedIcon color="primary" />} title="Important Notes">
                <Stack spacing={1}>
                  {notes.map((note) => (
                    <Stack key={note} direction="row" spacing={1} alignItems="flex-start">
                      <InfoOutlinedIcon color="secondary" fontSize="small" sx={{ mt: 0.25, flexShrink: 0 }} />
                      <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>{note}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </ReviewCard>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={4} sx={{ minWidth: 0, pt: '0 !important' }}>
            <Paper elevation={2} sx={{ p: { xs: 1.2, md: 1.35 }, borderRadius: 2.5, position: { xs: 'static', lg: 'sticky' }, top: { lg: 24 }, alignSelf: 'flex-start', width: '100%', maxWidth: '100%', minWidth: 0, border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`, boxShadow: `0 8px 20px ${alpha(theme.palette.common.black, 0.10)}` }}>
              <Stack spacing={1} sx={{ minWidth: 0 }}>
                <Stack spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center"><PaymentsIcon color="primary" /><Typography variant="h6" fontWeight={900}>Fare Summary</Typography></Stack>
                  <Chip color={availability.color} label={availability.shortLabel} sx={{ fontWeight: 800 }} />
                  {availability.message && <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere', lineHeight: 1.55 }}>{availability.message}</Typography>}
                </Stack>
                <Divider />
                <Stack spacing={1}>
                  {fareLines.map((line) => (
                    <Stack key={line.label} direction="row" justifyContent="space-between" spacing={1} sx={{ minWidth: 0 }}>
                      <Typography color="text.secondary" sx={{ minWidth: 0 }}>{line.label}</Typography>
                      <Typography fontWeight={850} sx={{ flexShrink: 0 }}>₹ {line.amount}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Divider />
                <Paper variant="outlined" sx={{ p: 1.15, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.07), borderColor: alpha(theme.palette.primary.main, 0.18) }}>
                  <Typography color="text.secondary" fontWeight={800}>Total payable amount</Typography>
                  <Typography variant="h4" fontWeight={950} color="primary" sx={{ mt: 0.25, fontSize: { xs: '1.35rem', md: '1.55rem' } }}>₹ {review?.totalFare ?? '-'}</Typography>
                </Paper>
                <Stack spacing={0.9}>
                  <SummaryLine label="Passenger count" value={passengerCount} />
                  <SummaryLine label="Available seats" value={review?.availableSeats ?? '-'} />
                  <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere', lineHeight: 1.55 }}>Availability: <strong>{review?.availabilityStatus || 'Pending'}</strong></Typography>
                </Stack>
                <Stack spacing={1.1} sx={{ '& .MuiButton-root': { width: '100%', py: 0.45 } }}>
                  <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onBackToEdit} disabled={submitting}>Back/Edit</Button>
                  <Button variant="contained" startIcon={<ConfirmationNumberIcon />} onClick={onConfirmBooking} disabled={!canConfirm}>
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

function ReviewCard({ icon, title, children }) {
  return <Paper elevation={0} variant="outlined" sx={{ p: { xs: 1.15, md: 1.35 }, borderRadius: 2.5, width: '100%', maxWidth: '100%', minWidth: 0 }}><Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.1 }}>{icon}<Typography variant="h6" fontWeight={900}>{title}</Typography></Stack>{children}</Paper>;
}

function StationBlock({ label, value, align = 'left' }) {
  return <Box sx={{ minWidth: 0, flex: '0 1 190px', textAlign: align }}><Typography variant="overline" color="text.secondary" fontWeight={900}>{label}</Typography><Typography variant="h4" fontWeight={950} sx={{ overflowWrap: 'anywhere', fontSize: { xs: '1.05rem', sm: '1.22rem' } }}>{value}</Typography></Box>;
}

function RouteLine() {
  return <Box sx={{ flex: '1 1 44px', minWidth: { xs: 20, sm: 44 }, borderTop: (theme) => `2px dashed ${alpha(theme.palette.primary.main, 0.45)}` }} />;
}

function Detail({ label, value, chip = false, wide = false }) {
  return <Grid item xs={12} sm={wide ? 12 : 6} md={wide ? 8 : 4} sx={{ minWidth: 0 }}><Typography variant="body2" color="text.secondary" fontWeight={800}>{label}</Typography>{chip ? <Box sx={{ mt: 0.5 }}><Chip label={value} sx={{ fontWeight: 800 }} /></Box> : <Typography variant="subtitle1" fontWeight={900} sx={{ overflowWrap: 'anywhere', lineHeight: 1.25 }}>{value}</Typography>}</Grid>;
}

function SummaryLine({ label, value }) {
  return <Stack direction="row" justifyContent="space-between" spacing={1}><Typography color="text.secondary">{label}</Typography><Typography fontWeight={900}>{value}</Typography></Stack>;
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

function getAvailabilityCopy(review, passengerCount) {
  const availableSeats = Number(review?.availableSeats ?? 0);
  const rawStatus = String(review?.availabilityStatus || '').trim();
  const normalizedStatus = rawStatus.toUpperCase();
  const likelyConfirmed = availableSeats >= passengerCount && !normalizedStatus.includes('WAIT') && !normalizedStatus.includes('WL') && !normalizedStatus.includes('RAC');
  const waitlistRisk = normalizedStatus.includes('WAIT') || normalizedStatus.includes('WL') || availableSeats <= 0;
  const shortLabel = likelyConfirmed ? 'Likely confirmed' : waitlistRisk ? 'Waitlist risk' : 'RAC/WL possible';
  const fallback = likelyConfirmed
    ? 'Confirmed seats appear available for all passengers. Final status is assigned by the booking service at confirmation.'
    : 'Confirmed seats are limited for this passenger count. RAC or waitlist may be assigned during final confirmation.';

  return {
    shortLabel,
    color: likelyConfirmed ? 'success' : waitlistRisk ? 'warning' : 'info',
    message: rawStatus || fallback
  };
}

function formatLabel(value) {
  return String(value).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
