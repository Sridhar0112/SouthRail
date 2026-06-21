import { useState, useMemo, useCallback, memo,useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Snackbar,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Divider,
  Grid,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../../services/api.js';
import TrainIcon from '@mui/icons-material/Train';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LockResetIcon from '@mui/icons-material/LockReset';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import TrainOutlinedIcon from '@mui/icons-material/TrainOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// ─── Data ────────────────────────────────────────────────────────────────────
// All static data stays at module scope (unchanged).

const CATEGORIES = [
  { id: 'all', label: 'All topics' },
  { id: 'account', label: 'Account & login' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'payments', label: 'Payments' },
  { id: 'travel', label: 'Travel info' },
  { id: 'notifications', label: 'Notifications' },
];

const FAQ_ITEMS = [
  {
    id: 1, category: 'account', icon: LockResetIcon,
    question: 'My account is locked. How do I unlock it?',
    answer: 'SouthRail locks accounts after several consecutive failed login attempts to protect your data. We automatically send an unlock link to your registered email address. Open that email and click the link — your account will be restored immediately. If you can\'t find the email, check your spam folder. Links expire after 24 hours; contact support if you need a new one.',
  },
  {
    id: 2, category: 'account', icon: AccountCircleOutlinedIcon,
    question: 'How do I verify my email address?',
    answer: 'After registering, we send a verification email to the address you provided. Click the link inside to activate your account. If the link has expired or you didn\'t receive the email, log in and go to Account Settings → Email → Resend verification. Verification links are valid for 24 hours.',
  },
  {
    id: 3, category: 'account', icon: LockResetIcon,
    question: 'I forgot my password. How do I reset it?',
    answer: 'On the login page, click "Forgot password?" and enter your email address. We\'ll send you a password reset link valid for 1 hour. If you don\'t receive it within a few minutes, check your spam folder or try again. For security reasons, reset links can only be used once.',
  },
  {
    id: 4, category: 'account', icon: AccountCircleOutlinedIcon,
    question: 'How do I update my email address or phone number?',
    answer: 'Go to Account Settings → Personal details. You can update your email or phone number there. Changing your email will require re-verification — we\'ll send a link to your new address. Your old email remains active until the new one is confirmed.',
  },
  {
    id: 5, category: 'bookings', icon: ConfirmationNumberOutlinedIcon,
    question: 'How do I cancel or modify a booking?',
    answer: 'Open My Bookings, find the trip, and select "Modify" or "Cancel." You can cancel eligible Confirmed, RAC, and Waitlisted bookings through SouthRail. Before cancellation, the system calculates the applicable cancellation charge, refund percentage, and refund amount based on the configured cancellation policy.',
  },
  {
    id: 6, category: 'bookings', icon: ConfirmationNumberOutlinedIcon,
    question: 'Where do I find my booking confirmation?',
    answer: 'Confirmations are emailed immediately after booking. You can also find all your bookings under My Bookings in the app or website. Each booking has a unique reference number — keep it handy for check-in and customer service queries.',
  },
  {
    id: 7, category: 'bookings', icon: TrainOutlinedIcon,
    question: 'How are seats allocated?',
    answer: 'SouthRail automatically allocates seats based on train availability, travel class, and passenger berth preference. Seat allocation occurs during booking and manual seat selection is currently not available.',
  },
  {
    id: 8, category: 'payments', icon: CreditCardOutlinedIcon,
    question: 'What payment methods are accepted?',
    answer: 'We accept Visa, Mastercard, American Express, UPI, net banking, and SouthRail Travel Wallet. All payments are processed over encrypted connections. We do not store full card numbers on our servers.',
  },
  {
    id: 9, category: 'payments', icon: CreditCardOutlinedIcon,
    question: 'Why was my payment declined?',
    answer: 'Payments can be declined for several reasons: insufficient funds, card limits, bank security checks, or incorrect card details. Try a different payment method or contact your bank. If the amount was deducted but the booking failed, the charge will be automatically reversed within 3–5 business days.',
  },
  {
    id: 10, category: 'payments', icon: CreditCardOutlinedIcon,
    question: 'How do I get a refund?',
    answer: 'Eligible refunds are automatically initiated when you cancel a booking. The amount is returned to the original payment method within 5–7 business days. For Travel Wallet refunds, credit appears within 24 hours. If your refund hasn\'t arrived after 7 business days, contact support with your booking reference.',
  },
  {
    id: 11, category: 'travel', icon: TrainOutlinedIcon,
    question: 'What happens if my train is delayed or cancelled?',
    answer: 'Passengers can check booking status and train information through SouthRail. Any refund or cancellation eligibility is determined through the cancellation and refund process supported by the system.',
  },
  {
    id: 12, category: 'travel', icon: TrainOutlinedIcon,
    question: 'What luggage am I allowed to bring?',
    answer: 'Please refer to railway travel guidelines for luggage and baggage restrictions. SouthRail currently does not manage baggage reservations or baggage fee calculations.',
  },
  {
    id: 13, category: 'notifications', icon: NotificationsNoneOutlinedIcon,
    question: 'How do I manage travel alerts and notifications?',
    answer: 'Go to Account Settings → Notifications. You can choose to receive departure reminders, delay alerts, and booking confirmations via email, SMS, or push notification. We recommend enabling at least email alerts so you never miss a schedule change.',
  },
  {
    id: 14, category: 'notifications', icon: NotificationsNoneOutlinedIcon,
    question: 'I\'m not receiving emails from SouthRail. What should I do?',
    answer: 'First, check your spam or junk folder and mark SouthRail emails as "Not spam." Add support@southrail.com to your contacts. If the problem persists, verify that your registered email address is correct in Account Settings. Still nothing? Contact support and we\'ll investigate.',
  },
];

const CONTACT_CHANNELS = [
  {
    icon: EmailOutlinedIcon,
    title: 'Email support',
    description: 'Send us a message and we\'ll get back to you within 24 hours on business days.',
    action: 'Send an email',
    href: 'mailto:support@southrail.com',
    badge: 'Avg. reply: 4 hrs',
    badgeColor: 'success',
  },
  {
    icon: ChatBubbleOutlineIcon,
    title: 'Live chat',
    description: 'Chat with a support agent in real time. Available Monday–Saturday, 6 am–10 pm.',
    action: 'Start a chat',
    href: '#chat',
    badge: 'Online now',
    badgeColor: 'success',
  },
  {
    icon: PhoneOutlinedIcon,
    title: 'Phone support',
    description: 'Speak to someone directly. Best for urgent issues like same-day cancellations.',
    action: '1800-SOUTHRAIL',
    href: 'tel:1800768847245',
    badge: 'Mon–Sat 6 am–10 pm',
    badgeColor: 'default',
  },
];

const STATUS_ITEMS = [
  { label: 'Booking system', ok: true },
  { label: 'Payment processing', ok: true },
  { label: 'Email delivery', ok: true },
  { label: 'Live train data', ok: true },
  { label: 'Mobile app', ok: false, note: 'Intermittent delays (investigating)' },
];

// ─── OPTIMIZATION 1: Hoist static policy array out of JSX to module scope ────
// Previously defined inline in JSX — recreated as a new array reference on
// every render, forcing React to diff all four Grid children unnecessarily.
// Impact: Medium.
const POLICIES = [
  {
    title: 'Cancellation & Refund Policy',
    description:
      'Eligible bookings can be cancelled through the SouthRail cancellation process. Refund amount, cancellation charges, and refund percentage are automatically calculated according to the configured cancellation policy before cancellation is confirmed.',
    to: '/policies/refunds',
  },
  {
    title: 'Baggage policy',
    description: 'Permitted luggage sizes and weights, oversized items, and how to pre-book extra bags.',
    to: '/policies/baggage',
  },
  {
    title: 'Accessibility & assistance',
    description: 'Services available for passengers with reduced mobility, visual or hearing impairments, and special dietary needs.',
    to: '/policies/accessibility',
  },
  {
    title: 'Privacy policy',
    description: 'How we collect, use, and protect your personal data in line with applicable regulations.',
    to: '/policies/privacy',
  },
];

// ─── OPTIMIZATION 2: Stable sx objects at module scope ───────────────────────
// Inline `sx` objects are new references every render. Hoisting stable,
// non-dynamic ones prevents MUI's `sx` prop resolver from rerunning needlessly.
// Impact: Low (accumulates across many elements).
const sxPolicyPaper = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  p: 2,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 1.5,
  textDecoration: 'none',
  color: 'inherit',
  transition: 'border-color 0.15s, background-color 0.15s',
};

