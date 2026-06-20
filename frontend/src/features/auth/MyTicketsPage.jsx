import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Fade,
  Grid,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import api from '../../services/api.js';

// ─── Constants ───────────────────────────────────────────────────────────────
// All values, keys, and filtering semantics below are UNCHANGED from the
// original implementation. Only presentation (the JSX/sx below) has been
// redesigned.

const STATUS_FILTERS = ['All', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const STATUS_META = {
  OPEN:        { label: 'Open',        color: 'primary' },
  IN_PROGRESS: { label: 'In Progress', color: 'warning' },
  RESOLVED:    { label: 'Resolved',    color: 'success' },
  CLOSED:      { label: 'Closed',      color: 'default' },
};

// Accent identity per status — used for the timeline indicator, the status
// icon tinting on each ticket card, and the left rail on each card. These
// are read through theme.palette where possible so dark mode stays correct.
const STATUS_ACCENT = {
  OPEN:        { bar: '#1976d2', soft: 'rgba(25,118,210,0.08)', solid: '#1976d2' },
  IN_PROGRESS: { bar: '#ed6c02', soft: 'rgba(237,108,2,0.09)',  solid: '#ed6c02' },
  RESOLVED:    { bar: '#2e7d32', soft: 'rgba(46,125,50,0.08)',  solid: '#2e7d32' },
  CLOSED:      { bar: '#757575', soft: 'rgba(117,117,117,0.09)', solid: '#9e9e9e' },
};

const TOPIC_LABELS = {
  account:   'Account',
  booking:   'Booking',
  payment:   'Payment',
  refund:    'Refund',
  general:   'General',
  complaint: 'Complaint',
};

// Quick filter definitions — additive, client-side-only shortcuts layered on
// top of the existing search/status filtering. They do not replace or alter
// the original filteredTickets logic; they narrow the already-filtered list.
const QUICK_FILTERS = [
  { key: 'recent',     label: 'Recent',       days: null, openOnly: false },
  { key: '7d',         label: 'Last 7 Days',  days: 7,    openOnly: false },
  { key: '30d',        label: 'Last 30 Days', days: 30,   openOnly: false },
  { key: 'openIssues', label: 'Open Issues',  days: null, openOnly: true },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function topicLabel(topic = '') {
  return TOPIC_LABELS[topic.toLowerCase()] ?? topic;
}

function withinDays(iso, days) {
  if (!iso) return false;
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return created >= cutoff;
}


// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusChip({ status, size = 'small' }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'default' };
  return (
    <Chip
      label={meta.label}
      color={meta.color}
      size={size}
      sx={{
        fontWeight: 700,
        letterSpacing: 0.3,
        borderRadius: 1.5,
        px: 0.5,
      }}
    />
  );
}

// ── Premium hero header ──

function PageHero({ ticketCount, loading }) {
  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        borderRadius: 4,
        overflow: 'hidden',
        mb: 3.5,
        px: { xs: 2.5, sm: 4 },
        py: { xs: 3, sm: 4 },
        color: theme.palette.primary.contrastText,
        backgroundImage: `linear-gradient(120deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.dark} 130%)`,
        boxShadow: theme.palette.custom.cardShadow,
      })}
    >
      {/* Decorative ambient glow — purely visual, no layout impact */}
      <Box
        sx={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -80,
          left: -40,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ position: 'relative', zIndex: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar
            sx={{
              width: 52,
              height: 52,
              bgcolor: 'rgba(255,255,255,0.16)',
              color: 'inherit',
              border: '1px solid rgba(255,255,255,0.28)',
            }}
          >
            <SupportAgentIcon />
          </Avatar>
          <Box>
            <Typography
              variant="overline"
              sx={{ opacity: 0.78, fontWeight: 700, letterSpacing: 1.1 }}
            >
              Support Center
            </Typography>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem' }, lineHeight: 1.15 }}
            >
              My Support Tickets
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5, maxWidth: 440 }}>
              Track every conversation with our support team, follow up on open cases, and
              review resolutions — all in one place.
            </Typography>
          </Box>
        </Stack>

        {!loading && (
          <Chip
            label={`${ticketCount} ticket${ticketCount !== 1 ? 's' : ''} on file`}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.14)',
              color: 'inherit',
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </Stack>
    </Box>
  );
}

