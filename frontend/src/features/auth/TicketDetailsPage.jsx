import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Stack,
  Skeleton,
  Typography,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import api from '../../services/api.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  OPEN:        { label: 'Open',        color: 'primary' },
  IN_PROGRESS: { label: 'In Progress', color: 'warning' },
  RESOLVED:    { label: 'Resolved',    color: 'success' },
  CLOSED:      { label: 'Closed',      color: 'default' },
};

const STATUS_ACCENT = {
  OPEN:        { bar: '#1976d2', soft: 'rgba(25,118,210,0.08)',   solid: '#1976d2' },
  IN_PROGRESS: { bar: '#ed6c02', soft: 'rgba(237,108,2,0.09)',    solid: '#ed6c02' },
  RESOLVED:    { bar: '#2e7d32', soft: 'rgba(46,125,50,0.08)',    solid: '#2e7d32' },
  CLOSED:      { bar: '#757575', soft: 'rgba(117,117,117,0.09)',  solid: '#9e9e9e' },
};

const TOPIC_LABELS = {
  account:   'Account',
  booking:   'Booking',
  payment:   'Payment',
  refund:    'Refund',
  general:   'General',
  complaint: 'Complaint',
};

// Ordered pipeline steps for the status timeline
const STATUS_PIPELINE = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const STATUS_PIPELINE_META = {
  OPEN:        { label: 'Open',        icon: <ConfirmationNumberOutlinedIcon sx={{ fontSize: 18 }} />, description: 'Ticket submitted and awaiting review.' },
  IN_PROGRESS: { label: 'In Progress', icon: <HourglassEmptyOutlinedIcon    sx={{ fontSize: 18 }} />, description: 'A support agent is actively working on your issue.' },
  RESOLVED:    { label: 'Resolved',    icon: <CheckCircleOutlinedIcon        sx={{ fontSize: 18 }} />, description: 'The issue has been resolved.' },
  CLOSED:      { label: 'Closed',      icon: <LockOutlinedIcon              sx={{ fontSize: 18 }} />, description: 'Ticket has been closed.' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

function topicLabel(topic = '') {
  return TOPIC_LABELS[topic.toLowerCase()] ?? topic;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusChip({ status, size = 'small' }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'default' };
  return (
    <Chip
      label={meta.label}
      color={meta.color}
      size={size}
      sx={{ fontWeight: 700, letterSpacing: 0.3, borderRadius: 1.5, px: 0.5 }}
    />
  );
}

// ── Labeled field ──

function LabelValue({ label, value, mono = false, icon, copyable = false }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5} mb={0.4}>
        {icon && <Box sx={{ display: 'flex', color: 'text.disabled', mt: '1px' }}>{icon}</Box>}
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.68rem' }}>
          {label}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        fontWeight={600}
        sx={mono ? { fontFamily: 'monospace', letterSpacing: 0.4 } : undefined}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

// ── Section card wrapper ──

function SectionCard({ title, icon, children, accentColor, delay = 0 }) {
  return (
    <Fade in timeout={500} style={{ transitionDelay: `${delay}ms` }}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          borderColor: 'divider',
          overflow: 'hidden',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          '&:hover': {
            boxShadow: '0 10px 28px -10px rgba(0,0,0,0.14)',
            transform: 'translateY(-2px)',
          },
          ...(accentColor && {
            '&::before': {
              content: '""',
              display: 'block',
              height: 4,
              bgcolor: accentColor,
              background: accentColor,
            },
          }),
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
          {title && (
            <>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                {icon && (
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(25,118,210,0.09)',
                      color: 'primary.main',
                    }}
                  >
                    {icon}
                  </Avatar>
                )}
                <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: 0.2 }}>
                  {title}
                </Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
            </>
          )}
          {children}
        </CardContent>
      </Card>
    </Fade>
  );
}

// ── Status Timeline ──

