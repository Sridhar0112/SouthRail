import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Fade,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import api from '../../services/api.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOPIC_LABELS = {
  account:   'Account',
  booking:   'Booking',
  payment:   'Payment',
  refund:    'Refund',
  general:   'General',
  complaint: 'Complaint',
};

const MAX_MESSAGE_LENGTH = 2000;

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

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// ── Message bubble ──

function MessageBubble({ message }) {
  const isAdmin = (message.senderType || message.sender || '').toUpperCase() === 'ADMIN';
  const senderName = message.senderName || (isAdmin ? 'Support Agent' : 'You');

  return (
    <Stack
      direction={isAdmin ? 'row-reverse' : 'row'}
      spacing={1.25}
      alignItems="flex-start"
      sx={{ mb: 2 }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          fontSize: 13,
          fontWeight: 700,
          bgcolor: isAdmin ? 'primary.main' : 'rgba(120,120,120,0.18)',
          color: isAdmin ? 'primary.contrastText' : 'text.secondary',
          flexShrink: 0,
        }}
      >
        {isAdmin ? <SupportAgentIcon sx={{ fontSize: 17 }} /> : initialsOf(senderName)}
      </Avatar>

      <Box sx={{ maxWidth: '78%', minWidth: 0 }}>
        <Stack
          direction={isAdmin ? 'row-reverse' : 'row'}
          spacing={0.75}
          alignItems="baseline"
          mb={0.4}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            {senderName}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {formatDate(message.createdAt)}
          </Typography>
        </Stack>
        <Box
          sx={(theme) => ({
            px: 1.75,
            py: 1.1,
            borderRadius: 2.5,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
            ...(isAdmin
              ? {
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  borderTopRightRadius: 6,
                }
              : {
                  bgcolor: theme.palette.surface.elevated,
                  color: theme.palette.text.primary,
                  border: `1px solid ${theme.palette.custom.cardBorder}`,
                  borderTopLeftRadius: 6,
                }),
          })}
        >
          <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
            {message.content || message.message}
          </Typography>
        </Box>
      </Box>
    </Stack>
  );
}

