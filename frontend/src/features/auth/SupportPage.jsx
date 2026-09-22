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
import { getApiErrorMessage } from '../../utils/apiErrors.js';
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

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
    answer: 'SouthRail locks accounts after several consecutive failed login attempts to protect your data. We automatically send an unlock link to your registered email address. Open that email and click the link. If you can\'t find the email, check your spam folder. Links expire after 24 hours; contact support if you need help.',
  },
  {
    id: 2, category: 'account', icon: AccountCircleOutlinedIcon,
    question: 'How do I verify my email address?',
    answer: 'After registering, SouthRail sends a verification email to the address you provided. Open the most recent verification email and follow its link to activate your account. If the link is missing or no longer valid, contact support for help.',
  },
  {
    id: 3, category: 'account', icon: LockResetIcon,
    question: 'I forgot my password. How do I reset it?',
    answer: 'On the login page, select "Forgot password?" and enter your email address. SouthRail will send a password reset link if an account exists for that address. If you don\'t receive it within a few minutes, check your spam folder before trying again.',
  },
  {
    id: 4, category: 'account', icon: AccountCircleOutlinedIcon,
    question: 'How do I update my email address or phone number?',
    answer: 'Open your profile to update your name or phone number. Email-address changes are not currently supported. Contact SouthRail support if you no longer have access to your registered email.',
  },
  {
    id: 5, category: 'bookings', icon: ConfirmationNumberOutlinedIcon,
    question: 'How do I cancel or modify a booking?',
    answer: 'Open your Dashboard, find the trip, and select "Cancel" for an eligible Confirmed, RAC, or Waitlisted booking. SouthRail shows the cancellation charge and expected refund before you confirm. Booking modifications are not currently supported.',
  },
  {
    id: 6, category: 'bookings', icon: ConfirmationNumberOutlinedIcon,
    question: 'Where do I find my booking confirmation?',
    answer: 'Confirmations are emailed after booking. You can also find your bookings on the Dashboard. Each booking has a unique PNR that you can use to check status and access supported ticket actions.',
  },
  {
    id: 7, category: 'bookings', icon: TrainOutlinedIcon,
    question: 'How are seats allocated?',
    answer: 'SouthRail allocates seats based on train availability, travel class, and passenger berth preference. Final seat or queue status is confirmed during the booking process; manual seat selection is not currently available.',
  },
  {
    id: 8, category: 'payments', icon: CreditCardOutlinedIcon,
    question: 'What payment methods are accepted?',
    answer: 'The payment methods currently available for your order are shown securely in Razorpay checkout and can vary by provider availability. SouthRail does not store your card, bank, or UPI credentials.',
  },
  {
    id: 9, category: 'payments', icon: CreditCardOutlinedIcon,
    question: 'Why was my payment declined?',
    answer: 'Payments can be declined because of bank limits, security checks, insufficient funds, or payment-provider issues. Try another available method if appropriate. If money was debited but your booking is not confirmed, check the payment or booking status before retrying and contact support if the issue remains unresolved.',
  },
  {
    id: 10, category: 'payments', icon: CreditCardOutlinedIcon,
    question: 'How do I get a refund?',
    answer: 'For an eligible cancellation, SouthRail shows the refund amount before you confirm and initiates the supported refund process after cancellation. The time for funds to appear can depend on the payment provider and your bank. Contact support if a completed refund remains unresolved.',
  },
  {
    id: 11, category: 'travel', icon: TrainOutlinedIcon,
    question: 'What happens if my train is delayed or cancelled?',
    answer: 'You can check booking status and available journey information through SouthRail. Cancellation or refund eligibility is shown through the supported cancellation flow when applicable.',
  },
  {
    id: 12, category: 'travel', icon: TrainOutlinedIcon,
    question: 'What luggage am I allowed to bring?',
    answer: 'Please refer to the applicable railway travel guidelines for luggage and baggage restrictions. SouthRail currently does not manage baggage reservations or baggage-fee calculations.',
  },
  {
    id: 13, category: 'notifications', icon: NotificationsNoneOutlinedIcon,
    question: 'How do I manage travel alerts and notifications?',
    answer: 'SouthRail sends supported booking and account notifications automatically. Notification preferences are not configurable in the app yet.',
  },
  {
    id: 14, category: 'notifications', icon: NotificationsNoneOutlinedIcon,
    question: 'I\'m not receiving emails from SouthRail. What should I do?',
    answer: 'First, check your spam or junk folder and confirm that your registered email address is correct. If messages are still missing, create a support ticket so the issue can be investigated.',
  },
];