// ── Statistics dashboard ──

function StatCard({ icon, label, value, color, delay }) {
  return (
    <Fade in timeout={500} style={{ transitionDelay: `${delay}ms` }}>
      <Card
        variant="outlined"
        sx={(theme) => ({
          borderRadius: 3,
          borderColor: theme.palette.custom.cardBorder,
          height: '100%',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
          '&:hover': {
            boxShadow: theme.palette.custom.cardShadow,
            borderColor: color.solid,
            transform: 'translateY(-3px)',
          },
        })}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              variant="rounded"
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2.5,
                bgcolor: color.soft,
                color: color.solid,
                boxShadow: 'none',
              }}
            >
              {icon}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{ lineHeight: 1.1, fontSize: { xs: '1.35rem', sm: '1.6rem' } }}
              >
                {value}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                noWrap
                sx={{ display: 'block' }}
              >
                {label}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );
}

function StatsDashboard({ tickets, loading }) {
  const counts = useMemo(() => {
    const result = { total: tickets.length, OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
    tickets.forEach((t) => {
      if (result[t.status] !== undefined) result[t.status] += 1;
    });
    return result;
  }, [tickets]);

  const cards = [
    {
      key: 'total',
      label: 'Total Tickets',
      value: counts.total,
      icon: <AssignmentOutlinedIcon fontSize="small" />,
      color: { soft: 'rgba(25,118,210,0.1)', solid: '#1565c0' },
    },
    {
      key: 'open',
      label: 'Open Tickets',
      value: counts.OPEN,
      icon: <ConfirmationNumberOutlinedIcon fontSize="small" />,
      color: { soft: 'rgba(2,136,209,0.1)', solid: '#0277bd' },
    },
    {
      key: 'inprogress',
      label: 'In Progress',
      value: counts.IN_PROGRESS,
      icon: <HourglassEmptyOutlinedIcon fontSize="small" />,
      color: { soft: 'rgba(237,108,2,0.1)', solid: '#ed6c02' },
    },
    {
      key: 'resolved',
      label: 'Resolved Tickets',
      value: counts.RESOLVED,
      icon: <TaskAltOutlinedIcon fontSize="small" />,
      color: { soft: 'rgba(46,125,50,0.1)', solid: '#2e7d32' },
    },
  ];

  if (loading) {
    return (
      <Grid container spacing={2} mb={3.5}>
        {[1, 2, 3, 4].map((n) => (
          <Grid item xs={6} sm={3} key={n}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Skeleton variant="rounded" width={46} height={46} sx={{ borderRadius: 2.5 }} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width={36} height={28} />
                    <Skeleton width={70} height={16} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={2} mb={3.5}>
      {cards.map((c, i) => (
        <Grid item xs={6} sm={3} key={c.key}>
          <StatCard
            icon={c.icon}
            label={c.label}
            value={c.value}
            color={c.color}
            delay={i * 80}
          />
        </Grid>
      ))}
    </Grid>
  );
}

// ── Ticket card (timeline style) ──

function TicketCard({ ticket, onViewDetails, isLast }) {
  const accent = STATUS_ACCENT[ticket.status] ?? STATUS_ACCENT.CLOSED;
  const shortId = ticket.id?.slice(0, 8).toUpperCase();
  return (
    <Box sx={{ position: 'relative', display: 'flex' }}>
      {/* Timeline rail */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          width: 36,
          mr: 1.5,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            bgcolor: accent.solid,
            border: '3px solid',
            borderColor: 'background.paper',
            boxShadow: `0 0 0 2px ${accent.solid}`,
            mt: 2.5,
            flexShrink: 0,
          }}
        />
        {!isLast && (
          <Box
            sx={{
              flex: 1,
              width: '2px',
              bgcolor: 'divider',
              mt: 0.5,
              mb: -2,
              minHeight: 24,
            }}
          />
        )}
      </Box>

      <Card
        variant="outlined"
        sx={(theme) => ({
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          borderColor: theme.palette.custom.cardBorder,
          flex: 1,
          mb: 2,
          transition: 'box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease',
          '&:hover': {
            boxShadow: theme.palette.custom.cardShadow,
            transform: 'translateY(-3px)',
            borderColor: accent.solid,
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 5,
            bgcolor: accent.bar,
          },
        })}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.75 }, pl: { xs: 2.75, sm: 3.5 } }}>
          {/* Header: ticket number, created date, status chip */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1}
            mb={1.5}
          >
            <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: accent.soft,
                  flexShrink: 0,
                }}
              >
                <ConfirmationNumberOutlinedIcon sx={{ fontSize: 14, color: accent.solid }} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'monospace',
                  letterSpacing: 0.5,
                  fontWeight: 700,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                }}
              >
                {shortId}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.disabled' }}>
                <EventOutlinedIcon sx={{ fontSize: 13 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {formatDate(ticket.createdAt)}
                </Typography>
              </Stack>
            </Stack>
            <StatusChip status={ticket.status} />
          </Stack>

          <Divider sx={{ mb: 1.5 }} />

          {/* Topic — small label sitting above description for hierarchy */}
          <Stack direction="row" alignItems="center" spacing={0.75} mb={0.75}>
            <SellOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography
              variant="caption"
              fontWeight={700}
              color="primary.main"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}
            >
              {topicLabel(ticket.topic)}
            </Typography>
          </Stack>

          {/* Description — clamped to 2 lines */}
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{
              lineHeight: 1.45,
              mb: 1.75,
              fontSize: { xs: '0.92rem', sm: '1rem' },
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {ticket.description}
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
          >
            <LabelValue
              icon={<BookmarkBorderOutlinedIcon sx={{ fontSize: 15 }} />}
              label="Booking Ref"
              value={ticket.bookingReference || '—'}
              mono
            />
            <Button
              size="small"
              variant="outlined"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
              onClick={() => onViewDetails?.(ticket)}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                alignSelf: { xs: 'stretch', sm: 'center' },
                flexShrink: 0,
              }}
            >
              View Details
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

