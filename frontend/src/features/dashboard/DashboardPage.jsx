import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import TablePagination from '@mui/material/TablePagination';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  InputAdornment,
  MenuItem,
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
  Avatar,
  Skeleton,
  Divider,
  alpha
} from '@mui/material';
import { useTheme, lighten } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import CancelIcon from '@mui/icons-material/Cancel';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DirectionsRailwayIcon from '@mui/icons-material/DirectionsRailway';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaymentsIcon from '@mui/icons-material/Payments';
import RouteIcon from '@mui/icons-material/Route';
import SearchIcon from '@mui/icons-material/Search';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import TrainIcon from '@mui/icons-material/Train';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import api from '../../services/api.js';
import BookingCancellationDialog, { canShowCancelButton } from '../../components/BookingCancellationDialog.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateFeedback.jsx';
import { RailwayStatusChip, formatStatus } from '../../components/RailwayStatusChip.jsx';
import { getApiErrorMessage, isAuthError } from '../../utils/apiErrors.js';

// ─── Theme helpers ───────────────────────────────────────────────────────────
// SouthRail branding is expressed through the theme's primary/secondary palette
// (see AppThemeProvider). Components derive their colors from `theme` so the
// dashboard automatically adapts between Light Mode and Dark Mode.

// Returns 4 graduated "rail green" shades derived from theme.palette.primary,
// used for hero gradients, route accents, and ticket highlights.
function getGreenShades(theme) {
  const { main, dark, light } = theme.palette.primary;
  return {
    dark,
    main,
    mid: light,
    light: lighten(light, theme.palette.mode === 'light' ? 0.25 : 0.18)
  };
}

// Common set of surface/text tokens reused across dashboard sections.
function getDashboardTokens(theme) {
  const { palette } = theme;
  return {
    pageBg: palette.background.default,
    cardBg: palette.background.paper,
    raisedBg: palette.surface?.raised || palette.background.paper,
    elevatedBg: palette.surface?.elevated || palette.background.paper,
    cardBorder: palette.custom?.cardBorder || palette.divider,
    cardShadow: palette.custom?.cardShadow || theme.shadows[3],
    divider: palette.divider,
    textMain: palette.text.primary,
    textSub: palette.text.secondary,
    primary: palette.primary.main,
    primaryLight: palette.primary.light,
    primaryDark: palette.primary.dark,
    secondary: palette.secondary.main,
    secondaryLight: palette.secondary.light,
    success: palette.success.main,
    error: palette.error.main
  };
}

const initialFilters = { search: '', status: 'ALL' };

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const theme = useTheme();
  const user = useSelector((state) => state.auth.user);
  const [page, setPage] = useState(0);