const CONTACT_CHANNELS = [
  {
    icon: EmailOutlinedIcon,
    title: 'Email support',
    description: 'Use email for account or booking questions that cannot be resolved in the app.',
    action: 'support@southrail.in',
    href: 'mailto:support@southrail.in',
  },
];

const POLICIES = [
  { title: 'My support tickets', description: 'Review existing requests and continue conversations with support.', to: '/my-tickets' },
  { title: 'PNR enquiry', description: 'View the current booking status for a PNR.', to: '/pnr' },
  { title: 'Account settings', description: 'Manage supported profile and security settings.', to: '/profile' },
];

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

const FaqItem = memo(function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  const handleToggle = useCallback(() => setOpen((v) => !v), []);
  const answerId = `faq-answer-${item.id}`;

  return (
    <Paper
      elevation={0}
      sx={open ? sxFaqPaperOpen : sxFaqPaperClosed}
    >
      <Box
        component="button"
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={answerId}
        sx={{
          width: '100%',
          border: 0,
          color: 'text.primary',
          font: 'inherit',
          textAlign: 'left',
          px: { xs: 2, sm: 3 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          userSelect: 'none',
          bgcolor: open ? 'action.selected' : 'transparent',
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: open ? 'action.selected' : 'action.hover' },
          '&:focus-visible': {
            outline: 2,
            outlineColor: 'primary.main',
            outlineOffset: -2,
          },
        }}
      >
        <Icon sx={{ fontSize: 20, color: open ? 'primary.main' : 'text.disabled', flexShrink: 0 }} />
        <Typography component="span" variant="body1" fontWeight={600} sx={{ flex: 1, lineHeight: 1.4 }}>
          {item.question}
        </Typography>
        {open
          ? <ExpandLessIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
          : <ExpandMoreIcon sx={{ color: 'text.disabled', flexShrink: 0 }} />}
      </Box>
      <Collapse in={open}>
        <Box id={answerId} sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.75 }}>
            {item.answer}
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
});