const sxInfoIcon = { fontSize: 20, color: 'primary.main', mt: 0.2, flexShrink: 0 };

const sxFaqPaperOpen = {
  border: '1px solid',
  borderColor: 'primary.main',
  borderRadius: 2,
  overflow: 'hidden',
  transition: 'border-color 0.15s',
};

const sxFaqPaperClosed = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  overflow: 'hidden',
  transition: 'border-color 0.15s',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// OPTIMIZATION 3: Wrap FaqItem in React.memo ──────────────────────────────────
// Without memo, every keystroke in the search box (which updates parent state)
// re-renders *all* currently visible FaqItem instances even though their props
// haven't changed. With 14 items each containing Collapse + icons + Typography,
// this is a meaningful reconciliation cost.
// Impact: High.
const FaqItem = memo(function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  // OPTIMIZATION 4: useCallback for the toggle handler ─────────────────────
  // Prevents a new function reference being created on every FaqItem render.
  // Especially relevant now that FaqItem is memoized — a new handler reference
  // would bust the memo on every parent render even with no prop change.
  // Impact: Low-medium (complements memo).
  const handleToggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <Paper
      elevation={0}
      sx={open ? sxFaqPaperOpen : sxFaqPaperClosed}
    >
      <Box
        onClick={handleToggle}
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          userSelect: 'none',
          bgcolor: open ? 'action.selected' : 'transparent',
          transition: 'background-color 0.15s',
        }}
      >
        <Icon sx={{ fontSize: 20, color: open ? 'primary.main' : 'text.disabled', flexShrink: 0 }} />
        <Typography variant="body1" fontWeight={600} sx={{ flex: 1, lineHeight: 1.4 }}>
          {item.question}
        </Typography>
        {open
          ? <ExpandLessIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
          : <ExpandMoreIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />}
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: { xs: 2.5, sm: 3 }, pb: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            {item.answer}
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
});