function MessageSkeleton({ align = 'left' }) {
  const isRight = align === 'right';
  return (
    <Stack direction={isRight ? 'row-reverse' : 'row'} spacing={1.25} sx={{ mb: 2 }}>
      <Skeleton variant="circular" width={32} height={32} />
      <Box sx={{ width: '60%' }}>
        <Skeleton width={90} height={14} sx={{ mb: 0.5, ml: isRight ? 'auto' : 0 }} />
        <Skeleton variant="rounded" height={46} sx={{ borderRadius: 2.5 }} />
      </Box>
    </Stack>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TicketDetailsPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket]               = useState(null);
  const [ticketLoading, setTicketLoading] = useState(true);
  const [ticketError, setTicketError]     = useState(null);

  const [messages, setMessages]             = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError]   = useState(null);

  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);
  const [sendError, setSendError] = useState(null);

  const scrollRef = useRef(null);

  // GET /support/my-tickets/{ticketId}
  const fetchTicket = useCallback(async () => {
    setTicketLoading(true);
    setTicketError(null);
    try {
      const { data } = await api.get(`/support/my-tickets/${ticketId}`);
      setTicket(data || null);
    } catch (err) {
      setTicketError(err?.response?.data?.message || 'Failed to load ticket details.');
    } finally {
      setTicketLoading(false);
    }
  }, [ticketId]);

  // GET /support/my-tickets/{ticketId}/messages
  const fetchMessages = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setMessagesLoading(true);
    setMessagesError(null);
    try {
      const { data } = await api.get(`/support/my-tickets/${ticketId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessagesError(err?.response?.data?.message || 'Failed to load conversation.');
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
    fetchMessages();
  }, [fetchTicket, fetchMessages]);

  // Auto-scroll to newest message whenever the message list changes.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isClosed = ticket?.status === 'CLOSED';

  const remainingChars = MAX_MESSAGE_LENGTH - draft.length;
  const canSend = !isClosed && draft.trim().length > 0 && remainingChars >= 0 && !sending;

  // POST /support/my-tickets/{ticketId}/messages
  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || isClosed) return;
    setSending(true);
    setSendError(null);
    try {
      await api.post(`/support/my-tickets/${ticketId}/messages`, {  message: content });
      setDraft('');
      // Auto-refresh conversation after a successful reply.
      await fetchMessages({ silent: true });
    } catch (err) {
      setSendError(err?.response?.data?.message || 'Failed to send your message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [draft, isClosed, ticketId, fetchMessages]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (canSend) handleSend();
      }
    },
    [canSend, handleSend]
  );

  const shortId = useMemo(() => ticketId?.slice(0, 8).toUpperCase(), [ticketId]);
  useEffect(() => {
    if (isClosed) return;
    const interval = setInterval(() => {
      fetchMessages({ silent: true });
    }, 15000);
  
    return () => clearInterval(interval);
  }, [fetchMessages, isClosed]);

  return (
    <Box sx={{ py: { xs: 1.5, sm: 2.25 }, minHeight: '80vh' }}>
      <Container maxWidth="md">
        <Fade in timeout={400}>
          <Box>
            {/* ── Back navigation ── */}
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/my-tickets')}
              sx={{ mb: 2, fontWeight: 700, borderRadius: 2 }}
            >
              Back to My Tickets
            </Button>

            {/* ── Ticket header ── */}
            {ticketLoading ? (
              <Card variant="outlined" sx={{ borderRadius: 3, mb: 1.5, p: 1.5 }}>
                <Skeleton width={160} height={28} sx={{ mb: 1 }} />
                <Skeleton width="60%" height={20} />
              </Card>
            ) : ticketError ? (
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 4,
                  textAlign: 'center',
                  py: 3,
                  px: 3,
                  borderStyle: 'dashed',
                  borderColor: 'error.main',
                  mb: 1.5,
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 28, color: 'error.main', mb: 1.5 }} />
                <Typography variant="h6" fontWeight={800} gutterBottom>
                  Couldn't load this ticket
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2.5}>
                  {ticketError}
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<RefreshIcon />}
                  onClick={fetchTicket}
                  sx={{ borderRadius: 2.5, fontWeight: 700 }}
                >
                  Try Again
                </Button>
              </Card>
            ) : (
              <Card
                variant="outlined"
                sx={(theme) => ({
                  borderRadius: 3,
                  mb: 1.5,
                  overflow: 'hidden',
                  borderColor: theme.palette.custom.cardBorder,
                  backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                  color: theme.palette.primary.contrastText,
                })}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1.5}
                    mb={1.5}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.25}>
                      <ConfirmationNumberOutlinedIcon sx={{ fontSize: 18, opacity: 0.85 }} />
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 0.6, opacity: 0.9 }}
                      >
                        TICKET #{shortId}
                      </Typography>
                    </Stack>
                    <Chip
 label={ticket?.status}
 sx={{
   bgcolor:'rgba(255,255,255,.18)',
   color:'#fff'
 }}
/>
                  </Stack>

                  <Typography
                    variant="h6"
                    fontWeight={800}
                    sx={{ mb: 1.5, fontSize: { xs: '1.05rem', sm: '1.2rem' } }}
                  >
                    {ticket?.description}
                  </Typography>

                  <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap rowGap={1}>
                    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ opacity: 0.9 }}>
                      <SellOutlinedIcon sx={{ fontSize: 15 }} />
                      <Typography variant="caption" fontWeight={600}>
                        {topicLabel(ticket?.topic)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ opacity: 0.9 }}>
                      <EventOutlinedIcon sx={{ fontSize: 15 }} />
                      <Typography variant="caption" fontWeight={600}>
                        {formatDate(ticket?.createdAt)}
                      </Typography>
                    </Stack>
                    {ticket?.bookingReference && (
                      <Stack direction="row" alignItems="center" spacing={0.6} sx={{ opacity: 0.9 }}>
                        <BookmarkBorderOutlinedIcon sx={{ fontSize: 15 }} />
                        <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                          {ticket.bookingReference}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* ── Conversation card ── */}
            {!ticketError && (
              <Card
                variant="outlined"
                sx={(theme) => ({ borderRadius: 3, borderColor: theme.palette.custom.cardBorder })}
              >
                <CardContent sx={{ p: { xs: 1.75, sm: 2.5 } }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={1.5}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <ForumOutlinedIcon color="primary" sx={{ fontSize: 20 }} />
                      <Typography variant="subtitle1" fontWeight={800}>
                        Conversation
                      </Typography>
                      {!messagesLoading && !messagesError && (
                        <Chip
                          label={`${messages.length} message${messages.length !== 1 ? 's' : ''}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, borderRadius: 2 }}
                        />
                      )}
                    </Stack>
                    <Tooltip title="Refresh conversation">
                      <IconButton size="small" onClick={() => fetchMessages()} aria-label="Refresh conversation">
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  <Divider sx={{ mb: 1.5 }} />

                  {/* Scrollable message area */}
                  <Box
                    ref={scrollRef}
                    role="log"
                    aria-live="polite"
                    aria-label="Ticket conversation history"
                    sx={(theme) => ({
                      height: { xs: 300, sm: 340 },
                      overflowY: 'auto',
                      pr: 0.5,
                      pb: 0.5,
                      bgcolor: theme.palette.surface.input,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.custom.cardBorder}`,
                      p: 1.75,
                      mb: 2,
                    })}
                  >
                    {messagesLoading ? (
                      <>
                        <MessageSkeleton align="left" />
                        <MessageSkeleton align="right" />
                        <MessageSkeleton align="left" />
                      </>
                    ) : messagesError ? (
                      <Stack
                        alignItems="center"
                        justifyContent="center"
                        spacing={1.5}
                        sx={{ height: '100%', textAlign: 'center', px: 2 }}
                      >
                        <ErrorOutlineIcon sx={{ fontSize: 32, color: 'error.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          {messagesError}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<RefreshIcon />}
                          onClick={() => fetchMessages()}
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                          Retry
                        </Button>
                      </Stack>
                    ) : messages.length === 0 ? (
                      <Stack
                        alignItems="center"
                        justifyContent="center"
                        spacing={1.25}
                        sx={{ height: '100%', textAlign: 'center', px: 2 }}
                      >
                        <Avatar sx={{ bgcolor: 'rgba(25,118,210,0.08)', color: 'primary.main', width: 52, height: 52 }}>
                          <ForumOutlinedIcon />
                        </Avatar>
                        <Typography variant="body2" fontWeight={700}>
                          No messages yet
                        </Typography>
                        <Typography variant="caption" color="text.secondary" maxWidth={280}>
                          Send a message below and our support team will get back to you here.
                        </Typography>
                      </Stack>
                    ) : (
                      messages.map((m, idx) => (
                        <MessageBubble key={m.id || m._id || idx} message={m} />
                      ))
                    )}
                  </Box>

                  {/* ── Reply section ── */}
                  {isClosed ? (
                    <Alert
                      icon={<LockOutlinedIcon fontSize="small" />}
                      severity="info"
                      sx={{ borderRadius: 2 }}
                    >
                      This ticket is closed, so it's no longer accepting replies. If you need
                      further help, please raise a new support ticket.
                    </Alert>
                  ) : (
                    <Stack spacing={1}>
                      {sendError && (
                        <Alert severity="error" onClose={() => setSendError(null)} sx={{ borderRadius: 2 }}>
                          {sendError}
                        </Alert>
                      )}
                      <Typography variant="subtitle2" fontWeight={700}>
  Reply to Support Team
</Typography>
                      <TextField
                        placeholder="Reply to Support Team"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        multiline
                        minRows={2}
                        maxRows={6}
                        fullWidth
                        disabled={sending}
                        inputProps={{ 'aria-label': 'Reply to ticket', maxLength: MAX_MESSAGE_LENGTH }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1}
                      >
                        <Typography
                          variant="caption"
                          color={remainingChars < 0 ? 'error.main' : 'text.secondary'}
                          fontWeight={600}
                        >
                          {remainingChars} characters left
                        </Typography>
                        <Button
                          variant="contained"
                          endIcon={
                            sending ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <SendIcon sx={{ fontSize: 17 }} />
                            )
                          }
                          onClick={handleSend}
                          disabled={!canSend}
                          sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
                        >
                          {sending ? 'Sending…' : 'Send Reply'}
                        </Button>
                      </Stack>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        </Fade>
      </Container>
    </Box>
  );
}