const ContactCard = memo(function ContactCard({ channel }) {
  const Icon = channel.icon;
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        p: { xs: 1.4, sm: 1.75 },
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
        {channel.badge && (
          <Chip
            label={channel.badge}
            size="small"
            color={channel.badgeColor}
            variant={channel.badgeColor === 'success' ? 'filled' : 'outlined'}
            sx={{ fontSize: 11 }}
          />
        )}
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

  const filtered = useMemo(
    () => FAQ_ITEMS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = search.trim() === ''
        || item.question.toLowerCase().includes(search.toLowerCase())
        || item.answer.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    }),
    [search, activeCategory],
  );

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  const validateTicket = useCallback(() => {
    const topic = ticket.topic.trim();
    const description = ticket.description.trim();

    if (!topic) return 'Please select a topic.';
    if (!description) return 'Please enter issue description.';
    if (description.length > 5000) return 'Description cannot exceed 5000 characters.';
    return '';
  }, [ticket]);

  const submitTicket = useCallback(async () => {
    setSubmitted(true);
    const validationMessage = validateTicket();

    if (validationMessage) {
      setSnackbar({ open: true, severity: 'error', message: validationMessage });
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/support/tickets', {
        bookingReference: ticket.bookingReference.trim(),
        topic: ticket.topic.trim(),
        description: ticket.description.trim(),
      });

      const ticketId = String(response?.data?.id || 'created');
      const val = ticketId === 'created' ? '' : ` Ticket ID: ${ticketId.slice(0, 8).toUpperCase()}`;
      setSnackbar({
        open: true,
        severity: 'success',
        message: `Support ticket created successfully.${val}`,
      });
      setTicket({ bookingReference: '', topic: '', description: '' });
      setSubmitted(false);
      setDescriptionTouched(false);
    } catch (error) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: getApiErrorMessage(error, 'Failed to create support ticket. Please try again.'),
      });
    } finally {
      setLoading(false);
    }
  }, [ticket, validateTicket]);

  const handleBookingRefChange = useCallback(
    (e) => setTicket((prev) => ({ ...prev, bookingReference: e.target.value })),
    [],
  );
  const handleTopicChange = useCallback(
    (e) => setTicket((prev) => ({ ...prev, topic: e.target.value })),
    [],
  );
  const handleDescriptionChange = useCallback(
    (e) => { setTicket((prev) => ({ ...prev, description: e.target.value })); setDescriptionTouched(true); },
    [],
  );
  const handleDescriptionBlur = useCallback(() => { setDescriptionTouched(true); }, []);
  const handleCategoryClick = useCallback(
    (e) => setActiveCategory(e.currentTarget.dataset.categoryId),
    [],
  );
  const handleSearchChange = useCallback((e) => setSearch(e.target.value), []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: (theme) => theme.palette.background.default }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: { xs: 1.75, sm: 2.5 },
        }}
      >
        <Container maxWidth="md">
          <Stack alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
            <TrainIcon color="primary" />
            <Typography variant="h6" fontWeight={700} letterSpacing={-0.3}>
              SouthRail
            </Typography>
          </Stack>

          <Stack alignItems="center" spacing={1.5} sx={{ mb: 2, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={800} letterSpacing={-0.5} sx={{ fontSize: { xs: '1.35rem', sm: '1.7rem' }, overflowWrap: 'anywhere' }}>
              How can we help?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480 }}>
              Search our help articles or browse by topic below. If you can't find the answer, our support team is a message away.
            </Typography>
          </Stack>

          <Box sx={{ width: '100%', maxWidth: 520, mx: 'auto' }}>
            <TextField
              fullWidth
              label="Search help articles"
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

      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.id}
                  label={cat.label}
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
                    p: 1.5,
                    textAlign: 'center',
                  }}
                >
                  <SearchIcon sx={{ fontSize: 26, color: 'text.disabled', mb: 1 }} />
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

          <Box>
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              <Typography variant="overline" color="text.disabled" fontWeight={600} letterSpacing={1}>
                Still need help?
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                Reach our support team
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use the channel below for questions that need personal assistance.
              </Typography>
            </Stack>

            <Grid container spacing={1.5}>
              {CONTACT_CHANNELS.map((ch) => (
                <Grid item xs={12} md={6} key={ch.title}>
                  <ContactCard channel={ch} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
              Service health
            </Typography>
            <Alert severity="info">
              Live service-health information is not currently available in SouthRail. If an action fails, retry from that page or create a support ticket below.
            </Alert>
          </Box>

          <Box>
            <Stack spacing={0.5} sx={{ mb: 1.5 }}>
              <Typography variant="overline" color="text.disabled" fontWeight={600} letterSpacing={1}>
                Useful links
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                Continue in SouthRail
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Open the relevant account, booking, or support page.
              </Typography>
            </Stack>

            <Grid container spacing={1.5}>
              {POLICIES.map((policy) => (
                <Grid item xs={12} sm={6} key={policy.title}>
                  <Button
                    component={Link}
                    to={policy.to}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      py: 1.5,
                      px: 2,
                      justifyContent: 'flex-start',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1.5,
                      textAlign: 'left',
                    }}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 20, mt: 0.2, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="body2" fontWeight={700} gutterBottom>
                        {policy.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        {policy.description}
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider />

          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              p: { xs: 1.5, sm: 2 },
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
            }}
          >
            <Stack spacing={1.5}>
              <Stack spacing={0.4}>
                <Typography variant="overline" color="text.disabled" fontWeight={600} letterSpacing={1}>
                  Can't find what you're looking for?
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  Submit a support ticket
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Describe your issue and we'll assign it to the appropriate support queue.
                </Typography>
              </Stack>

              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Booking reference (optional)"
                    size="small"
                    value={ticket.bookingReference}
                    onChange={handleBookingRefChange}
                    inputProps={{ maxLength: 20 }}
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
                    minRows={3}
                    value={ticket.description}
                    onChange={handleDescriptionChange}
                    onBlur={handleDescriptionBlur}
                    error={submitted && (!ticket.description.trim() || ticket.description.trim().length > 5000)}
                    helperText={
                      submitted && !ticket.description.trim()
                        ? 'Description is required'
                        : submitted && ticket.description.trim().length > 5000
                          ? 'Description cannot exceed 5000 characters'
                          : descriptionTouched ? `${ticket.description.length}/5000` : ''
                    }
                    inputProps={{ maxLength: 5000 }}
                  />
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={submitTicket}
                  disabled={loading}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  {loading ? 'Submitting...' : 'Submit ticket'}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={snackbar.severity}
            variant="filled"
            aria-live="polite"
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