// OPTIMIZATION 5: Wrap ContactCard in React.memo ──────────────────────────────
// ContactCard receives a stable object reference from the module-scope
// CONTACT_CHANNELS array. With memo, the three cards skip reconciliation
// entirely whenever parent state (search, category, ticket) changes.
// Impact: Medium.
const ContactCard = memo(function ContactCard({ channel }) {
  const Icon = channel.icon;
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: { xs: 2, sm: 2.5 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" spacing={1.5}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: 'action.selected',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ color: 'primary.main', fontSize: 22 }} />
        </Box>
        <Chip
          label={channel.badge}
          size="small"
          color={channel.badgeColor}
          variant={channel.badgeColor === 'success' ? 'filled' : 'outlined'}
          sx={{ fontSize: 11, height: 22 }}
        />
      </Stack>
      <Box>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {channel.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          {channel.description}
        </Typography>
      </Box>
      <Box sx={{ mt: 'auto', pt: 1 }}>
        <Button
          href={channel.href}
          variant="outlined"
          size="small"
          endIcon={<ArrowForwardIcon fontSize="small" />}
          sx={{ borderRadius: 2, fontWeight: 600, textTransform: 'none' }}
        >
          {channel.action}
        </Button>
      </Box>
    </Paper>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  
  const [search, setSearch] = useState('');
  
   const [snackbar, setSnackbar] = useState({
  open: false,
  severity: 'success',
  message: '',
});

  const [ticket, setTicket] = useState({
    bookingReference: '',
    topic: '',
    description: '',
  });
  const [activeCategory, setActiveCategory] = useState('all');

  // OPTIMIZATION 6: useMemo for the filtered FAQ list ───────────────────────
  // The .filter() previously ran on every render regardless of whether search
  // or activeCategory had changed. useMemo ensures it only reruns when those
  // two values actually change — not on ticket field keystrokes, for example.
  // Impact: Medium.
  const filtered = useMemo(
    () =>
      FAQ_ITEMS.filter((item) => {
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        const matchesSearch =
          search.trim() === '' ||
          item.question.toLowerCase().includes(search.toLowerCase()) ||
          item.answer.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
      }),
    [search, activeCategory],
  );

  // OPTIMIZATION 7: useCallback for submitTicket ────────────────────────────
  // Previously an inline async function recreated on every render. As a
  // useCallback it gets a stable reference; the Button's onClick prop stays
  // referentially equal between renders, preventing unnecessary Button
  // reconciliation. ticket is listed as a dependency so it always closes over
  // the latest form values — identical behaviour to before.
  // Impact: Low-medium.
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const validateTicket = useCallback(() => {
  const topic = ticket.topic.trim();
  const description = ticket.description.trim();

  if (!topic) {
    return 'Please select a topic.';
  }

  if (!description) {
    return 'Please enter issue description.';
  }

  if (description.length < 10) {
    return 'Description must contain at least 10 characters.';
  }

  if (description.length > 1000) {
    return 'Description cannot exceed 1000 characters.';
  }

  return '';
}, [ticket]);

const submitTicket = useCallback(async () => {
  setSubmitted(true);

  const validationMessage = validateTicket();

  if (validationMessage) {
    setSnackbar({
      open: true,
      severity: 'error',
      message: validationMessage,
    });
    return;
  }

  try {
    setLoading(true);

    const response = await api.post('/support/tickets', {
      bookingReference: ticket.bookingReference.trim(),
      topic: ticket.topic.trim(),
      description: ticket.description.trim(),
    });

    const val=response?.data?.id.slice(0, 8).toUpperCase();
    setSnackbar({
      open: true,
      severity: 'success',
      message: `Support ticket created successfully. Ticket ID: ${val}`,
    });

    setTicket({
      bookingReference: '',
      topic: '',
      description: '',
    });

    setSubmitted(false);
  } catch (error) {
    console.error(error);
    setSnackbar({
      open: true,
      severity: 'error',
      message: 'Failed to create support ticket. Please try again.',
    });
  } finally {
    setLoading(false);
  }
}, [ticket, validateTicket]);

  // OPTIMIZATION 8: useCallback for ticket field onChange handlers ──────────
  // Each TextField previously received a new arrow function on every render.
  // Stable callbacks mean MUI's TextField internals don't needlessly
  // re-subscribe to prop changes while the user types in a different field.
  // Impact: Low-medium (4 fields × every parent render = noticeable on slower
  // devices when the ticket form is visible alongside the full FAQ list).

  const handleBookingRefChange = useCallback(
    (e) => setTicket((prev) => ({ ...prev, bookingReference: e.target.value })),
    [],
  );
  const handleTopicChange = useCallback(
    (e) => setTicket((prev) => ({ ...prev, topic: e.target.value })),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e) => setTicket((prev) => ({ ...prev, description: e.target.value })),
    [],
  );

  // OPTIMIZATION 9: useCallback for category chip click handler ─────────────
  // The Chip onClick previously received a new closure per category per render.
  // A single stable handler using the chip's data attribute avoids 6 new
  // function allocations on every render cycle.
  // Impact: Low.
  const handleCategoryClick = useCallback(
    (e) => setActiveCategory(e.currentTarget.dataset.categoryId),
    [],
  );

  // OPTIMIZATION 10: useCallback for search onChange ────────────────────────
  // Keeps the TextField's onChange prop referentially stable so MUI doesn't
  // re-run its internal effect that watches for prop changes.
  // Impact: Low.
  const handleSearchChange = useCallback((e) => setSearch(e.target.value), []);
  
useEffect(() => {
  window.scrollTo(0, 0);
}, []);
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (theme) => theme.palette.background.default }}>

      {/* ── Hero ── */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 3, sm: 5 },
        }}
      >
        <Container maxWidth="md">
          <Stack alignItems="center" spacing={1} sx={{ mb: 5 }}>
            <TrainIcon color="primary" />
            <Typography variant="h6" fontWeight={700} letterSpacing={-0.3}>
              SouthRail
            </Typography>
          </Stack>

          <Stack alignItems="center" spacing={1.5} sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h3" fontWeight={800} letterSpacing={-0.5} sx={{ fontSize: { xs: '1.55rem', sm: '2.15rem' }, overflowWrap: 'anywhere' }}>
              How can we help?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480 }}>
              Search our help articles or browse by topic below. If you can't find the answer, our support team is a message away.
            </Typography>
          </Stack>

          <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}>
            <TextField
              fullWidth
              placeholder="Search — e.g. cancel booking, locked account, refund…"
              value={search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': { borderRadius: 2 },
              }}
            />
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: { xs: 5, sm: 7 } }}>
        <Stack spacing={7}>

          {/* ── FAQ ── */}
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.id}
                  label={cat.label}
                  // Pass the id via data attribute so the single stable
                  // handleCategoryClick handler can read it without a closure
                  // per chip (see Optimization 9).
                  data-category-id={cat.id}
                  onClick={handleCategoryClick}
                  color={activeCategory === cat.id ? 'primary' : 'default'}
                  variant={activeCategory === cat.id ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 500, cursor: 'pointer' }}
                />
              ))}
            </Stack>

            <Stack spacing={1.5}>
              {filtered.length > 0 ? (
                filtered.map((item) => <FaqItem key={item.id} item={item} />)
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 2.5,
                    textAlign: 'center',
                  }}
                >
                  <SearchIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" fontWeight={600} gutterBottom>
                    No results for "{search}"
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Try a different keyword, or contact our support team below.
                  </Typography>
                </Paper>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* ── Contact channels ── */}
          <Box>
            <Stack spacing={0.5} sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.disabled" fontWeight={600} letterSpacing={1}>
                Still need help?
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                Reach our support team
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose the channel that suits you. We aim to resolve every query on first contact.
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              {CONTACT_CHANNELS.map((ch) => (
                <Grid item xs={12} md={4} key={ch.title}>
                  <ContactCard channel={ch} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider />

          {/* ── System status ── */}
          <Box>
            <Stack spacing={0.5} sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.disabled" fontWeight={600} letterSpacing={1}>
                System status
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                Service health
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live status of SouthRail systems. Updated every 5 minutes.
              </Typography>
            </Stack>

            <Paper
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              {STATUS_ITEMS.map((s, i) => (
                <Box key={s.label}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 3, py: 2 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: s.ok ? 'success.main' : 'warning.main',
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" fontWeight={500}>
                        {s.label}
                      </Typography>
                      {s.note && (
                        <Typography variant="caption" color="warning.main" fontWeight={500}>
                          — {s.note}
                        </Typography>
                      )}
                    </Stack>
                    <Chip
                      label={s.ok ? 'Operational' : 'Degraded'}
                      size="small"
                      color={s.ok ? 'success' : 'warning'}
                      variant="outlined"
                      sx={{ fontSize: 11, height: 22 }}
                    />
                  </Stack>
                  {i < STATUS_ITEMS.length - 1 && <Divider />}
                </Box>
              ))}
            </Paper>
          </Box>

          <Divider />

          {/* ── Policies quick links ── */}
          <Box>
            <Stack spacing={0.5} sx={{ mb: 3 }}>
              <Typography variant="overline" color="text.disabled" fontWeight={600} letterSpacing={1}>
                Policies
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                Know your rights
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Key policies every SouthRail traveller should be aware of.
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              {/* OPTIMIZATION 1 applied here — iterating module-scope POLICIES array */}
              {POLICIES.map((policy) => (
                <Grid item xs={12} sm={6} key={policy.title}>
                  <Paper
                    elevation={0}
                    component={Link}
                    to={policy.to}
                    sx={sxPolicyPaper}
                  >
                    <InfoOutlinedIcon sx={sxInfoIcon} />
                    <Box>
                      <Typography variant="body2" fontWeight={700} gutterBottom>
                        {policy.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {policy.description}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider />

          {/* ── Submit a ticket ── */}
          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              p: { xs: 1.75, sm: 2.5 },
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
            <Stack spacing={3}>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.disabled" fontWeight={600} letterSpacing={1}>
                  Can't find what you're looking for?
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  Submit a support ticket
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Describe your issue and we'll assign it to the right team. We aim to respond within 4 business hours.
                </Typography>
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
  <TextField
    fullWidth
    label="Booking reference (optional)"
    size="small"
    value={ticket.bookingReference}
    onChange={handleBookingRefChange}
  />
</Grid>

<Grid item xs={12} sm={6}>
  <TextField
  fullWidth
  label="Topic"
  size="small"
  select
  value={ticket.topic}
  onChange={handleTopicChange}
  error={submitted && !ticket.topic.trim()}
  helperText={submitted && !ticket.topic.trim() ? 'Topic is required' : ''}
  SelectProps={{ native: true }}
>
    <option value="">Select a topic…</option>
    <option value="account">Account & login</option>
    <option value="bookings">Bookings & travel</option>
    <option value="payments">Payments & refunds</option>
    <option value="notifications">Notifications</option>
    <option value="other">Something else</option>
  </TextField>
</Grid>
                <Grid item xs={12}>
                  <TextField
  fullWidth
  label="Describe your issue"
  multiline
  minRows={4}
  value={ticket.description}
  onChange={handleDescriptionChange}
  error={
    submitted &&
    (
      !ticket.description.trim() ||
      ticket.description.trim().length < 10 ||
      ticket.description.trim().length > 1000
    )
  }
  helperText={
    submitted && !ticket.description.trim()
      ? 'Description is required'
      : submitted && ticket.description.trim().length < 10
      ? 'Description must contain at least 10 characters'
      : submitted && ticket.description.trim().length > 1000
      ? 'Description cannot exceed 1000 characters'
      : `${ticket.description.length}/1000`
  }
/>
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
               <Button
  variant="contained"
  onClick={submitTicket}
  disabled={loading}
  sx={{ width: { xs: '100%', sm: 'auto' } }}
>
  {loading ? 'Submitting...' : 'Submit ticket'}
</Button>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CheckCircleOutlineIcon sx={{ fontSize: 15, color: 'success.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    Avg. first response in under 4 hours
                  </Typography>
                </Stack>
              </Stack>
            </Stack>
          </Paper>

        </Stack>
<Snackbar
  open={snackbar.open}
  autoHideDuration={3000}
  onClose={() =>
    setSnackbar((prev) => ({
      ...prev,
      open: false,
    }))
  }
  anchorOrigin={{
    vertical: 'bottom',
    horizontal: 'right',
  }}
>
  <Alert
    severity={snackbar.severity}
    variant="filled"
    sx={{
      width: { xs: 'calc(100vw - 32px)', sm: 'auto' },
      minWidth: { xs: 0, sm: 320 },
      borderRadius: 2,
      boxShadow: 6,
    }}
  >
    {snackbar.message}
  </Alert>
</Snackbar>
      </Container>

    </Box>
    
  );
}