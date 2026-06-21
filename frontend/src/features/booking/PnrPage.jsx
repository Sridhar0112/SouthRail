import { useEffect, useMemo, useRef, useState } from "react";
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
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CancelIcon from "@mui/icons-material/Cancel";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PrintIcon from "@mui/icons-material/Print";
import SearchIcon from "@mui/icons-material/Search";
import TrainIcon from "@mui/icons-material/Train";
import api from "../../services/api.js";
import BookingCancellationDialog, {
  canShowCancelButton,
} from "../../components/BookingCancellationDialog.jsx";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/StateFeedback.jsx";
import {
  RailwayStatusChip,
  formatStatus,
} from "../../components/RailwayStatusChip.jsx";
import { getApiErrorMessage } from "../../utils/apiErrors.js";
import { getBookingStatusLabel, getBookingStatusMessage, getQueueText } from "../../utils/bookingStatus.js";

export default function PnrPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pnr, setPnr] = useState(searchParams.get("pnr") || "");
  const [touched, setTouched] = useState(Boolean(searchParams.get("pnr")));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const searchedQueryRef = useRef("");
  const user = useSelector((state) => state.auth.user);

  const validationMessage = useMemo(() => validatePnr(pnr), [pnr]);
  const canTrack = !validationMessage && !loading;

  const search = async (value = pnr, options = {}) => {
    const trimmedPnr = String(value || "").trim();
    const issue = validatePnr(trimmedPnr);
    setTouched(true);

    if (issue) {
      setError("");
      setResult(null);
      return;
    }

    setError("");
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.get(`/pnr/${trimmedPnr}`);
      setResult(data);
      searchedQueryRef.current = trimmedPnr;
      if (options.updateUrl !== false) {
        setSearchParams({ pnr: trimmedPnr });
      }
    } catch (apiError) {
      setResult(null);
      setError(
        apiError.response?.status === 404
          ? "No booking found for this PNR."
          : getApiErrorMessage(apiError, "No booking found for this PNR."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const queryPnr = searchParams.get("pnr");
    if (queryPnr && queryPnr !== searchedQueryRef.current) {
      setPnr(queryPnr);
      search(queryPnr, { updateUrl: false });
    }
  }, [searchParams]);

  const clearSearch = () => {
    setPnr("");
    setTouched(false);
    setResult(null);
    setError("");
    setCancellationOpen(false);
    searchedQueryRef.current = "";
    setSearchParams({});
  };

  const refreshCurrentPnr = () => {
    const currentPnr = result?.pnr || searchedQueryRef.current || pnr;
    if (currentPnr) {
      search(currentPnr, { updateUrl: false });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 1.5, md: 2.25 } }}>
      <Stack spacing={1.5}>
        <Paper sx={{ p: { xs: 1.25, md: 1.5 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography variant="h5" fontWeight={800}>
                PNR Status
              </Typography>
              <Typography color="text.secondary">
                Track booking confirmation, passenger status, fare, and journey
                details.
              </Typography>
            </Box>
            <Button component={Link} to="/" startIcon={<SearchIcon />}>
              Back to Search
            </Button>
          </Stack>
        </Paper>

        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <ConfirmationNumberIcon color="primary" />
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Track your ticket
                  </Typography>
                  <Typography color="text.secondary">
                    Enter your 10-digit PNR to view booking and journey status.
                  </Typography>
                </Box>
              </Stack>
              <Stack
                component="form"
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                onSubmit={(event) => {
                  event.preventDefault();
                  search();
                }}
              >
                <TextField
                  fullWidth
                  label="10-digit PNR"
                  value={pnr}
                  onChange={(event) => {
                    setPnr(event.target.value);
                    setTouched(true);
                  }}
                  inputProps={{ inputMode: "numeric", maxLength: 10 }}
                  error={touched && Boolean(validationMessage)}
                  helperText={
                    (touched && validationMessage) ||
                    "PNR must contain digits only."
                  }
                />
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchIcon />}
                  disabled={!canTrack}
                  sx={{ minWidth: { xs: "100%", sm: 100 } }}
                >
                  {loading ? "Tracking..." : "Track"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {loading && <LoadingState message="Checking PNR status..." />}

        {!loading && error && (
          <ErrorState
            title={
              error.includes("No booking")
                ? "PNR not found"
                : "PNR lookup failed"
            }
            message={error}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button variant="contained" onClick={clearSearch}>
                Check another PNR
              </Button>
              <Button
                component={Link}
                to="/dashboard"
                startIcon={<DashboardIcon />}
              >
                Go to Dashboard
              </Button>
            </Stack>
          </ErrorState>
        )}

        {!loading && !error && !result && (
          <EmptyState
            title="Enter your PNR"
            message="Enter your PNR to view journey status."
          />
        )}

        {!loading && !error && result && (
          <PnrResult
            result={result}
            onClear={clearSearch}
            onCancelBooking={() => setCancellationOpen(true)}
            canRequestCancellation={Boolean(user)}
          />
        )}

        <BookingCancellationDialog
          pnr={result?.pnr || pnr}
          open={cancellationOpen}
          onClose={() => setCancellationOpen(false)}
          onCancelled={refreshCurrentPnr}
        />
      </Stack>
    </Container>
  );
}

function PnrResult({
  result,
  onClear,
  onCancelBooking,
  canRequestCancellation,
}) {
  const passengers = parsePassengerStatuses(result.passengerStatuses);
  const lifecycle = buildLifecycle(result);
  const showCancel =
    canRequestCancellation && result.pnr && canShowCancelButton(result.status);

  return (
    <Stack spacing={1.5}>
      <Card>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography color="text.secondary">PNR</Typography>
              <Typography
                variant="h5"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "1.55rem", sm: "2rem" },
                  overflowWrap: "anywhere",
                }}
              >
                {result.pnr || "-"}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={800}
                sx={{ mt: 1, overflowWrap: "anywhere" }}
              >
                {result.trainName || "Train"}{" "}
                {result.trainNumber ? `- ${result.trainNumber}` : ""}
              </Typography>
            </Box>
            <Stack
              spacing={1}
              alignItems={{ xs: "flex-start", md: "flex-end" }}
            >
              <RailwayStatusChip status={result.status} size="small" />
              <Typography color="text.secondary" sx={{ maxWidth: 360 }}>{getBookingStatusMessage(result.status)}</Typography>
              <Typography fontWeight={800}>Reservation: {getBookingStatusLabel(result.status, result.reservationLabel)}</Typography>
              {result.queuePosition && <Typography color="text.secondary">Queue position: {getQueueText(result.queuePosition)}</Typography>}
              {showCancel && (
                <Button
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={onCancelBooking}
                >
                  Cancel Booking
                </Button>
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.5}>
            <Detail
              label="From"
              value={formatStation(result.sourceCode, result.sourceName)}
            />
            <Detail
              label="To"
              value={formatStation(
                result.destinationCode,
                result.destinationName,
              )}
            />
            <Detail
              label="Journey date"
              value={formatDate(result.journeyDate)}
            />
            <Detail label="Class" value={result.travelClass || "-"} />
            {result.quota && (
              <Detail label="Quota" value={formatStatus(result.quota)} />
            )}
            {result.totalFare !== null && result.totalFare !== undefined && (
              <Detail label="Total fare" value={formatFare(result.totalFare)} />
            )}
          </Grid>
        </CardContent>
      </Card>

      <RouteStrip result={result} />

      <Grid container spacing={1.5}>
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

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{
              "& .MuiButton-root": {
                width: { xs: "100%", sm: "auto" },
              },
            }}
          >
            <Button variant="contained" onClick={onClear}>
              Search another PNR
            </Button>
            <Button
              component={Link}
              to="/dashboard"
              startIcon={<DashboardIcon />}
            >
              Go to Dashboard
            </Button>
            <Button component={Link} to="/" startIcon={<SearchIcon />}>
              Back to Search
            </Button>
            <Button startIcon={<PrintIcon />} onClick={() => window.print()}>
              Print details
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