const [rowsPerPage, setRowsPerPage] = useState(5);
  const [history, setHistory] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [loading, setLoading] = useState({ history: true, notifications: true });
  const [errors, setErrors] = useState({ history: '', notifications: '' });
  const [filters, setFilters] = useState(initialFilters);
  const [cancellationPnr, setCancellationPnr] = useState('');
  const [cancellationOpen, setCancellationOpen] = useState(false);

  useEffect(() => { loadDashboard(); }, [user]);

  const loadDashboard = () => {
    setLoading({ history: true, notifications: true });
    setErrors({ history: '', notifications: '' });
    setHistory(null);
    setNotifications(null);

    api.get('/bookings?page=0&size=20')
      .then(({ data }) => setHistory(normalizePage(data)))
      .catch((apiError) => {
        console.error('Booking history load failed', apiError);
        setHistory({ content: [] });
        setErrors((c) => ({ ...c, history: getDashboardErrorMessage(apiError, 'Unable to load booking history right now.') }));
      })
      .finally(() => setLoading((c) => ({ ...c, history: false })));

    api.get('/notifications?page=0&size=10')
      .then(({ data }) => setNotifications(normalizeRows(data)))
      .catch((apiError) => {
        console.error('Notifications load failed', apiError);
        setNotifications([]);
        setErrors((c) => ({ ...c, notifications: getDashboardErrorMessage(apiError, 'Unable to load notifications right now.') }));
      })
      .finally(() => setLoading((c) => ({ ...c, notifications: false })));
  };

  const openCancellation  = (pnr) => { setCancellationPnr(pnr || ''); setCancellationOpen(true); };
  const closeCancellation = ()    => setCancellationOpen(false);
  const handleCancelled   = ()    => loadDashboard();

  const bookings        = history?.content || [];
  const sortedBookings  = useMemo(() => sortBookings(bookings), [bookings]);
  const metrics         = useMemo(() => buildDashboardMetrics(sortedBookings), [sortedBookings]);
  const filteredBookings = useMemo(() => filterBookings(sortedBookings, filters), [sortedBookings, filters]);
  const paginatedBookings = filteredBookings.slice(
  page * rowsPerPage,
  page * rowsPerPage + rowsPerPage
);
useEffect(() => {
  setPage(0);
}, [filters]);
  const upcomingBookings = metrics.upcomingBookings;

  const displayName = user?.fullName || 'Passenger';
  const displayEmail = user?.email || '';
  const roles = Array.from(user?.roles || []);
  const historyLoaded = !loading.history && !errors.history;
  const notificationsLoaded = !loading.notifications && !errors.notifications;

  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight: '100vh', pb: 6 }}>
      {/* Hero */}
      <HeroSection
        displayName={displayName}
        displayEmail={displayEmail}
        roles={roles}
        loading={loading.history}
        metrics={metrics}
        onRefresh={loadDashboard}
      />

      <Container maxWidth="xl" sx={{ mt: { xs: -3, md: -4 }, position: 'relative', zIndex: 1 }}>
        <Stack spacing={4}>
          {/* KPI strip */}
          {loading.history ? (
            <KpiSkeleton />
          ) : errors.history ? (
            <ErrorState title="Travel data unavailable" message={errors.history} actionLabel="Retry" onAction={loadDashboard} />
          ) : (
            <KpiStrip metrics={metrics} />
          )}

          {/* Next Journey + Insights */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <NextJourneySection
                loading={loading.history}
                error={errors.history}
                bookings={upcomingBookings}
                onRetry={loadDashboard}
                onCancelBooking={openCancellation}
              />
            </Grid>
            <Grid item xs={12} lg={4}>
              <TravelInsightsCard loading={loading.history} error={errors.history} metrics={metrics} />
            </Grid>
          </Grid>

          {/* Recent activity */}
          <RecentActivitySection bookings={sortedBookings} loading={loading.history} />

          {/* Booking history */}
          <BookingHistoryCard
            loading={loading.history}
            error={errors.history}
           rows={paginatedBookings}
            allRows={sortedBookings}
            filters={filters}
            setFilters={setFilters}
            statusOptions={metrics.statusOptions}
            historyLoaded={historyLoaded}
            onRetry={loadDashboard}
            action={
  <Button
    component={Link}
    to="/bookings"
    variant="outlined"
    size="small"
  >
    View All
  </Button>
}
            onCancelBooking={openCancellation}
          />
          <TablePagination
  component="div"
  count={filteredBookings.length}
  page={page}
  onPageChange={(event, newPage) => setPage(newPage)}
  rowsPerPage={rowsPerPage}
  onRowsPerPageChange={(event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }}
  rowsPerPageOptions={[5, 10, 20, 50]}
/>

          {/* Notifications */}
          <NotificationsCard
            loading={loading.notifications}
            error={errors.notifications}
            notifications={notifications || []}
            notificationsLoaded={notificationsLoaded}
            onRetry={loadDashboard}
          />
        </Stack>
      </Container>

      <BookingCancellationDialog
        pnr={cancellationPnr}
        open={cancellationOpen}
        onClose={closeCancellation}
        onCancelled={handleCancelled}
      />
    </Box>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection({ displayName, displayEmail, roles, loading, metrics, onRefresh }) {
  const theme = useTheme();
  const greens = getGreenShades(theme);
  const initial = displayName?.[0]?.toUpperCase() || 'P';

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${greens.dark} 0%, ${greens.main} 60%, ${greens.mid} 100%)`,
        pt: { xs: 4, md: 5 },
        pb: { xs: 6, md: 7 },
        px: { xs: 2, md: 0 },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Track lines decoration */}
      <Box sx={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 28,
        backgroundImage: `repeating-linear-gradient(90deg, ${alpha('#fff', 0.07)} 0px, ${alpha('#fff', 0.07)} 40px, transparent 40px, transparent 80px)`,
        borderTop: `3px solid ${alpha('#fff', 0.12)}`,
      }} />
      {/* Subtle circle glow */}
      <Box sx={{
        position: 'absolute', top: -80, right: -80, width: 380, height: 380,
        borderRadius: '50%', bgcolor: alpha(greens.light, 0.12), pointerEvents: 'none',
      }} />

      <Container maxWidth="xl">
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
        >
          {/* Left: Identity */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
            <Avatar
              sx={{
                width: 72, height: 72,
                bgcolor: alpha('#ffffff', 0.92), color: greens.dark,
                fontSize: 28, fontWeight: 900, border: `3px solid ${alpha('#fff', 0.3)}`,
                flexShrink: 0,
              }}
            >
              {initial}
            </Avatar>
            <Box>
              <Typography
                sx={{ color: alpha('#fff', 0.65), fontSize: 13, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', mb: 0.25 }}
              >
                Welcome back
              </Typography>
              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 900, lineHeight: 1.15 }}>
                {displayName}
              </Typography>
              <Typography sx={{ color: alpha('#fff', 0.6), fontSize: 14, mt: 0.25 }}>{displayEmail}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}
  justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                {roles.map((role) => (
                  <Chip
                    key={role}
                    size="small"
                    label={String(role).replace('ROLE_', '')}
                    sx={{ bgcolor: alpha('#fff', 0.15), color: '#fff', borderColor: alpha('#fff', 0.3), fontWeight: 700, fontSize: 11 }}
                    variant="outlined"
                  />
                ))}
              </Stack>
            </Box>
          </Stack>

          {/* Right: Hero stats + CTAs */}
          <Stack spacing={2} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
            <Stack
  direction="row"
  spacing={3}
  flexWrap="wrap"
  justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
>
  <HeroStat
    label="Total Trips"
    value={loading ? '—' : metrics.totalBookings}
  />

  <HeroStat
    label="Upcoming"
    value={loading ? '—' : metrics.upcomingCount}
    highlightColor={greens.light}
  />

  <HeroStat
    label="Confirmed"
    value={loading ? '—' : metrics.confirmedCount}
  />

  <HeroStat
    label="Cancelled"
    value={loading ? '—' : metrics.cancelledCount}
  />

  {metrics.hasFareData && !loading && (
    <HeroStat
      label="Total Spend"
      value={formatFare(metrics.totalSpend)}
    />
  )}
</Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component={Link} to="/"
                variant="contained"
                startIcon={<SearchIcon />}
                sx={{
                  bgcolor: '#ffffff', color: greens.dark, fontWeight: 800,
                  '&:hover': { bgcolor: alpha('#ffffff', 0.9) },
                  px: 3, borderRadius: 2,
                }}
              >
                Search Trains
              </Button>
              <Button
                component={Link} to="/pnr"
                startIcon={<ConfirmationNumberIcon />}
                sx={{
                  borderColor: alpha('#fff', 0.45), color: '#fff',
                  '&:hover': { borderColor: '#fff', bgcolor: alpha('#fff', 0.08) },
                  px: 3, borderRadius: 2,
                }}
                variant="outlined"
              >
                Track PNR
              </Button>
              <Button
                onClick={onRefresh}
                startIcon={<RefreshIcon />}
                sx={{
                  color: alpha('#fff', 0.7), borderColor: alpha('#fff', 0.25),
                  '&:hover': { borderColor: alpha('#fff', 0.5), bgcolor: alpha('#fff', 0.06) },
                  borderRadius: 2,
                }}
                variant="outlined"
                size="small"
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

function HeroStat({ label, value, highlightColor }) {
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Typography sx={{ color: highlightColor || '#fff', fontWeight: 900, fontSize: { xs: 22, md: 28 }, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ color: alpha('#fff', 0.55), fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', mt: 0.3 }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function buildKpiCards(metrics, t, greens) {
  return [
    { label: 'Total Bookings', value: metrics.totalBookings,  icon: <ConfirmationNumberIcon />, color: t.primary },
    { label: 'Upcoming Trips', value: metrics.upcomingCount,  icon: <TravelExploreIcon />,      color: greens.mid },
    { label: 'Confirmed',      value: metrics.confirmedCount, icon: <CheckCircleIcon />,        color: greens.light },
    { label: 'Cancelled',      value: metrics.cancelledCount, icon: <CancelIcon />,             color: t.error },
    { label: 'Completed',      value: metrics.completedCount, icon: <DirectionsRailwayIcon />,  color: greens.dark },
    { label: 'Total Spend',    value: metrics.hasFareData ? formatFare(metrics.totalSpend) : 'Rs 0', icon: <CurrencyRupeeIcon />, color: t.secondary }
  ];
}

function KpiStrip({ metrics }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  const greens = getGreenShades(theme);

  if (metrics.totalBookings === 0) {
    return (
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1.5px dashed ${t.cardBorder}`, textAlign: 'center' }}>
        <TrainIcon sx={{ fontSize: 40, color: alpha(t.primary, 0.3), mb: 1 }} />
        <Typography fontWeight={700} color={t.textMain}>No travel statistics yet</Typography>
        <Typography color={t.textSub} variant="body2">Book your first journey to see summaries here.</Typography>
      </Paper>
    );
  }
  return (
    <Grid container spacing={2}>
      {buildKpiCards(metrics, t, greens).map((card) => (
        <Grid item xs={6} sm={4} md={2} key={card.label}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 1.5 }, borderRadius: 3, bgcolor: t.raisedBg,
              border: `1.5px solid ${t.cardBorder}`,
              transition: 'box-shadow 0.2s, transform 0.2s',
              height: '100%',
              '&:hover': { boxShadow: t.cardShadow, transform: 'translateY(-2px)' },
            }}
          >
            <Stack spacing={1.5}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: 2,
                  bgcolor: alpha(card.color, 0.1), color: card.color,
                  display: 'grid', placeItems: 'center',
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography sx={{ color: t.textSub, fontSize: { xs: 11, md: 10 }, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', lineHeight: 1.2 }}>
                  {card.label}
                </Typography>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 22 }, color: t.textMain, lineHeight: 1.1, mt: 0.5, wordBreak: 'break-word' }}>
                  {card.value}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

