import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Typography
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import api from '../services/api.js';
import { RailwayStatusChip } from './RailwayStatusChip.jsx';
import { getApiErrorMessage } from '../utils/apiErrors.js';

export default function BookingCancellationDialog({ pnr, open, onClose, onCancelled }) {
  const [reviewLoading, setReviewLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let active = true;
    setReviewLoading(true);
    setReview(null);
    setError('');
    setSuccess(null);
    setCancelling(false);

    const trimmedPnr = String(pnr || '').trim();
    if (!trimmedPnr) {
      setReviewLoading(false);
      setError('Booking was not found.');
      return undefined;
    }

    api.get(`/bookings/${encodeURIComponent(trimmedPnr)}/cancellation-review`)
      .then(({ data }) => {
        if (active) {
          setReview(data);
        }
      })
      .catch((apiError) => {
        if (active) {
          console.error('Cancellation review failed', apiError);
          setError(getCancellationErrorMessage(apiError));
        }
      })
      .finally(() => {
        if (active) {
          setReviewLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, pnr]);

  const confirmCancellation = async () => {
    const trimmedPnr = String(pnr || '').trim();
    if (!trimmedPnr) {
      setError('Booking was not found.');
      return;
    }

    setCancelling(true);
    setError('');
    try {
      const { data } = await api.post(`/bookings/${encodeURIComponent(trimmedPnr)}/cancel`);
      setSuccess(data);
      onCancelled?.(data);
    } catch (apiError) {
      console.error('Cancellation failed', apiError);
      setError(getCancellationErrorMessage(apiError));
    } finally {
      setCancelling(false);
    }
  };

  const cancellable = Boolean(review?.cancellable) && !success;

  return (
    <Dialog open={open} onClose={cancelling ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cancel booking</DialogTitle>
      <DialogContent dividers>
        {reviewLoading && (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 2 }}>
            <CircularProgress size={24} />
            <Typography>Loading cancellation review...</Typography>
          </Stack>
        )}

        {!reviewLoading && error && (
          <Alert severity="error" sx={{ mb: review || success ? 2 : 0 }}>
            {error}
          </Alert>
        )}

        {!reviewLoading && success && (
          <Stack spacing={2}>
            <Alert severity="success">
              <Typography fontWeight={900}>Booking cancelled successfully.</Typography>
              <Typography>{success.message || 'Cancellation completed.'}</Typography>
            </Alert>
            <RefundHighlight label="Refund amount" value={formatMoney(success.refundAmount)} />
            <Grid container spacing={1.5}>
              <Detail label="PNR" value={success.pnr} />
              <Detail label="Status" value={<RailwayStatusChip status={success.status} />} />
              <Detail label="Cancellation charge" value={formatMoney(success.cancellationCharge)} />
              <Detail label="Refund percentage" value={formatPercentage(success.refundPercentage)} />
            </Grid>
          </Stack>
        )}

        {!reviewLoading && !success && review && (
          <Stack spacing={2}>
            <Alert severity={review.cancellable ? 'warning' : 'info'} icon={review.cancellable ? <WarningAmberIcon /> : undefined}>
              <Typography fontWeight={900}>{review.cancellable ? 'Review before cancelling' : 'Cancellation unavailable'}</Typography>
              <Typography>{review.message || 'Not available'}</Typography>
            </Alert>

            <Box>
              <Typography variant="h6" fontWeight={900}>{review.trainName || 'Not available'}</Typography>
              <Typography color="text.secondary">
                {formatTrainNumber(review.trainNumber)} · PNR {review.pnr || 'Not available'}
              </Typography>
            </Box>

            <Grid container spacing={1.5}>
              <Detail label="Route" value={formatRoute(review.sourceCode, review.destinationCode)} />
              <Detail label="Journey date" value={review.journeyDate || 'Not available'} />
              <Detail label="Class" value={review.travelClass || 'Not available'} />
              <Detail label="Current status" value={<RailwayStatusChip status={review.bookingStatus} />} />
            </Grid>

            <Divider />

            <RefundHighlight label="Refund amount" value={formatMoney(review.refundAmount)} />
            <Grid container spacing={1.5}>
              <Detail label="Total fare" value={formatMoney(review.totalFare)} />
              <Detail label="Cancellation charge" value={formatMoney(review.cancellationCharge)} />
              <Detail label="Refund percentage" value={formatPercentage(review.refundPercentage)} />
              <Detail label="Cancellable" value={review.cancellable ? 'Yes' : 'No'} />
            </Grid>

            {review.cancellable && (
              <Alert severity="warning">This action cannot be undone.</Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button startIcon={<CloseIcon />} onClick={onClose} disabled={cancelling}>
          Close
        </Button>
        {!success && (
          <Button
            variant="contained"
            color="error"
            startIcon={cancelling ? <CircularProgress size={18} color="inherit" /> : <CancelIcon />}
            onClick={confirmCancellation}
            disabled={!cancellable || cancelling || reviewLoading}
          >
            {cancelling ? 'Cancelling booking...' : 'Confirm cancellation'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export function canShowCancelButton(status) {
  const value = normalizeStatus(status);
  if (!value) {
    return false;
  }
  if (['CANCELLED', 'FAILED', 'REFUNDED', 'COMPLETED'].includes(value)) {
    return false;
  }
  return ['CONFIRMED', 'RAC', 'WAITLISTED'].includes(value);
}

function Detail({ label, value }) {
  return (
    <Grid item xs={12} sm={6}>
      <Typography color="text.secondary" variant="body2">{label}</Typography>
      {typeof value === 'string'
        ? <Typography fontWeight={800}>{value || 'Not available'}</Typography>
        : value}
    </Grid>
  );
}

function RefundHighlight({ label, value }) {
  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'success.main', borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography variant="body2" color="success.main">{label}</Typography>
      <Typography variant="h5" fontWeight={900}>{value}</Typography>
    </Box>
  );
}

function getCancellationErrorMessage(error) {
  if (!error?.response) {
    return getApiErrorMessage(error, 'Server is not reachable. Please make sure the backend is running.');
  }

  const status = error.response.status;
  if (status === 400) {
    return getApiErrorMessage(error, 'Unable to cancel this booking.');
  }
  if (status === 401) {
    return 'Please login again to continue.';
  }
  if (status === 403) {
    return 'You do not have permission to cancel this booking.';
  }
  if (status === 404) {
    return 'Booking was not found.';
  }
  if (status === 409) {
    return 'This booking cannot be cancelled because it is already cancelled or not eligible.';
  }
  if (status >= 500) {
    return 'Unable to cancel booking right now. Please try again later.';
  }
  return getApiErrorMessage(error, 'Unable to cancel this booking.');
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'Not available';
  }
  return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercentage(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return 'Not available';
  }
  return `${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
}

function formatRoute(sourceCode, destinationCode) {
  const source = sourceCode || 'Not available';
  const destination = destinationCode || 'Not available';
  return `${source} to ${destination}`;
}

function formatTrainNumber(trainNumber) {
  return trainNumber ? `Train ${trainNumber}` : 'Train number not available';
}

function normalizeStatus(status) {
  return String(status || '').trim().toUpperCase();
}