function RouteStrip({ result }) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TrainIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Journey route
              </Typography>
              <Typography color="text.secondary">
                {result.trainNumber || "-"} {result.trainName || ""}
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <StationBlock
              label="Source"
              code={result.sourceCode}
              name={result.sourceName}
            />
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                color: "text.secondary",
              }}
            >
              <ArrowForwardIcon />
            </Box>
            <StationBlock
              label="Destination"
              code={result.destinationCode}
              name={result.destinationName}
              align="right"
            />
          </Stack>
          <Typography color="text.secondary">
            Journey date: {formatDate(result.journeyDate)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

function StationBlock({ label, code, name, align = "left" }) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 1.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "action.hover",
        textAlign: { xs: "left", sm: align },
      }}
    >
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={900}>
        {code || "-"}
      </Typography>
      <Typography color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
        {name || "Station name not available"}
      </Typography>
    </Box>
  );
}

function PassengerSection({ passengers }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Passenger details
        </Typography>
        {passengers.length === 0 ? (
          <EmptyState
            title="Passenger details not available"
            message="Passenger status was not returned for this booking."
          />
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ overflowX: "auto" }}
          >
            <Table size="small" aria-label="Passenger status table">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Passenger</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {passengers.map((passenger) => (
                  <TableRow key={`${passenger.name}-${passenger.status}`}>
                    <TableCell sx={{ overflowWrap: "anywhere" }}>
                      {passenger.name}
                    </TableCell>
                    <TableCell>
                      <RailwayStatusChip status={passenger.status} />
                    </TableCell>
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
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Fare summary
        </Typography>
        <Stack spacing={1.5}>
          <SummaryLine
            label="Total fare"
            value={formatFare(result.totalFare)}
            strong
          />
          {Number(result.refundAmount || 0) > 0 && (
            <SummaryLine
              label="Refund amount"
              value={formatFare(result.refundAmount)}
            />
          )}
          <SummaryLine
            label="Booking status"
            value={<RailwayStatusChip status={result.status} />}
          />
          <SummaryLine label="Reservation" value={getBookingStatusLabel(result.status, result.reservationLabel)} />
          {result.queuePosition && <SummaryLine label="Queue position" value={getQueueText(result.queuePosition)} />}
        </Stack>
      </CardContent>
    </Card>
  );
}

function LifecycleSection({ lifecycle }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          Booking lifecycle
        </Typography>
        <Grid container spacing={1.5}>
          {lifecycle.map((item) => (
            <Grid item xs={12} sm={4} key={item.label}>
              <Box
                sx={{
                  p: 1.5,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "action.hover",
                  height: "100%",
                }}
              >
                <Typography fontWeight={900}>{item.label}</Typography>
                <Typography
                  color="text.secondary"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {item.value}
                </Typography>
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
      <Typography color="text.secondary">{label}</Typography>
      <Typography fontWeight={800} sx={{ overflowWrap: "anywhere" }}>
        {value || "-"}
      </Typography>
    </Grid>
  );
}

function SummaryLine({ label, value, strong }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      spacing={1}
    >
      <Typography color="text.secondary">{label}</Typography>
      {typeof value === "string" ? (
        <Typography fontWeight={strong ? 900 : 800}>{value}</Typography>
      ) : (
        value
      )}
    </Stack>
  );
}

function validatePnr(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "PNR is required.";
  }
  if (!/^\d+$/.test(trimmed)) {
    return "PNR must contain digits only.";
  }
  if (trimmed.length !== 10) {
    return "PNR must be a 10-digit number.";
  }
  return "";
}

function parsePassengerStatuses(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item, index) => {
      const value = String(item || "").trim();
      const separator = value.lastIndexOf(" - ");
      if (separator > 0) {
        return {
          name: value.slice(0, separator),
          status: value.slice(separator + 3),
        };
      }
      return {
        name: value || `Passenger ${index + 1}`,
        status: value || "UNKNOWN",
      };
    })
    .filter((item) => item.name);
}

function buildLifecycle(result) {
  const items = [
    { label: "PNR found", value: result.pnr || "-" },
    { label: "Current status", value: formatStatus(result.status) },
    { label: "Reservation", value: getBookingStatusLabel(result.status, result.reservationLabel) },
  ];
  if (result.journeyDate) {
    items.push({
      label: "Journey date",
      value: formatDate(result.journeyDate),
    });
  }
  if (Number(result.refundAmount || 0) > 0) {
    items.push({
      label: "Refund amount",
      value: formatFare(result.refundAmount),
    });
  }
  return items;
}

function formatStation(code, name) {
  if (code && name) {
    return `${name} (${code})`;
  }
  return code || name || "-";
}

function formatDate(value) {
  return value ? String(value) : "-";
}

function formatFare(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "Rs -";
  }
  return `Rs ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