function KpiSkeleton() {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <Grid container spacing={2}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Grid item xs={6} sm={4} md={2} key={i}>
          <Paper elevation={0} sx={{ p: { xs: 2, md: 1.5 }, borderRadius: 3, border: `1.5px solid ${t.cardBorder}`, height: '100%' }}>
            <Skeleton variant="rounded" width={36} height={36} sx={{ mb: 1.5, borderRadius: 2 }} />
            <Skeleton width="70%" height={12} sx={{ mb: 0.5 }} />
            <Skeleton width="50%" height={26} />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

// ─── Next Journey (ticket-style) ─────────────────────────────────────────────
function NextJourneySection({ loading, error, bookings, onRetry, onCancelBooking }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  const next = bookings?.[0];

  return (
    <SectionCard title="Next Journey" subtitle="Your upcoming reservation" icon={<TrainIcon sx={{ color: t.primary }} />}>
      {loading && <JourneySkeleton />}
      {!loading && error && <ErrorState title="Bookings unavailable" message={error} actionLabel="Retry" onAction={onRetry} />}
      {!loading && !error && !next && (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <TrainIcon sx={{ fontSize: 56, color: alpha(t.primary, 0.18), mb: 1.5 }} />
          <Typography fontWeight={700} color={t.textMain} gutterBottom>No upcoming trips</Typography>
          <Typography color={t.textSub} variant="body2" sx={{ mb: 2 }}>Search trains and book your next adventure.</Typography>
          <Button component={Link} to="/" variant="contained" startIcon={<SearchIcon />}
            sx={{ bgcolor: t.primary, color: theme.palette.primary.contrastText, '&:hover': { bgcolor: t.primaryDark }, borderRadius: 2 }}>
            Search Trains
          </Button>
        </Box>
      )}
      {!loading && !error && next && (
        <Stack spacing={2}>
          <TicketCard booking={next} onCancelBooking={onCancelBooking} featured />
          {bookings.slice(1, 3).map((b) => (
            <TicketCard key={b.id || b.pnr} booking={b} onCancelBooking={onCancelBooking} />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

function TicketCard({ booking, onCancelBooking, featured }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  const greens = getGreenShades(theme);
  const showCancel = booking.pnr && canShowCancelButton(booking.status);
  const src  = booking.sourceCode || booking.sourceName || '—';
  const dest = booking.destinationCode || booking.destinationName || '—';

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: featured ? `2px solid ${t.primary}` : `1.5px solid ${t.cardBorder}`,
        boxShadow: featured
  ? `0 10px 30px ${alpha(t.primary, 0.18)}`
  : 'none',
        bgcolor: featured ? alpha(t.primary, 0.04) : t.raisedBg,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top stripe */}
      {featured && (
        <Box sx={{ height: 4, background: `linear-gradient(90deg, ${greens.dark}, ${greens.mid})` }} />
      )}
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        {/* Train name + status */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Box>
            {featured && (
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.primary, letterSpacing: 1, textTransform: 'uppercase', mb: 0.25 }}>
                Next departure
              </Typography>
            )}
            <Typography variant="h6" fontWeight={900} color={t.textMain} sx={{ lineHeight: 1.2 }}>
              {booking.trainName || 'Train'}
            </Typography>
            <Typography variant="body2" color={t.textSub}>{booking.trainNumber || ''}</Typography>
          </Box>
          <RailwayStatusChip status={booking.status} />
        </Stack>

        {/* Route visual */}
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography fontWeight={900} fontSize={18} color={t.textMain}>{src}</Typography>
            <Typography fontSize={10} color={t.textSub} textTransform="uppercase" letterSpacing={0.5}>Origin</Typography>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FiberManualRecordIcon sx={{ fontSize: 8, color: t.primary }} />
            <Box sx={{ flex: 1, height: 2, bgcolor: t.divider, borderRadius: 1, position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: -3, left: '50%', transform: 'translateX(-50%)' }}>
                <TrainIcon sx={{ fontSize: 14, color: t.primary }} />
              </Box>
            </Box>
            <FiberManualRecordIcon sx={{ fontSize: 8, color: t.primary }} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography fontWeight={900} fontSize={18} color={t.textMain}>{dest}</Typography>
            <Typography fontSize={10} color={t.textSub} textTransform="uppercase" letterSpacing={0.5}>Destination</Typography>
          </Box>
        </Stack>

        {/* Meta row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Stack direction="row" spacing={2}>
            <MetaItem label="Date"   value={formatDate(booking.journeyDate)} />
            <MetaItem label="PNR"    value={booking.pnr || '—'} />
            <MetaItem label="Fare"   value={formatFare(booking.totalFare)} bold />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              component={Link} to={`/pnr?pnr=${booking.pnr || ''}`}
              size="small" startIcon={<ConfirmationNumberIcon />}
              disabled={!booking.pnr}
              sx={{ borderRadius: 2, borderColor: t.primary, color: t.primary, '&:hover': { bgcolor: alpha(t.primary, 0.07) } }}
              variant="outlined"
            >
              Track
            </Button>
            {showCancel && (
              <Button size="small" color="error" startIcon={<CancelIcon />}
                sx={{ borderRadius: 2 }} variant="outlined"
                onClick={() => onCancelBooking(booking.pnr)}>
                Cancel
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}

function MetaItem({ label, value, bold }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <Box>
      <Typography sx={{ fontSize: 10, color: t.textSub, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, fontWeight: bold ? 900 : 700, color: bold ? t.primary : t.textMain }}>{value}</Typography>
    </Box>
  );
}

function JourneySkeleton() {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <Box sx={{ borderRadius: 3, border: `1.5px solid ${t.cardBorder}`, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" height={4} />
      <Box sx={{ p: 2.5 }}>
        <Skeleton width="40%" height={14} sx={{ mb: 0.5 }} />
        <Skeleton width="60%" height={28} sx={{ mb: 1.5 }} />
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
          <Skeleton width={48} height={36} />
          <Box sx={{ flex: 1 }}><Skeleton height={8} /></Box>
          <Skeleton width={48} height={36} />
        </Stack>
        <Stack direction="row" spacing={2}><Skeleton width={60} height={36} /><Skeleton width={60} height={36} /><Skeleton width={60} height={36} /></Stack>
      </Box>
    </Box>
  );
}

// ─── Travel Insights ──────────────────────────────────────────────────────────
function TravelInsightsCard({ loading, error, metrics }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <SectionCard title="Travel Insights" subtitle="Based on your booking history" icon={<TrendingUpIcon sx={{ color: t.primary }} />}>
      {loading && (
        <Stack spacing={1.5}>{[1,2,3,4].map(i => <Skeleton key={i} height={54} sx={{ borderRadius: 2 }} variant="rectangular" />)}</Stack>
      )}
      {!loading && error && <ErrorState title="Insights unavailable" message={error} />}
      {!loading && !error && metrics.totalBookings === 0 && (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <TrendingUpIcon sx={{ fontSize: 44, color: alpha(t.primary, 0.18), mb: 1 }} />
          <Typography color={t.textSub} variant="body2">Route insights appear after your first booking.</Typography>
        </Box>
      )}
      {!loading && !error && metrics.totalBookings > 0 && (
        <Stack spacing={1.5}>
          <InsightRow icon={<RouteIcon />}      label="Top route"    value={metrics.mostBookedRoute?.label || '—'}    sub={metrics.mostBookedRoute ? `${metrics.mostBookedRoute.count} trips` : ''} />
          <InsightRow icon={<StarIcon />}        label="Fav. train"  value={metrics.mostTravelledTrain?.label || '—'} sub={metrics.mostTravelledTrain ? `${metrics.mostTravelledTrain.count} trips` : ''} />
          <InsightRow icon={<CheckCircleIcon />} label="Confirmed"   value={metrics.confirmedCount}   />
          <InsightRow icon={<CancelOutlinedIcon />} label="Cancelled" value={metrics.cancelledCount}  />
          {metrics.hasFareData && (
            <InsightRow icon={<CurrencyRupeeIcon />} label="Total spent" value={formatFare(metrics.totalSpend)} highlight />
          )}
        </Stack>
      )}
    </SectionCard>
  );
}

function InsightRow({ icon, label, value, sub, highlight }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5,
      p: 1.5, borderRadius: 2, bgcolor: highlight ? alpha(t.primary, 0.06) : alpha(t.divider, 0.5),
      border: highlight ? `1.5px solid ${alpha(t.primary, 0.2)}` : '1.5px solid transparent',
    }}>
      <Box sx={{ color: highlight ? t.primary : t.textSub, display: 'flex', flexShrink: 0, fontSize: 18 }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 11, color: t.textSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Typography>
        <Typography sx={{ fontWeight: 800, color: t.textMain, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</Typography>
        {sub && <Typography sx={{ fontSize: 11, color: t.textSub }}>{sub}</Typography>}
      </Box>
    </Box>
  );
}

// ─── Recent Activity ──────────────────────────────────────────────────────────
function RecentActivitySection({ bookings, loading }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  const activities = useMemo(() => buildActivity(bookings, t), [bookings, t]);

  if (loading) return null;
  if (activities.length === 0) return null;

  return (
    <SectionCard title="Recent Activity" subtitle="Latest booking events on your account" icon={<HistoryIcon sx={{ color: t.primary }} />}>
      <Stack spacing={0}>
        {activities.map((item, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
            {/* Timeline spine */}
            {idx < activities.length - 1 && (
              <Box sx={{
                position: 'absolute', left: 17, top: 36, bottom: 0, width: 2,
                bgcolor: t.divider, zIndex: 0,
              }} />
            )}
            {/* Dot */}
            <Box sx={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0, zIndex: 1,
              bgcolor: alpha(item.color, 0.12), color: item.color,
              display: 'grid', placeItems: 'center', fontSize: 16, mt: 1,
            }}>
              {item.icon}
            </Box>
            <Box sx={{ pb: 2.5, flex: 1 }}>
              <Typography fontWeight={800} fontSize={14} color={t.textMain}>{item.title}</Typography>
              <Typography fontSize={13} color={t.textSub}>{item.detail}</Typography>
              <Typography fontSize={11} color={t.textSub} sx={{ mt: 0.25 }}>{item.time}</Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </SectionCard>
  );
}

function buildActivity(bookings, t) {
  return bookings.slice(0, 5).map((b) => {
    const status = normalizeStatus(b.status);
    const isCancelled = status === 'CANCELLED';
    const isConfirmed = status === 'CONFIRMED';
    return {
      title: isCancelled ? 'Booking cancelled' : isConfirmed ? 'Booking confirmed' : 'Booking created',
      detail: `${b.trainName || 'Train'} · ${formatRoute(b)}`,
      time: b.createdAt ? formatDateTime(b.createdAt) : formatDate(b.journeyDate),
      icon: isCancelled ? <CancelOutlinedIcon fontSize="small" /> : isConfirmed ? <CheckCircleIcon fontSize="small" /> : <AddCircleOutlineIcon fontSize="small" />,
      color: isCancelled ? t.error : isConfirmed ? t.primary : t.secondary,
    };
  });
}

// ─── Booking History ──────────────────────────────────────────────────────────
function BookingHistoryCard({
  loading,
  error,
  rows,
  allRows,
  filters,
  setFilters,
  statusOptions,
  historyLoaded,
  onRetry,
  onCancelBooking,
  action
}){
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <SectionCard
      title="Booking History"
      subtitle="Search reservations by PNR, train, route, or status"
      icon={<HistoryIcon sx={{ color: t.primary }} />}
     action={
  <Stack direction="row" spacing={1}>
    {action}

    <Button
      component={Link}
      to="/pnr"
      startIcon={<ConfirmationNumberIcon />}
      variant="outlined"
      size="small"
      sx={{
        borderRadius: 2,
        borderColor: t.primary,
        color: t.primary,
        '&:hover': {
          bgcolor: alpha(t.primary, 0.07)
        }
      }}
    >
      Track PNR
    </Button>
  </Stack>
}
    >
      {loading && <LoadingState message="Loading booking history..." />}
      {!loading && error && <ErrorState title="Booking history unavailable" message={error} actionLabel="Retry" onAction={onRetry} />}
      {historyLoaded && (
        <Stack spacing={2.5}>
          {/* Filters */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              fullWidth size="small" label="Search by PNR, train, or route"
              value={filters.search}
              onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: t.textSub }} /></InputAdornment>,
                sx: { borderRadius: 2 },
              }}
            />
            <TextField
              select size="small" label="Status" value={filters.status}
              onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}
              sx={{ minWidth: { xs: '100%', sm: 180 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="ALL">All statuses</MenuItem>
              {statusOptions.map((s) => <MenuItem key={s} value={s}>{formatStatus(s)}</MenuItem>)}
            </TextField>
          </Stack>

          {allRows.length === 0 && (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <ConfirmationNumberIcon sx={{ fontSize: 48, color: alpha(t.primary, 0.2), mb: 1 }} />
              <Typography fontWeight={700} color={t.textMain} gutterBottom>No bookings yet</Typography>
              <Typography color={t.textSub} variant="body2">Search trains and book your first journey.</Typography>
            </Box>
          )}
          {allRows.length > 0 && rows.length === 0 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 40, color: alpha(t.primary, 0.2), mb: 1 }} />
              <Typography color={t.textSub} variant="body2">No bookings match your search.</Typography>
            </Box>
          )}
          {rows.length > 0 && <BookingHistoryTable rows={rows} onCancelBooking={onCancelBooking} />}
        </Stack>
      )}
    </SectionCard>
  );
}