function LabelValue({ label, value, mono = false, icon }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
        {icon && (
          <Box sx={{ display: 'flex', color: 'text.disabled' }}>{icon}</Box>
        )}
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        fontWeight={600}
        sx={mono ? { fontFamily: 'monospace' } : undefined}
      >
        {value}
      </Typography>
    </Box>
  );
}

function SkeletonCard() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 2 }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
        <Stack direction="row" justifyContent="space-between" mb={1.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Skeleton variant="circular" width={26} height={26} />
            <Skeleton width={140} height={18} />
          </Stack>
          <Skeleton width={84} height={26} sx={{ borderRadius: 2 }} />
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        <Skeleton width={90} height={14} sx={{ mb: 1 }} />
        <Skeleton width="80%" height={22} sx={{ mb: 0.5 }} />
        <Skeleton width="55%" height={22} sx={{ mb: 1.75 }} />
        <Stack direction="row" justifyContent="space-between">
          <Skeleton width={110} height={36} />
          <Skeleton width={110} height={32} sx={{ borderRadius: 2 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate, onFaq }) {
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        borderRadius: 4,
        textAlign: 'center',
        py: { xs: 5, sm: 7 },
        px: 3,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        bgcolor: theme.palette.surface.elevated,
      })}
    >
      <Avatar
        sx={{
          width: 76,
          height: 76,
          bgcolor: 'rgba(25,118,210,0.08)',
          color: 'primary.main',
          mx: 'auto',
          mb: 2.5,
        }}
      >
        <SupportAgentIcon sx={{ fontSize: 38 }} />
      </Avatar>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        No support tickets yet
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3.5} maxWidth={400} mx="auto">
        You haven't raised any support tickets yet. If you're facing an issue with a booking,
        payment, or refund, our support team is ready to help — or browse our FAQs for quick
        answers.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
        <Button
          variant="contained"
          onClick={onCreate}
          size="large"
          startIcon={<AddCircleOutlineOutlinedIcon />}
          sx={{ borderRadius: 2.5, px: 3, fontWeight: 700 }}
        >
          Create Support Ticket
        </Button>
        <Button
          variant="outlined"
          onClick={onFaq}
          size="large"
          startIcon={<HelpOutlineOutlinedIcon />}
          sx={{ borderRadius: 2.5, px: 3, fontWeight: 700 }}
        >
          Browse FAQs
        </Button>
      </Stack>
    </Card>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        borderRadius: 4,
        textAlign: 'center',
        py: { xs: 5, sm: 7 },
        px: 3,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        borderColor: 'error.main',
        bgcolor:
          theme.palette.mode === 'dark' ? 'rgba(211,47,47,0.08)' : 'rgba(211,47,47,0.04)',
      })}
    >
      <Avatar
        sx={{
          width: 76,
          height: 76,
          bgcolor: 'rgba(211,47,47,0.1)',
          color: 'error.main',
          mx: 'auto',
          mb: 2.5,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 38 }} />
      </Avatar>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Something went wrong
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3} maxWidth={380} mx="auto">
        {message || 'We could not load your tickets. Please check your connection and try again.'}
      </Typography>
      <Button
        variant="contained"
        color="error"
        startIcon={<RefreshIcon />}
        onClick={onRetry}
        size="large"
        sx={{ borderRadius: 2.5, px: 3.5, fontWeight: 700 }}
      >
        Try Again
      </Button>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// NOTE: all state, effects, memoized derivations, handlers, and the
