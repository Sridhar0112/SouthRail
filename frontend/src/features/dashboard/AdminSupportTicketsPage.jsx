import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Fade,
  Collapse,
  CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import TopicIcon from '@mui/icons-material/Topic';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DescriptionIcon from '@mui/icons-material/Description';
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import api from '../../services/api.js';

const STATUS_OPTIONS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function formatStatus(status = '') {
  return status.replaceAll('_', ' ');
}

function getStatusColor(status) {
  if (status === 'OPEN') return 'primary';
  if (status === 'IN_PROGRESS') return 'warning';
  if (status === 'RESOLVED') return 'success';
  if (status === 'CLOSED') return 'default';
  return 'default';
}

function getStatusBg(status, theme) {
  const isLight = theme.palette.mode === 'light';
  if (status === 'OPEN') return alpha(theme.palette.primary.main, isLight ? 0.08 : 0.15);
  if (status === 'IN_PROGRESS') return alpha(theme.palette.warning.main, isLight ? 0.08 : 0.15);
  if (status === 'RESOLVED') return alpha(theme.palette.success.main, isLight ? 0.08 : 0.15);
  if (status === 'CLOSED') return alpha(theme.palette.text.disabled, isLight ? 0.08 : 0.12);
  return 'transparent';
}

function getStatusMainColor(status, theme) {
  if (status === 'OPEN') return theme.palette.primary.main;
  if (status === 'IN_PROGRESS') return theme.palette.warning.main;
  if (status === 'RESOLVED') return theme.palette.success.main;
  if (status === 'CLOSED') return theme.palette.text.disabled;
  return theme.palette.text.secondary;
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ─── Stat Card ─────────────────────────────────────────────────────────── */
function StatCard({ title, value, icon, color, isLoading }) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2.25,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        '&:hover': {
          boxShadow: isLight
            ? `0 8px 28px ${alpha(color, 0.18)}`
            : `0 8px 28px ${alpha(color, 0.22)}`,
          transform: 'translateY(-2px)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          bgcolor: color,
          borderRadius: '3px 0 0 3px',
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          sx={{
            width: 48,
            height: 40,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(color, 0.12),
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            letterSpacing={0.5}
            sx={{ textTransform: 'uppercase', fontSize: '0.68rem' }}
          >
            {title}
          </Typography>
          {isLoading ? (
            <Skeleton width={48} height={36} />
          ) : (
            <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.1, mt: 0.25 }}>
              {value}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

/* ─── Loading Skeleton Rows ─────────────────────────────────────────────── */
function LoadingRows() {
  return Array.from({ length: 7 }).map((_, index) => (
    <TableRow key={index} sx={{ opacity: 1 - index * 0.1 }}>
      {Array.from({ length: 9 }).map((__, cell) => (
        <TableCell key={cell} sx={{ py: 1.5 }}>
          <Skeleton height={22} sx={{ borderRadius: 1 }} animation="wave" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

/* ─── Empty State ───────────────────────────────────────────────────────── */
function EmptyState({ hasFilters }) {
  return (
    <Fade in>
      <Box sx={{ py: 4, textAlign: 'center', px: 2 }}>
        <Box
          sx={{
            width: 80,
            height: 40,
            borderRadius: '50%',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            display: 'grid',
            placeItems: 'center',
            mx: 'auto',
            mb: 2.5,
          }}
        >
          {hasFilters ? (
            <FilterListIcon sx={{ fontSize: 26, color: 'primary.main' }} />
          ) : (
            <FolderOffIcon sx={{ fontSize: 26, color: 'primary.main' }} />
          )}
        </Box>
        <Typography variant="h6" fontWeight={800} gutterBottom>
          {hasFilters ? 'No tickets match your filters' : 'No support tickets yet'}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ maxWidth: 320, mx: 'auto' }}>
          {hasFilters
            ? "Try adjusting your search or status filter to find what you're looking for."
            : 'Support tickets raised by customers will appear here.'}
        </Typography>
      </Box>
    </Fade>
  );
}

/* ─── Section Header (drawer) ───────────────────────────────────────────── */
function SectionHeader({ icon, label, action }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box sx={{ color: 'primary.main', display: 'grid', placeItems: 'center', '& svg': { fontSize: 18 } }}>
          {icon}
        </Box>
        <Typography
          variant="caption"
          fontWeight={800}
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.7, fontSize: '0.7rem' }}
        >
          {label}
        </Typography>
      </Stack>
      {action}
    </Stack>
  );
}

/* ─── Summary Field (compact grid item inside summary card) ────────────── */
function SummaryField({ icon, label, children }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
      <Box
        sx={{
          mt: 0.2,
          color: 'text.secondary',
          opacity: 0.85,
          flexShrink: 0,
          '& svg': { fontSize: 17 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.65rem', display: 'block' }}
        >
          {label}
        </Typography>
        <Box sx={{ mt: 0.25 }}>{children}</Box>
      </Box>
    </Stack>
  );
}

/* ─── Conversation Skeleton ─────────────────────────────────────────────── */
function ConversationSkeleton() {
  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      {[0, 1, 2].map((i) => (
        <Stack
          key={i}
          direction="row"
          spacing={1}
          sx={{ flexDirection: i % 2 === 1 ? 'row-reverse' : 'row', alignItems: 'flex-end' }}
        >
          <Skeleton variant="circular" width={28} height={28} />
          <Skeleton variant="rounded" width={`${50 + (i % 3) * 12}%`} height={58} sx={{ borderRadius: 2.5 }} />
        </Stack>
      ))}
    </Stack>
  );
}

/* ─── Conversation Empty State ──────────────────────────────────────────── */
function ConversationEmpty() {
  return (
    <Box sx={{ py: 3, textAlign: 'center', px: 2 }}>
      <ChatBubbleOutlineIcon sx={{ fontSize: 30, color: 'text.disabled', mb: 1 }} />
      <Typography variant="body2" fontWeight={700} color="text.secondary">
        No messages yet
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Replies you send will appear here as a conversation thread.
      </Typography>
    </Box>
  );
}

/* ─── Message Bubble ────────────────────────────────────────────────────── */
function MessageBubble({ message, theme }) {
  const isAdmin = message.senderType === 'ADMIN';
  const isLight = theme.palette.mode === 'light';

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ flexDirection: isAdmin ? 'row-reverse' : 'row', alignItems: 'flex-end', width: '100%' }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          fontSize: '0.7rem',
          fontWeight: 800,
          flexShrink: 0,
          bgcolor: isAdmin ? 'primary.main' : 'secondary.main',
          color: isAdmin ? 'primary.contrastText' : 'secondary.contrastText',
        }}
      >
        {initialsOf(message.senderName)}
      </Avatar>

      <Box sx={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.4, flexDirection: isAdmin ? 'row-reverse' : 'row' }}>
          <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ fontSize: '0.72rem' }}>
            {message.senderName}
          </Typography>
          {isAdmin && (
            <Chip
              label="Agent"
              size="small"
              sx={{
                height: 16,
                fontSize: '0.58rem',
                fontWeight: 800,
                px: 0,
                bgcolor: alpha(theme.palette.primary.main, isLight ? 0.12 : 0.22),
                color: 'primary.main',
                '& .MuiChip-label': { px: 0.7 },
              }}
            />
          )}
        </Stack>

        <Paper
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.1,
            bgcolor: isAdmin
              ? 'primary.main'
              : isLight
                ? alpha(theme.palette.text.primary, 0.045)
                : alpha('#FFFFFF', 0.08),
            color: isAdmin ? 'primary.contrastText' : 'text.primary',
            borderRadius: 2.5,
            borderTopRightRadius: isAdmin ? 4 : 2.5,
            borderTopLeftRadius: isAdmin ? 2.5 : 4,
            border: isAdmin ? 'none' : `1px solid ${theme.palette.divider}`,
            wordBreak: 'break-word',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {message.message}
          </Typography>
        </Paper>

        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.4, fontSize: '0.66rem', px: 0.25 }}>
          {formatTime(message.createdAt)} · {formatDateShort(message.createdAt)}
        </Typography>
      </Box>
    </Stack>
  );
}