function StatusTimeline({ currentStatus }) {
  const currentIdx = STATUS_PIPELINE.indexOf(currentStatus);

  return (
    <Box>
      {STATUS_PIPELINE.map((step, idx) => {
        const meta      = STATUS_PIPELINE_META[step];
        const accent    = STATUS_ACCENT[step];
        const isPast    = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture  = idx > currentIdx;
        const isLast    = idx === STATUS_PIPELINE.length - 1;

        return (
          <Box key={step} sx={{ display: 'flex', alignItems: 'flex-start' }}>
            {/* Rail */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
              <Box
                sx={{
                  width: isCurrent ? 36 : 30,
                  height: isCurrent ? 36 : 30,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: isFuture ? 'rgba(0,0,0,0.05)' : accent.soft,
                  color:   isFuture ? 'text.disabled' : accent.solid,
                  border:  isCurrent ? `2.5px solid ${accent.solid}` : '2px solid',
                  borderColor: isFuture ? 'divider' : accent.solid,
                  boxShadow: isCurrent ? `0 0 0 4px ${accent.soft}` : 'none',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                  mt: idx === 0 ? 0 : 0,
                }}
              >
                {meta.icon}
              </Box>
              {!isLast && (
                <Box
                  sx={{
                    width: '2px',
                    flex: 1,
                    minHeight: 28,
                    bgcolor: isPast ? accent.solid : 'divider',
                    opacity: isPast ? 0.5 : 1,
                    my: 0.5,
                  }}
                />
              )}
            </Box>

            {/* Content */}
            <Box sx={{ flex: 1, pb: isLast ? 0 : 2, pt: 0.25, pl: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                <Typography
                  variant="body2"
                  fontWeight={isCurrent ? 800 : 600}
                  color={isFuture ? 'text.disabled' : isCurrent ? accent.solid : 'text.primary'}
                  sx={{ lineHeight: 1.3 }}
                >
                  {meta.label}
                </Typography>
                {isCurrent && (
                  <Chip
                    label="Current"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      bgcolor: accent.soft,
                      color: accent.solid,
                      borderRadius: 1,
                      px: 0.25,
                      letterSpacing: 0.3,
                    }}
                  />
                )}
                {isPast && (
                  <CheckCircleOutlinedIcon sx={{ fontSize: 14, color: 'success.main', opacity: 0.8 }} />
                )}
              </Stack>
              <Typography
                variant="caption"
                color={isFuture ? 'text.disabled' : 'text.secondary'}
                sx={{ lineHeight: 1.5, display: 'block' }}
              >
                {meta.description}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Skeleton loading ──

function TicketDetailsSkeleton() {
  return (
    <Stack spacing={2.5}>
      {/* Header card */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ height: 4, bgcolor: 'divider' }} />
        <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Stack spacing={0.75}>
              <Skeleton width={160} height={14} />
              <Skeleton width={240} height={26} />
              <Skeleton width={110} height={26} sx={{ borderRadius: 2 }} />
            </Stack>
            <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: 2 }} />
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
            {[1, 2, 3, 4].map((n) => (
              <Box key={n}>
                <Skeleton width={60} height={12} sx={{ mb: 0.5 }} />
                <Skeleton width={100} height={18} />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Description */}
      <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
            <Skeleton width={120} height={18} />
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Skeleton width="100%" height={16} sx={{ mb: 0.75 }} />
          <Skeleton width="90%"  height={16} sx={{ mb: 0.75 }} />
          <Skeleton width="65%"  height={16} />
        </CardContent>
      </Card>

      {/* Two-column */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
        {[1, 2].map((n) => (
          <Card key={n} variant="outlined" sx={{ borderRadius: 3, flex: 1, overflow: 'hidden' }}>
            <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: 1.5 }} />
                <Skeleton width={100} height={18} />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                <Skeleton width="80%" height={14} />
                <Skeleton width="60%" height={14} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

// ── Error state ──

function ErrorState({ message, onRetry }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 4,
        textAlign: 'center',
        py: { xs: 5, sm: 7 },
        px: 3,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        borderColor: 'error.main',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(211,47,47,0.06)' : 'rgba(211,47,47,0.04)',
      }}
    >
      <Avatar sx={{ width: 76, height: 76, bgcolor: 'rgba(211,47,47,0.1)', color: 'error.main', mx: 'auto', mb: 2.5 }}>
        <ErrorOutlineIcon sx={{ fontSize: 38 }} />
      </Avatar>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Could not load ticket
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3} maxWidth={380} mx="auto">
        {message || 'We were unable to fetch the ticket details. Please check your connection and try again.'}
      </Typography>
      <Button
        variant="contained"
        color="error"
        startIcon={<RefreshIcon />}
        onClick={onRetry}
        size="large"
        sx={{ borderRadius: 2.5, px: 3.5, fontWeight: 700, boxShadow: 'none' }}
      >
        Try Again
      </Button>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const navigate     = useNavigate();

  const [ticket,  setTicket]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/support/my-tickets/${ticketId}`);
      setTicket(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load ticket details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);
  useEffect(() => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}, []);

  const accent   = ticket ? (STATUS_ACCENT[ticket.status] ?? STATUS_ACCENT.CLOSED) : STATUS_ACCENT.CLOSED;
  const shortId  = ticket?.id?.slice(0, 8).toUpperCase();

  return (
    <Box
      sx={{
        py: { xs: 2.5, sm: 5 },
        minHeight: '80vh',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'transparent'
            : 'linear-gradient(180deg, rgba(25,118,210,0.035) 0%, rgba(25,118,210,0) 240px)',
      }}
    >
      <Container maxWidth="md">
        <Fade in timeout={400}>
          <Box>

            {/* ── Page header ── */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1.5}
              mb={3.5}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Button
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/my-tickets')}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 700,
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                  }}
                >
                  My Tickets
                </Button>
                <Divider orientation="vertical" flexItem sx={{ height: 22, my: 'auto' }} />
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: 'rgba(25,118,210,0.1)',
                      color: 'primary.main',
                      display: { xs: 'none', sm: 'flex' },
                    }}
                  >
                    <SupportAgentIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      sx={{ mb: 0.15, fontSize: { xs: '1.2rem', sm: '1.45rem' } }}
                    >
                      Ticket Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      View the full details of your support request.
                    </Typography>
                  </Box>
                </Stack>
              </Stack>

              {!loading && !error && ticket && (
                <Chip
                  icon={<ConfirmationNumberOutlinedIcon sx={{ fontSize: '0.95rem !important' }} />}
                  label={shortId}
                  variant="outlined"
                  color="primary"
                  sx={{ fontFamily: 'monospace', fontWeight: 700, borderRadius: 2, borderWidth: 1.5, letterSpacing: 0.5 }}
                />
              )}
            </Stack>

            {/* ── Content ── */}
            {loading ? (
              <TicketDetailsSkeleton />
            ) : error ? (
              <ErrorState message={error} onRetry={fetchTicket} />
            ) : ticket ? (
              <Stack spacing={2.5}>

                {/* ── Overview card ── */}
                <Fade in timeout={500} style={{ transitionDelay: '0ms' }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 3,
                      borderColor: 'divider',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'box-shadow 0.25s ease, transform 0.25s ease',
                      '&:hover': {
                        boxShadow: '0 10px 28px -10px rgba(0,0,0,0.14)',
                        transform: 'translateY(-2px)',
                      },
                      '&::before': {
                        content: '""',
                        display: 'block',
                        height: 5,
                        bgcolor: accent.bar,
                      },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
                      {/* Status + ID row */}
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'flex-start', sm: 'flex-start' }}
                        spacing={1.25}
                        mb={2}
                      >
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                            <SellOutlinedIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="primary.main"
                              sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}
                            >
                              {topicLabel(ticket.topic)}
                            </Typography>
                          </Stack>
                          <Typography
                            variant="h6"
                            fontWeight={800}
                            sx={{ fontSize: { xs: '1rem', sm: '1.15rem' }, lineHeight: 1.35, mb: 0.75 }}
                          >
                            {ticket.description?.length > 80
                              ? ticket.description.slice(0, 80) + '…'
                              : ticket.description}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: 'text.disabled' }}>
                            <EventOutlinedIcon sx={{ fontSize: 13 }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              {formatDate(ticket.createdAt)}
                            </Typography>
                          </Stack>
                        </Box>
                        <StatusChip status={ticket.status} size="medium" />
                      </Stack>

                      <Divider sx={{ mb: 2 }} />

                      {/* Metadata grid */}
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 2, sm: 3 }}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <LabelValue
                          label="Ticket ID"
                          value={shortId}
                          mono
                          icon={<ConfirmationNumberOutlinedIcon sx={{ fontSize: 14 }} />}
                        />
                        <LabelValue
                          label="Status"
                          value={STATUS_META[ticket.status]?.label ?? ticket.status}
                          icon={<AssignmentOutlinedIcon sx={{ fontSize: 14 }} />}
                        />
                        <LabelValue
                          label="Topic"
                          value={topicLabel(ticket.topic)}
                          icon={<SellOutlinedIcon sx={{ fontSize: 14 }} />}
                        />
                        <LabelValue
                          label="Booking Reference"
                          value={ticket.bookingReference}
                          mono
                          icon={<BookmarkBorderOutlinedIcon sx={{ fontSize: 14 }} />}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Fade>

                {/* ── Description card ── */}
                <SectionCard
                  title="Description"
                  icon={<AssignmentOutlinedIcon fontSize="small" />}
                  accentColor="rgba(25,118,210,0.5)"
                  delay={80}
                >
                  <Box
                    sx={{
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(25,118,210,0.03)',
                      borderRadius: 2,
                      p: { xs: 1.75, sm: 2.25 },
                      borderLeft: `3px solid ${accent.bar}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        lineHeight: 1.75,
                        whiteSpace: 'pre-wrap',
                        color: 'text.primary',
                        fontWeight: 500,
                      }}
                    >
                      {ticket.description}
                    </Typography>
                  </Box>
                </SectionCard>

                {/* ── Two-column: User Info + Status Timeline ── */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems="flex-start">

                  {/* User Info */}
                  <Box sx={{ flex: 1, width: '100%' }}>
                    <SectionCard
                      title="User Information"
                      icon={<AccountCircleOutlinedIcon fontSize="small" />}
                      accentColor="rgba(46,125,50,0.5)"
                      delay={160}
                    >
                      <Stack spacing={2.25}>
                        <LabelValue
                          label="Full Name"
                          value={ticket.fullName}
                          icon={<PersonOutlinedIcon sx={{ fontSize: 15 }} />}
                        />
                        <LabelValue
                          label="Email Address"
                          value={ticket.email}
                          icon={<EmailOutlinedIcon sx={{ fontSize: 15 }} />}
                        />
                      </Stack>
                    </SectionCard>
                  </Box>

                  {/* Status Timeline */}
                  <Box sx={{ flex: 1, width: '100%' }}>
                    <SectionCard
                      title="Status Timeline"
                      icon={<HourglassEmptyOutlinedIcon fontSize="small" />}
                      accentColor={accent.bar}
                      delay={240}
                    >
                      <StatusTimeline currentStatus={ticket.status} />
                    </SectionCard>
                  </Box>

                </Stack>

              </Stack>
            ) : null}

          </Box>
        </Fade>
      </Container>
    </Box>
  );
}