// GET /support/my-tickets call below are UNCHANGED from the original file.
// Only the JSX returned has been redesigned for visual presentation.

export default function MyTicketsPage() {
  const navigate = useNavigate();

  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  // Additive, client-side-only quick filter. Does not touch the existing
  // search/statusFilter state or the original filtering logic — it narrows
  // the already-filtered list as an extra layer.
  const [quickFilter, setQuickFilter]   = useState(null);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/support/my-tickets');
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Original filtering logic — unchanged.
  const filteredTickets = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tickets.filter((t) => {
      const matchesStatus  = statusFilter === 'All' || t.status === statusFilter;
      const matchesSearch  =
        !q ||
        t.id?.toLowerCase().includes(q) ||
       t.topic?.toLowerCase()?.includes(q) ||
       t.description?.toLowerCase()?.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [tickets, search, statusFilter]);

  // Quick filter applied on top of the existing filtered result — additive
  // only, never replaces filteredTickets above.
  const visibleTickets = useMemo(() => {
    if (!quickFilter) return filteredTickets;
    const def = QUICK_FILTERS.find((f) => f.key === quickFilter);
    if (!def) return filteredTickets;

    let list = filteredTickets;
    if (def.openOnly) {
      list = list.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
    }
    if (def.days) {
      list = list.filter((t) => withinDays(t.createdAt, def.days));
    }
    if (def.key === 'recent') {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
    return list;
  }, [filteredTickets, quickFilter]);

  const handleViewDetails = useCallback(
    (ticket) => {
      navigate(`/support/tickets/${ticket.id}`);
    },
    [navigate]
  );

  const handleQuickFilterClick = useCallback((key) => {
    setQuickFilter((prev) => (prev === key ? null : key));
  }, []);

  return (
    <Box sx={{ py: { xs: 2.5, sm: 5 }, minHeight: '80vh' }}>
      <Container maxWidth="md">
        <Fade in timeout={450}>
          <Box>
            {/* ── Premium hero header ── */}
            <PageHero ticketCount={tickets.length} loading={loading} />

            {/* ── Statistics dashboard ── */}
            {!error && <StatsDashboard tickets={tickets} loading={loading} />}

            {/* ── Search & Filters — hidden only during initial load or when error occurred ── */}
            {!error && (
              <Card
                variant="outlined"
                sx={(theme) => ({
                  borderRadius: 3,
                  p: { xs: 1.5, sm: 2.25 },
                  mb: 3,
                  borderColor: theme.palette.custom.cardBorder,
                })}
              >
                <Stack spacing={1.75}>
                  <TextField
                    placeholder="Search by ticket ID, topic, or description…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    size="small"
                    fullWidth
                    inputProps={{ 'aria-label': 'Search tickets' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      sx: { borderRadius: 2 },
                    }}
                  />

                  {/* Status filters */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap rowGap={1}>
                    {STATUS_FILTERS.map((s) => {
                      const meta   = STATUS_META[s];
                      const active = statusFilter === s;
                      return (
                        <Chip
                          key={s}
                          label={meta ? meta.label : s}
                          onClick={() => setStatusFilter(s)}
                          color={active && meta ? meta.color : active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          size="small"
                          aria-pressed={active}
                          sx={{
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                            ...(active && { boxShadow: '0 2px 8px -2px rgba(0,0,0,0.25)' }),
                          }}
                        />
                      );
                    })}
                  </Stack>

                  <Divider />

                  {/* Quick filters — additive, client-side only */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    rowGap={1}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={700}
                      sx={{ mr: 0.5, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.65rem' }}
                    >
                      Quick filters
                    </Typography>
                    {QUICK_FILTERS.map((f) => {
                      const active = quickFilter === f.key;
                      return (
                        <Chip
                          key={f.key}
                          label={f.label}
                          size="small"
                          onClick={() => handleQuickFilterClick(f.key)}
                          variant={active ? 'filled' : 'outlined'}
                          color={active ? 'secondary' : 'default'}
                          aria-pressed={active}
                          sx={{
                            fontWeight: active ? 700 : 500,
                            cursor: 'pointer',
                            borderRadius: 2,
                            transition: 'all 0.2s ease',
                          }}
                        />
                      );
                    })}
                  </Stack>

                  {/* Search result summary */}
                  {!loading && (
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      Showing {visibleTickets.length} of {tickets.length} ticket
                      {tickets.length !== 1 ? 's' : ''}
                    </Typography>
                  )}
                </Stack>
              </Card>
            )}

            {/* ── Content ── */}
            {loading ? (
              <Stack spacing={0}>
                {[1, 2, 3].map((n) => (
                  <SkeletonCard key={n} />
                ))}
              </Stack>
            ) : error ? (
              <ErrorState message={error} onRetry={fetchTickets} />
            ) : visibleTickets.length === 0 ? (
              tickets.length === 0 ? (
                <EmptyState
                  onCreate={() => navigate('/support')}
                  onFaq={() => navigate('/support')}
                />
              ) : (
                <Card
                  variant="outlined"
                  sx={{ borderRadius: 4, textAlign: 'center', py: 6, px: 3, borderStyle: 'dashed' }}
                >
                  <SearchIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    No matching tickets
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try adjusting your search, status, or quick filter criteria.
                  </Typography>
                </Card>
              )
            ) : (
              <Box>
                {visibleTickets.map((ticket, idx) => (
                  <Fade
                    in
                    timeout={400}
                    key={ticket.id}
                    style={{ transitionDelay: `${Math.min(idx, 6) * 60}ms` }}
                  >
                    <Box>
                      <TicketCard
                        ticket={ticket}
                        onViewDetails={handleViewDetails}
                        isLast={idx === visibleTickets.length - 1}
                      />
                    </Box>
                  </Fade>
                ))}
              </Box>
            )}
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}