/* ─── Ticket Drawer ─────────────────────────────────────────────────────── */
function TicketDrawer({
  open,
  ticket,
  messages,
  messageLoading,
  replyMessage,
  setReplyMessage,
  sendReply,
  sending,
  onClose,
  onUpdateStatus,
}) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, messageLoading, open]);

  if (!ticket) return null;

  const statusColor = getStatusMainColor(ticket.status, theme);
  const isClosed = ticket.status === 'CLOSED';

  const handleReplyKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isClosed && replyMessage.trim() && !sending) {
      e.preventDefault();
      sendReply();
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      aria-labelledby="ticket-drawer-title"
      PaperProps={{
        sx: {
          width: { xs: 'calc(100vw - 24px)', sm: 520, md: 640 },
          maxWidth: '100vw',
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* ── Sticky Header ── */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          px: { xs: 2.5, sm: 3.5 },
          py: 2.5,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          color: theme.palette.primary.contrastText,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha('#fff', 0.16),
                flexShrink: 0,
              }}
            >
              <ConfirmationNumberIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ opacity: 0.78, letterSpacing: 1.4, fontSize: '0.66rem', lineHeight: 1 }}>
                Support Ticket
              </Typography>
              <Typography
                id="ticket-drawer-title"
                variant="h6"
                fontWeight={900}
                sx={{ lineHeight: 1.2, fontFamily: 'monospace' }}
              >
                #{ticket.id}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
              label={formatStatus(ticket.status)}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.72rem',
                bgcolor: alpha('#fff', 0.2),
                color: '#fff',
                border: `1px solid ${alpha('#fff', 0.35)}`,
                backdropFilter: 'blur(4px)',
              }}
            />
            <Tooltip title="Close panel" arrow>
              <IconButton
                onClick={onClose}
                size="small"
                aria-label="Close ticket panel"
                sx={{ color: 'inherit', bgcolor: alpha('#fff', 0.15), '&:hover': { bgcolor: alpha('#fff', 0.25) } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* ── Scrollable Body ── */}
      <Box sx={{ overflowY: 'auto', flex: 1, px: { xs: 2.5, sm: 3.5 }, py: 3 }}>
        <Stack spacing={2}>
          {/* Summary Card */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.25,
              borderColor: theme.palette.divider,
              bgcolor: 'background.paper',
            }}
          >
            <SectionHeader icon={<PersonIcon />} label="Customer & Ticket Summary" />
            <Grid container spacing={2.25}>
              <Grid item xs={12} sm={6}>
                <SummaryField icon={<PersonIcon />} label="Customer">
                  <Typography variant="body2" fontWeight={700}>
                    {ticket.fullName || '—'}
                  </Typography>
                </SummaryField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <SummaryField icon={<EmailIcon />} label="Email">
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    {ticket.email || '—'}
                  </Typography>
                </SummaryField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <SummaryField icon={<BookmarkIcon />} label="Booking Reference">
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', letterSpacing: 0.4 }}>
                    {ticket.bookingReference || '—'}
                  </Typography>
                </SummaryField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <SummaryField icon={<TopicIcon />} label="Topic">
                  <Typography variant="body2" fontWeight={600}>
                    {ticket.topic ? formatStatus(ticket.topic) : '—'}
                  </Typography>
                </SummaryField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <SummaryField icon={<CalendarTodayIcon />} label="Created">
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(ticket.createdAt)}
                  </Typography>
                </SummaryField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <SummaryField icon={<ConfirmationNumberIcon />} label="Status">
                  <Chip
                    size="small"
                    label={formatStatus(ticket.status)}
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      height: 22,
                      bgcolor: getStatusBg(ticket.status, theme),
                      color: statusColor,
                      border: `1px solid ${alpha(statusColor, 0.4)}`,
                    }}
                  />
                </SummaryField>
              </Grid>
            </Grid>
          </Paper>

          {/* Issue Details Card */}
          <Box>
            <SectionHeader icon={<DescriptionIcon />} label="Issue Details" />
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.25,
                bgcolor: isLight ? alpha(theme.palette.primary.main, 0.03) : alpha(theme.palette.primary.main, 0.07),
                borderColor: theme.palette.divider,
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 }}>
                {ticket.description || 'No description provided.'}
              </Typography>
            </Paper>
          </Box>

          <Divider />

          {/* Conversation */}
          <Box>
            <SectionHeader
              icon={<ChatBubbleOutlineIcon />}
              label="Conversation History"
              action={
                !messageLoading && (
                  <Chip
                    label={`${messages.length} message${messages.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: isLight ? alpha(theme.palette.text.primary, 0.06) : alpha('#fff', 0.08),
                      color: 'text.secondary',
                    }}
                  />
                )
              }
            />
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 2.25,
                borderColor: theme.palette.divider,
                bgcolor: 'background.default',
                overflow: 'hidden',
              }}
            >
              <Box
                ref={scrollRef}
                role="log"
                aria-label="Conversation messages"
                sx={{
                  height: 300,
                  overflowY: 'auto',
                  p: 2,
                  scrollBehavior: 'smooth',
                }}
              >
                {messageLoading ? (
                  <ConversationSkeleton />
                ) : messages.length === 0 ? (
                  <ConversationEmpty />
                ) : (
                  <Stack spacing={2}>
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} theme={theme} />
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Box>
        </Stack>
      </Box>

      {/* ── Sticky Footer / Reply Section ── */}
      <Box
        sx={{
          flexShrink: 0,
          position: 'sticky',
          bottom: 0,
          px: { xs: 2.5, sm: 3.5 },
          py: 2.25,
          bgcolor: 'background.paper',
          borderTop: `1px solid ${theme.palette.divider}`,
          boxShadow: isLight ? '0 -8px 24px rgba(19,35,30,0.06)' : '0 -8px 24px rgba(0,0,0,0.3)',
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            p: 1.75,
            borderRadius: 2.25,
            borderColor: theme.palette.divider,
            bgcolor: 'background.default',
          }}
        >
          {isClosed ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1, px: 0.5 }}>
              <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.secondary">
                This ticket is closed. Reply is disabled.
              </Typography>
            </Stack>
          ) : (
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              onKeyDown={handleReplyKeyDown}
              placeholder="Reply to customer…"
              disabled={isClosed}
              aria-label="Reply message"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'background.paper',
                },
              }}
            />
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 1.5 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
              onClick={sendReply}
              disabled={isClosed || !replyMessage.trim() || sending}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {sending ? 'Sending…' : 'Send Reply'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<EditIcon fontSize="small" />}
              onClick={() => onUpdateStatus(ticket)}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Update Status
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Drawer>
  );
}

/* ─── Status Dialog ─────────────────────────────────────────────────────── */
function normalizeTicketStatus(value) {
  return ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(value) ? value : 'OPEN';
}

function StatusDialog({ open, ticket, onClose, onSubmit, loading }) {
  const [status, setStatus] = useState(normalizeTicketStatus(ticket?.status));
  const theme = useTheme();

  useEffect(() => {
    setStatus(normalizeTicketStatus(ticket?.status));
  }, [ticket]);

  const statusMeta = {
    OPEN: { color: theme.palette.primary.main, label: 'Open' },
    IN_PROGRESS: { color: theme.palette.warning.main, label: 'In Progress' },
    RESOLVED: { color: theme.palette.success.main, label: 'Resolved' },
    CLOSED: { color: theme.palette.text.disabled, label: 'Closed' },
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 2.25 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={900}>
          Update Ticket Status
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Ticket #{ticket?.id}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              inputProps={{ 'aria-label': 'Ticket status' }}
              renderValue={(val) => (
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: statusMeta[val]?.color,
                      flexShrink: 0,
                    }}
                  />
                  <Typography fontWeight={700}>{statusMeta[val]?.label}</Typography>
                </Stack>
              )}
            >
              {Object.entries(statusMeta).map(([val, meta]) => (
                <MenuItem key={val} value={val}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0 }} />
                    <Typography fontWeight={600}>{meta.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Preview chip */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Preview:
            </Typography>
            <Chip label={formatStatus(status)} color={getStatusColor(status)} size="small" sx={{ fontWeight: 700 }} />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={loading}
          onClick={() => onSubmit(ticket.id, status)}
          sx={{ flex: 1, borderRadius: 2 }}
        >
          {loading ? 'Updating…' : 'Update Status'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function AdminSupportTicketsPage() {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusTicket, setStatusTicket] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [messages, setMessages] = useState([]);
  const [messageLoading, setMessageLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/support/admin/tickets');
      setTickets(Array.isArray(data) ? data : []);
    } catch (apiError) {
      setError('Unable to load support tickets right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = async (ticketId) => {
    try {
      setMessageLoading(true);
      const { data } = await api.get(`/support/admin/tickets/${ticketId}/messages`);
      setMessages(data || []);
    } finally {
      setMessageLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    setPage(0);
  }, [search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'OPEN').length,
      progress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
      resolved: tickets.filter((t) => t.status === 'RESOLVED').length,
    }),
    [tickets]
  );

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const statusMatch = statusFilter === 'ALL' || ticket.status === statusFilter;
      const searchText = [ticket.id, ticket.fullName, ticket.email, ticket.topic, ticket.bookingReference, ticket.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return statusMatch && (!q || searchText.includes(q));
    });
  }, [tickets, search, statusFilter]);

  const paginatedTickets = useMemo(
    () => filteredTickets.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredTickets, page, rowsPerPage]
  );

  const handleView = (ticket) => {
    setSelectedTicket(ticket);
    setDrawerOpen(true);
    loadMessages(ticket.id);
  };

  const sendReply = async () => {
    if (!replyMessage.trim()) return;
    setSendingReply(true);
    try {
      await api.post(`/support/admin/tickets/${selectedTicket.id}/messages`, {
        message: replyMessage,
      });
      setReplyMessage('');
      await loadMessages(selectedTicket.id);
    } finally {
      setSendingReply(false);
    }
  };

  const handleOpenStatus = (ticket) => {
    setStatusTicket(ticket);
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = async (ticketId, status) => {
    setStatusLoading(true);
    try {
      await api.put(`/support/admin/tickets/${ticketId}/status`, { status });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status } : t)));
      setStatusDialogOpen(false);
      setStatusTicket(null);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => ({ ...prev, status }));
      }
    } catch (apiError) {
      alert('Failed to update ticket status');
    } finally {
      setStatusLoading(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Ticket ID', 'Customer', 'Email', 'Booking Reference', 'Topic', 'Status', 'Created Date'],
      ...filteredTickets.map((ticket) => [
        ticket.id,
        ticket.fullName || '',
        ticket.email || '',
        ticket.bookingReference || '',
        ticket.topic || '',
        ticket.status || '',
        formatDate(ticket.createdAt),
      ]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'southrail-support-tickets.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = search.trim() !== '' || statusFilter !== 'ALL';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="xl">
        <Stack spacing={2}>
          {/* ── Page Header ── */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, md: 2 },
              borderRadius: 2.25,
              border: `1px solid ${theme.palette.divider}`,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: theme.palette.primary.contrastText,
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: -40,
                right: -40,
                width: 180,
                height: 180,
                borderRadius: '50%',
                bgcolor: alpha('#fff', 0.05),
                pointerEvents: 'none',
              },
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                  <SupportAgentIcon sx={{ fontSize: 28, opacity: 0.9 }} />
                  <Typography variant="h4" fontWeight={900} sx={{ lineHeight: 1.1, fontSize: { xs: '1.45rem', sm: '1.75rem' }, overflowWrap: 'anywhere' }}>
                    Support Tickets
                  </Typography>
                </Stack>
                <Typography sx={{ opacity: 0.8, mt: 0.5, fontSize: '0.92rem' }}>
                  Monitor, track and resolve customer support requests
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexShrink={0} flexWrap="wrap" useFlexGap sx={{ '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<RefreshIcon />}
                  onClick={loadTickets}
                  disabled={loading}
                  aria-label="Refresh ticket list"
                  sx={{ borderRadius: 2, px: 2.5 }}
                >
                  Refresh
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportCsv}
                  disabled={loading || filteredTickets.length === 0}
                  aria-label="Export visible tickets to CSV"
                  sx={{
                    borderRadius: 2,
                    px: 2.5,
                    color: 'inherit',
                    borderColor: alpha('#fff', 0.55),
                    '&:hover': { borderColor: '#fff', bgcolor: alpha('#fff', 0.1) },
                    '&.Mui-disabled': { color: alpha('#fff', 0.4), borderColor: alpha('#fff', 0.2) },
                  }}
                >
                  Export CSV
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* ── Stat Cards ── */}
          <Grid container spacing={2}>
            {[
              { title: 'Total Tickets', value: stats.total, icon: <ConfirmationNumberIcon />, color: theme.palette.primary.main },
              { title: 'Open', value: stats.open, icon: <SupportAgentIcon />, color: theme.palette.info.main },
              { title: 'In Progress', value: stats.progress, icon: <PendingIcon />, color: theme.palette.warning.main },
              { title: 'Resolved', value: stats.resolved, icon: <CheckCircleIcon />, color: theme.palette.success.main },
            ].map((card) => (
              <Grid item xs={12} sm={6} md={3} key={card.title}>
                <StatCard {...card} isLoading={loading} />
              </Grid>
            ))}
          </Grid>

          {/* ── Table Card ── */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 2.25,
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
            }}
          >
            {/* Toolbar */}
            <Box sx={{ p: { xs: 2, md: 2.5 } }}>
              <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={2}>
                <TextField
                  placeholder="Search by ticket ID, customer, email, topic or booking ref…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="small"
                  aria-label="Search tickets"
                  sx={{ flex: 1, width: '100%', maxWidth: { lg: 480 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" role="group" aria-label="Filter by status">
                  <FilterListIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  {STATUS_OPTIONS.map((status) => {
                    const active = statusFilter === status;
                    return (
                      <Chip
                        key={status}
                        clickable
                        label={status === 'ALL' ? 'All' : formatStatus(status)}
                        color={active ? getStatusColor(status) : 'default'}
                        variant={active ? 'filled' : 'outlined'}
                        onClick={() => setStatusFilter(status)}
                        size="small"
                        aria-pressed={active}
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          transition: 'all 0.15s ease',
                          ...(status === 'ALL' &&
                            active && {
                              bgcolor: theme.palette.primary.main,
                              color: '#fff',
                            }),
                        }}
                      />
                    );
                  })}
                </Stack>
              </Stack>

              {/* Results count */}
              <Collapse in={!loading}>
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {hasFilters
                      ? `${filteredTickets.length} of ${tickets.length} tickets`
                      : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''} total`}
                  </Typography>
                </Box>
              </Collapse>
            </Box>

            <Divider />

            {/* Error */}
            <Collapse in={!!error}>
              <Box sx={{ p: 2 }}>
                <Alert
                  severity="error"
                  action={
                    <Button color="inherit" size="small" onClick={loadTickets}>
                      Retry
                    </Button>
                  }
                  sx={{ borderRadius: 2 }}
                >
                  {error}
                </Alert>
              </Box>
            </Collapse>

            {/* Table */}
            {!error && (
              <>
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: { xs: 900, md: 980 } }}>
                    <TableHead>
                      <TableRow
                        sx={{
                          bgcolor: isLight ? alpha(theme.palette.primary.main, 0.04) : alpha(theme.palette.primary.main, 0.1),
                          '& th': {
                            py: 1.5,
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: 0.6,
                            color: 'text.secondary',
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            whiteSpace: 'nowrap',
                          },
                        }}
                      >
                        <TableCell>Ticket ID</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Booking Ref</TableCell>
                        <TableCell>Topic</TableCell>
                        <TableCell>Created</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {loading && <LoadingRows />}

                      {!loading &&
                        paginatedTickets.map((ticket, idx) => (
                         
                            <TableRow
                              hover
                               key={ticket.id}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleView(ticket);
                                }
                              }}
                              sx={{
                                cursor: 'pointer',
                                transition: 'background-color 0.12s ease',
                                '&:hover': {
                                  bgcolor: isLight ? alpha(theme.palette.primary.main, 0.04) : alpha(theme.palette.primary.main, 0.08),
                                },
                                '&:focus-visible': {
                                  outline: `2px solid ${theme.palette.primary.main}`,
                                  outlineOffset: -2,
                                },
                                '& td': {
                                  py: 1.75,
                                  borderBottom: `1px solid ${theme.palette.divider}`,
                                },
                              }}
                              onClick={() => handleView(ticket)}
                            >
                              <TableCell>
                                <Tooltip title="View ticket details" arrow>
                                  <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{
                                      fontFamily: 'monospace',
                                      color: 'primary.main',
                                      fontSize: '0.8rem',
                                      textDecoration: 'underline',
                                      textDecorationColor: alpha(theme.palette.primary.main, 0.35),
                                      textUnderlineOffset: 3,
                                      width: 'fit-content',
                                    }}
                                  >
                                    #{ticket.id}
                                  </Typography>
                                </Tooltip>
                              </TableCell>

                              <TableCell>
                                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 130 }}>
                                  {ticket.fullName || '—'}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 160, fontSize: '0.8rem' }}>
                                  {ticket.email || '—'}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>
                                  {ticket.bookingReference || '—'}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>
                                  {formatStatus(ticket.topic || '—')}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                                  {formatDate(ticket.createdAt)}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <Chip
                                  size="small"
                                  label={formatStatus(ticket.status)}
                                  sx={{
                                    fontWeight: 800,
                                    fontSize: '0.7rem',
                                    height: 24,
                                    bgcolor: getStatusBg(ticket.status, theme),
                                    color: getStatusMainColor(ticket.status, theme),
                                    border: `1px solid ${alpha(getStatusMainColor(ticket.status, theme), 0.4)}`,
                                  }}
                                />
                              </TableCell>

                              <TableCell sx={{ maxWidth: 220 }}>
                                <Tooltip title={ticket.description || ''} arrow disableHoverListener={!ticket.description}>
                                  <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                                    {ticket.description
                                      ? ticket.description.length > 45
                                        ? `${ticket.description.substring(0, 45)}…`
                                        : ticket.description
                                      : '—'}
                                  </Typography>
                                </Tooltip>
                              </TableCell>

                              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <Tooltip title="View details" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleView(ticket)}
                                      aria-label={`View ticket ${ticket.id}`}
                                      sx={{
                                        color: 'primary.main',
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
                                      }}
                                    >
                                      <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>

                                  <Tooltip title="Update status" arrow>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleOpenStatus(ticket)}
                                      aria-label={`Update status for ticket ${ticket.id}`}
                                      sx={{
                                        color: 'warning.main',
                                        '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.1) },
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
          
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {!loading && filteredTickets.length === 0 && <EmptyState hasFilters={hasFilters} />}

                <Divider />

                <TablePagination
                  component="div"
                  count={filteredTickets.length}
                  page={page}
                  onPageChange={(_, nextPage) => setPage(nextPage)}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  sx={{
                    borderTop: 'none',
                    '& .MuiTablePagination-select': { fontWeight: 700 },
                  }}
                />
              </>
            )}
          </Paper>
        </Stack>
      </Container>

      <TicketDrawer
        open={drawerOpen}
        ticket={selectedTicket}
        messages={messages}
        messageLoading={messageLoading}
        replyMessage={replyMessage}
        setReplyMessage={setReplyMessage}
        sendReply={sendReply}
        sending={sendingReply}
        onClose={() => setDrawerOpen(false)}
        onUpdateStatus={handleOpenStatus}
      />
      <StatusDialog
        open={statusDialogOpen}
        ticket={statusTicket}
        onClose={() => setStatusDialogOpen(false)}
        onSubmit={handleStatusUpdate}
        loading={statusLoading}
      />
    </Box>
  );
}