import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CancelIcon from "@mui/icons-material/Cancel";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PrintIcon from "@mui/icons-material/Print";
import SearchIcon from "@mui/icons-material/Search";
import TrainIcon from "@mui/icons-material/Train";
import ScheduleIcon from "@mui/icons-material/Schedule";
import api from "../../services/api.js";
import BookingCancellationDialog, { canShowCancelButton } from "../../components/BookingCancellationDialog.jsx";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateFeedback.jsx";
import { RailwayStatusChip } from "../../components/RailwayStatusChip.jsx";
import { getApiErrorMessage } from "../../utils/apiErrors.js";
import { formatStatus, getBookingStatusLabel, getBookingStatusMessage, getQueueText } from "../../utils/bookingStatus.js";

export default function PnrPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pnr, setPnr] = useState(searchParams.get("pnr") || "");
  const [touched, setTouched] = useState(Boolean(searchParams.get("pnr")));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const searchedQueryRef = useRef("");
  const inputRef = useRef(null);
  const user = useSelector((state) => state.auth.user);

  const validationMessage = useMemo(() => validatePnr(pnr), [pnr]);
  const canTrack = !validationMessage && !loading;

  const search = useCallback(async (value, options = {}) => {
    const trimmedPnr = String(value || "").trim();
    const issue = validatePnr(trimmedPnr);
    setTouched(true);
    if (issue) { setError(""); setResult(null); return; }
    setError(""); setResult(null); setLoading(true);
    try {
      const { data } = await api.get(`/pnr/${trimmedPnr}`);
      setResult(data);
      searchedQueryRef.current = trimmedPnr;
      if (options.updateUrl !== false) setSearchParams({ pnr: trimmedPnr });
    } catch (apiError) {
      setResult(null);
      setError(apiError.response?.status === 404 ? "No booking found for this PNR." : getApiErrorMessage(apiError, "No booking found for this PNR."));
    } finally { setLoading(false); }
  }, [setSearchParams]);

  useEffect(() => {
    const queryPnr = searchParams.get("pnr");
    if (queryPnr && queryPnr !== searchedQueryRef.current) { setPnr(queryPnr); search(queryPnr, { updateUrl: false }); }
  }, [searchParams, search]);

  const clearSearch = () => { setPnr(""); setTouched(false); setResult(null); setError(""); setCancellationOpen(false); searchedQueryRef.current = ""; setSearchParams({}); setTimeout(() => inputRef.current?.focus(), 100); };
  const refreshCurrentPnr = () => { const currentPnr = result?.pnr || searchedQueryRef.current || pnr; if (currentPnr) search(currentPnr, { updateUrl: false }); };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        {/* Header */}
        <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, border: '1px solid', borderColor: 'var(--southrail-card-border)', boxShadow: 'var(--southrail-card-shadow)' }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ConfirmationNumberIcon color="primary" />
              <Box>
                <Typography variant="h5" fontWeight={800}>PNR Status</Typography>
                <Typography color="text.secondary">Track booking confirmation, passenger status, fare, and journey details.</Typography>
              </Box>
            </Stack>
            <Button component={Link} to="/" startIcon={<SearchIcon />} variant="outlined" sx={{ borderRadius: 2 }}>Back to Search</Button>
          </Stack>
        </Paper>

        {/* Search card */}
        <Card variant="outlined" sx={{ borderLeft: 4, borderLeftColor: 'primary.main', borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ConfirmationNumberIcon color="primary" />
                <Box>
                  <Typography variant="h6" fontWeight={800}>Track your ticket</Typography>
                  <Typography color="text.secondary">Enter your 10-digit PNR to view booking and journey status.</Typography>
                </Box>
              </Stack>
              <Stack component="form" direction={{ xs: "column", sm: "row" }} spacing={1.5} onSubmit={(event) => { event.preventDefault(); search(pnr); }}>
                  <TextField
                    fullWidth
                    label="10-digit PNR"
                    value={pnr}
                    onChange={(event) => { setPnr(event.target.value); setTouched(true); }}
                    inputRef={inputRef}
                    inputProps={{ inputMode: "numeric", maxLength: 10 }}
                  error={touched && Boolean(validationMessage)}
                  helperText={touched ? (validationMessage || "Enter 10-digit PNR number.") : " "}
                />
                <Button type="submit" variant="contained" startIcon={<SearchIcon />} disabled={!canTrack} sx={{ minWidth: { xs: "100%", sm: 120 }, borderRadius: 2, py: 1.2 }}>
                  {loading ? "Tracking..." : "Track"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {loading && <LoadingState message="Checking PNR status..." />}

        {!loading && error && (
          <ErrorState title={error.includes("No booking") ? "PNR not found" : "PNR lookup failed"} message={error}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button variant="contained" onClick={clearSearch} sx={{ borderRadius: 2 }}>Check another PNR</Button>
              <Button component={Link} to="/dashboard" startIcon={<DashboardIcon />} variant="outlined" sx={{ borderRadius: 2 }}>Go to Dashboard</Button>
            </Stack>
          </ErrorState>
        )}

        {!loading && !error && !result && (
          <EmptyState title="Enter your PNR" message="Enter your PNR to view journey status." />
        )}

        {!loading && !error && result && (
          <PnrResult result={result} onClear={clearSearch} onCancelBooking={() => setCancellationOpen(true)} canRequestCancellation={Boolean(user)} />
        )}

        <BookingCancellationDialog pnr={result?.pnr || pnr} open={cancellationOpen} onClose={() => setCancellationOpen(false)} onCancelled={refreshCurrentPnr} />
      </Stack>
    </Container>
  );
}

function PnrResult({ result, onClear, onCancelBooking, canRequestCancellation }) {
  const passengers = parsePassengerStatuses(result.passengerStatuses);
  const lifecycle = buildLifecycle(result);
  const showCancel = canRequestCancellation && result.pnr && canShowCancelButton(result.status);

  return (
    <Stack spacing={2.5}>
      {/* PNR header card */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: { xs: 2, md: 2.5 }, background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)}, ${alpha(theme.palette.primary.main, 0.02)})` }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>PNR NUMBER</Typography>
              <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: "1.6rem", sm: "2rem" }, fontFamily: 'monospace', letterSpacing: 1, overflowWrap: "anywhere" }}>
                {result.pnr || "-"}
              </Typography>
            </Box>
            <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
              <RailwayStatusChip status={result.status} size="small" />
              <Typography color="text.secondary" variant="caption" sx={{ maxWidth: 360 }}>{getBookingStatusMessage(result.status)}</Typography>
              <Typography fontWeight={800} variant="body2">Reservation: {getBookingStatusLabel(result.status, result.reservationLabel)}</Typography>
              {result.queuePosition && <Typography variant="caption" color="text.secondary">Queue position: {getQueueText(result.queuePosition)}</Typography>}
              {showCancel && <Button color="error" startIcon={<CancelIcon />} onClick={onCancelBooking} variant="outlined" size="small" sx={{ borderRadius: 2 }}>Cancel Booking</Button>}
            </Stack>
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5 }}>
          <Grid container spacing={1.5}>
            <Detail label="Train" value={`${result.trainName || "Train"} ${result.trainNumber ? `- ${result.trainNumber}` : ""}`} />
            <Detail label="From" value={formatStation(result.sourceCode, result.sourceName)} />
            <Detail label="To" value={formatStation(result.destinationCode, result.destinationName)} />
            <Detail label="Journey date" value={formatDate(result.journeyDate)} />
            <Detail label="Class" value={result.travelClass || "-"} />
            {result.quota && <Detail label="Quota" value={formatStatus(result.quota)} />}
            {result.totalFare !== null && result.totalFare !== undefined && <Detail label="Total fare" value={formatFare(result.totalFare)} />}
          </Grid>
        </Box>
      </Card>

      {/* Route strip */}
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TrainIcon color="primary" />
              <Typography variant="h6" fontWeight={800}>Journey route</Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ py: 1 }}>
              <Box sx={{ textAlign: 'center', px: 2.5, py: 1.5, borderRadius: 2, bgcolor: 'action.hover', minWidth: 90 }}>
                <Typography variant="caption" color="text.secondary">SOURCE</Typography>
                <Typography variant="h5" fontWeight={900}>{result.sourceCode || '-'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{result.sourceName || ''}</Typography>
              </Box>
              <Stack alignItems="center" spacing={0.3}>
                <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <ArrowForwardIcon color="primary" />
              </Stack>
              <Box sx={{ textAlign: 'center', px: 2.5, py: 1.5, borderRadius: 2, bgcolor: 'action.hover', minWidth: 90 }}>
                <Typography variant="caption" color="text.secondary">DESTINATION</Typography>
                <Typography variant="h5" fontWeight={900}>{result.destinationCode || '-'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{result.destinationName || ''}</Typography>
              </Box>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              Journey date: {formatDate(result.journeyDate)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <PassengerSection passengers={passengers} />
        </Grid>
        <Grid item xs={12} md={5}>
          <FareSection result={result} />
        </Grid>
        <Grid item xs={12}>
          <LifecycleSection lifecycle={lifecycle} />
        </Grid>
      </Grid>

      {/* Actions */}
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ "& .MuiButton-root": { width: { xs: "100%", sm: "auto" } } }}>
            <Button variant="contained" onClick={onClear} sx={{ borderRadius: 2 }}>Search another PNR</Button>
            <Button component={Link} to="/dashboard" startIcon={<DashboardIcon />} variant="outlined" sx={{ borderRadius: 2 }}>Go to Dashboard</Button>
            <Button component={Link} to="/" startIcon={<SearchIcon />} variant="outlined" sx={{ borderRadius: 2 }}>Back to Search</Button>
            <Button startIcon={<PrintIcon />} onClick={() => window.print()} variant="outlined" sx={{ borderRadius: 2 }}>Print details</Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function PassengerSection({ passengers }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>Passenger details</Typography>
        {passengers.length === 0 ? (
          <EmptyState title="Passenger details not available" message="Passenger status was not returned for this booking." />
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: "auto", "& table": { minWidth: 280 } }}>
            <Table size="small" aria-label="Passenger status table" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Passenger</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {passengers.map((passenger) => (
                  <TableRow key={`${passenger.name}-${passenger.status}`} sx={{ '&:hover': { bgcolor: 'action.hover' }, transition: 'background-color 150ms ease' }}>
                    <TableCell sx={{ overflowWrap: "anywhere" }}>{passenger.name}</TableCell>
                    <TableCell><RailwayStatusChip status={passenger.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

function FareSection({ result }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>Fare summary</Typography>
        <Stack spacing={1.5}>
          <SummaryLine label="Total fare" value={formatFare(result.totalFare)} strong />
          {Number(result.refundAmount || 0) > 0 && <SummaryLine label="Refund amount" value={formatFare(result.refundAmount)} />}
          <SummaryLine label="Booking status" value={<RailwayStatusChip status={result.status} />} />
          <SummaryLine label="Reservation" value={getBookingStatusLabel(result.status, result.reservationLabel)} />
          {result.queuePosition && <SummaryLine label="Queue position" value={getQueueText(result.queuePosition)} />}
        </Stack>
      </CardContent>
    </Card>
  );
}

function LifecycleSection({ lifecycle }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography variant="h6" fontWeight={800} gutterBottom>Booking lifecycle</Typography>
        <Grid container spacing={1.5}>
          {lifecycle.map((item) => (
            <Grid item xs={12} sm={4} key={item.label}>
              <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover', height: '100%' }}>
                <Typography fontWeight={900}>{item.label}</Typography>
                <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{item.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
      <Typography fontWeight={800} sx={{ overflowWrap: "anywhere" }}>{value || "-"}</Typography>
    </Grid>
  );
}

function SummaryLine({ label, value, strong }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
      <Typography color="text.secondary">{label}</Typography>
      {typeof value === "string" ? <Typography fontWeight={strong ? 900 : 800}>{value}</Typography> : value}
    </Stack>
  );
}

function validatePnr(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "PNR is required.";
  if (!/^\d+$/.test(trimmed)) return "PNR must contain digits only.";
  if (trimmed.length !== 10) return "PNR must be a 10-digit number.";
  return "";
}

function parsePassengerStatuses(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => {
    const value = String(item || "").trim();
    const separator = value.lastIndexOf(" - ");
    if (separator > 0) return { name: value.slice(0, separator), status: value.slice(separator + 3) };
    return { name: value || `Passenger ${index + 1}`, status: value || "UNKNOWN" };
  }).filter((item) => item.name);
}

function buildLifecycle(result) {
  const items = [
    { label: "PNR found", value: result.pnr || "-" },
    { label: "Current status", value: formatStatus(result.status) },
    { label: "Reservation", value: getBookingStatusLabel(result.status, result.reservationLabel) },
  ];
  if (result.journeyDate) items.push({ label: "Journey date", value: formatDate(result.journeyDate) });
  if (Number(result.refundAmount || 0) > 0) items.push({ label: "Refund amount", value: formatFare(result.refundAmount) });
  return items;
}

function formatStation(code, name) {
  if (code && name) return `${name} (${code})`;
  return code || name || "-";
}

function formatDate(value) { return value ? String(value) : "-"; }

function formatFare(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "\u20B9 -";
  return `\u20B9 ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