function BookingHistoryTable({ rows, onCancelBooking }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, border: `1.5px solid ${t.cardBorder}`, overflowX: 'auto' }}>
      <Table size="small" aria-label="Booking history table">
        <TableHead>
          <TableRow sx={{ bgcolor: alpha(t.primary, 0.04) }}>
            {['PNR', 'Train', 'Route', 'Journey date', 'Status', 'Fare', 'Actions'].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 800, color: t.textMain, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${t.divider}` }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((booking) => (
            <TableRow
              key={booking.id || booking.pnr}
              hover
              sx={{ '&:hover': { bgcolor: alpha(t.primary, 0.03) }, '&:last-child td': { borderBottom: 0 } }}
            >
              <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 700, color: t.primary, fontSize: 13 }}>{booking.pnr || '—'}</TableCell>
              <TableCell sx={{ minWidth: 170 }}>
                <Typography fontWeight={800} fontSize={14} color={t.textMain}>{booking.trainName || 'Train'}</Typography>
                <Typography color={t.textSub} variant="body2">{booking.trainNumber || '—'}</Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 150, fontSize: 13, color: t.textMain }}>{formatRoute(booking)}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 13, color: t.textMain }}>{formatDate(booking.journeyDate)}</TableCell>
              <TableCell><RailwayStatusChip status={booking.status} /></TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: 13, color: t.textMain }}>{formatFare(booking.totalFare)}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.75}>
                  <Button
                    component={Link} to={`/pnr?pnr=${booking.pnr || ''}`}
                    size="small" disabled={!booking.pnr}
                    sx={{ borderRadius: 1.5, fontSize: 12, borderColor: t.primary, color: t.primary, '&:hover': { bgcolor: alpha(t.primary, 0.07) } }}
                    variant="outlined"
                  >
                    Track
                  </Button>
                  {booking.pnr && canShowCancelButton(booking.status) && (
                    <Button size="small" color="error" startIcon={<CancelIcon />}
                      sx={{ borderRadius: 1.5, fontSize: 12 }} variant="outlined"
                      onClick={() => onCancelBooking(booking.pnr)}>
                      Cancel
                    </Button>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotificationsCard({ loading, error, notifications, notificationsLoaded, onRetry }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <SectionCard title="Notifications" subtitle="Booking and travel updates from SouthRail" icon={<NotificationsIcon sx={{ color: t.primary }} />}>
      {loading && (
        <Stack spacing={1.5}>
          {[1,2,3].map(i => <Skeleton key={i} height={64} sx={{ borderRadius: 2 }} variant="rectangular" />)}
        </Stack>
      )}
      {!loading && error && <ErrorState title="Notifications unavailable" message={error} actionLabel="Retry" onAction={onRetry} />}
      {notificationsLoaded && notifications.length === 0 && (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 48, color: alpha(t.primary, 0.18), mb: 1 }} />
          <Typography fontWeight={700} color={t.textMain} gutterBottom>All caught up</Typography>
          <Typography color={t.textSub} variant="body2">Booking and travel updates will appear here.</Typography>
        </Box>
      )}
      {notificationsLoaded && notifications.length > 0 && (
        <Stack spacing={1}>
          {notifications.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex', gap: 1.5, p: 1.75, borderRadius: 2.5,
                bgcolor: item.read ? 'transparent' : alpha(t.primary, 0.05),
                border: `1.5px solid ${item.read ? t.divider : alpha(t.primary, 0.2)}`,
                transition: 'background 0.15s',
              }}
            >
              <Box
                sx={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, mt: 0.75,
                  bgcolor: item.read ? 'transparent' : t.primary,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={0.5}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 0.25 }}>
                      {item.channel && (
                        <Chip size="small" label={item.channel}
                          sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: alpha(t.primary, 0.1), color: t.primary }} />
                      )}
                      <Typography fontWeight={800} fontSize={13} color={t.textMain}>{item.title || 'Notification'}</Typography>
                    </Stack>
                    <Typography fontSize={13} color={t.textSub} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.message || '—'}
                    </Typography>
                  </Box>
                  <Typography fontSize={11} color={t.textSub} sx={{ flexShrink: 0, mt: { xs: 0, sm: 0.25 } }}>
                    {item.createdAt ? formatDateTime(item.createdAt) : ''}
                  </Typography>
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}

// ─── Shared SectionCard ───────────────────────────────────────────────────────
function SectionCard({ title, subtitle, icon, action, children }) {
  const theme = useTheme();
  const t = getDashboardTokens(theme);
  return (
    <Paper
      elevation={0}
      sx={{
        bgcolor: t.cardBg, borderRadius: 3,
        border: `1.5px solid ${t.cardBorder}`,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 2.5 }, pb: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            {icon}
            <Box>
              <Typography variant="h6" fontWeight={900} color={t.textMain} sx={{ lineHeight: 1.2 }}>{title}</Typography>
              {subtitle && <Typography variant="body2" color={t.textSub}>{subtitle}</Typography>}
            </Box>
          </Stack>
          {action}
        </Stack>
        <Divider sx={{ mb: 2, borderColor: t.divider }} />
        {children}
      </Box>
    </Paper>
  );
}

// ─── Business logic (unchanged) ───────────────────────────────────────────────
function buildDashboardMetrics(bookings) {
  const today = new Date().toISOString().slice(0, 10);
  const upcomingBookings = bookings
    .filter((b) => b.journeyDate >= today && normalizeStatus(b.status) !== 'CANCELLED')
    .sort((a, b) => String(a.journeyDate || '').localeCompare(String(b.journeyDate || '')));
  const confirmedCount = bookings.filter((b) => normalizeStatus(b.status) === 'CONFIRMED').length;
  const cancelledCount = bookings.filter((b) => normalizeStatus(b.status) === 'CANCELLED').length;
  const completedCount = bookings.filter((b) => b.journeyDate < today && !['CANCELLED', 'FAILED'].includes(normalizeStatus(b.status))).length;
  const fareValues = bookings.map((b) => Number(b.totalFare)).filter(Number.isFinite);
  const totalSpend = fareValues.reduce((sum, v) => sum + v, 0);
  const statusOptions = Array.from(new Set(bookings.map((b) => normalizeStatus(b.status)).filter(Boolean))).sort();
  return {
    totalBookings: bookings.length, upcomingBookings, upcomingCount: upcomingBookings.length,
    confirmedCount, cancelledCount, completedCount,
    hasFareData: fareValues.length > 0, totalSpend, statusOptions,
    mostBookedRoute: topBookingGroup(bookings, formatRoute),
    mostTravelledTrain: topBookingGroup(bookings, (b) => b.trainNumber ? `${b.trainNumber} – ${b.trainName || 'Train'}` : ''),
  };
}
function topBookingGroup(bookings, getKey) {
  const counts = bookings.reduce((cur, b) => { const k = getKey(b); if (!k) return cur; cur[k] = (cur[k] || 0) + 1; return cur; }, {});
  const [label, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return label ? { label, count } : null;
}
function filterBookings(bookings, filters) {
  const query = String(filters.search || '').trim().toLowerCase();
  return bookings.filter((b) => {
    const matchesQuery = !query || [b.pnr, b.trainNumber, b.trainName, b.sourceCode, b.sourceName, b.destinationCode, b.destinationName, b.status].some((v) => String(v || '').toLowerCase().includes(query));
    const matchesStatus = filters.status === 'ALL' || normalizeStatus(b.status) === filters.status;
    return matchesQuery && matchesStatus;
  });
}
function sortBookings(bookings) {
  return [...bookings].sort((a, b) => {
    if (a.createdAt || b.createdAt) return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    return String(b.journeyDate || '').localeCompare(String(a.journeyDate || ''));
  });
}
function normalizePage(data) {
  if (Array.isArray(data)) return { content: data };
  return data?.content ? data : { content: [] };
}
function normalizeRows(data) {
  if (Array.isArray(data)) return data;
  return data?.content || [];
}
function normalizeStatus(status) { return String(status || '').trim().toUpperCase(); }
function formatRoute(booking) {
  const src  = booking.sourceCode || booking.sourceName || '—';
  const dest = booking.destinationCode || booking.destinationName || '—';
  return `${src} to ${dest}`;
}
function formatDate(value) { return value ? String(value) : '—'; }
function formatDateTime(value) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch { return String(value); }
}
function formatFare(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Rs —';
  return `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function getDashboardErrorMessage(error, fallback) {
  if (isAuthError(error)) return 'Please login again to continue.';
  return getApiErrorMessage(error, fallback);
}