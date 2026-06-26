import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  LinearProgress,
  Divider,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

// --- Status config ---
const STATUS_CONFIG = {
  loading: {
    icon: null,
    color: 'info.main',
    bg: 'info.50',
    title: 'Verifying your email…',
    body: 'Hold tight — this only takes a moment.',
  },
  missing: {
    icon: WarningAmberIcon,
    color: 'warning.main',
    bg: 'warning.50',
    title: 'No verification token found',
    body: 'The link you followed appears to be incomplete. Check your inbox for the original verification email and try again.',
  },
  failed: {
    icon: ErrorOutlineIcon,
    color: 'error.main',
    bg: 'error.50',
    title: 'Verification failed',
    body: null, // dynamic
  },
  verified: {
    icon: CheckCircleOutlineIcon,
    color: 'success.main',
    bg: 'success.50',
    title: 'Email verified!',
    body: 'Your SouthRail account is now active. You\'re being redirected to the login page in a few seconds.',
  },
};

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('missing');
      return;
    }
    let redirectTimer;
    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('verified');
        redirectTimer = window.setTimeout(() => {
          navigate('/login');
        }, 3000);
      })
      .catch((apiError) => {
        setError(
          getApiErrorMessage(
            apiError,
            'Verification link is invalid, expired, or already used.'
          )
        );
        setStatus('failed');
      });
    return () => {
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [navigate, searchParams]);

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.loading;
  const Icon = cfg.icon;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
       bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
        {/* Brand header */}
        <Stack alignItems="center" spacing={0.5} sx={{ mb: { xs: 2.5, sm: 4 } }}>
          <MarkEmailReadOutlinedIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={700} letterSpacing={-0.3}>
            SouthRail
          </Typography>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            overflow: 'hidden',
            width: '100%',
            minWidth: 0,
          }}
        >
          {/* Progress bar shown only while loading */}
          {status === 'loading' && (
            <LinearProgress sx={{ height: 3 }} />
          )}

          <Stack spacing={0}>
            {/* Status banner */}
            <Box
              sx={{
                px: { xs: 2, sm: 5 },
                pt: { xs: 4, sm: 5 },
                pb: 3,
                bgcolor: cfg.bg,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'center', sm: 'flex-start' }} textAlign={{ xs: 'center', sm: 'left' }}>
                {Icon && (
                  <Icon sx={{ fontSize: 28, color: cfg.color, mt: 0.3, flexShrink: 0 }} />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" fontWeight={700} color={cfg.color} gutterBottom>
                    {cfg.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                    {status === 'failed'
                      ? (error || 'Verification link is invalid, expired, or already used.')
                      : cfg.body}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Detail body */}
            <Box sx={{ px: { xs: 1.75, sm: 2.5 }, py: { xs: 2, sm: 2.5 } }}>
              {status === 'loading' && (
                <Typography variant="body2" color="text.secondary">
                  We're confirming your email address with our servers. This usually completes within a second.
                </Typography>
              )}

              {status === 'verified' && (
                <Stack spacing={2.5}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, overflowWrap: 'anywhere' }}>
                    Welcome aboard! Your account is fully set up. Once you log in you can manage bookings, view upcoming trips, and update your travel preferences from your dashboard.
                  </Typography>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.disabled" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                      What's next
                    </Typography>
                    {[
                      'Log in to your SouthRail account',
                      'Browse and book your first trip',
                      'Set up travel alerts and preferences',
                    ].map((step) => (
                      <Stack key={step} direction="row" sx={{ minWidth: 0 }} spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: 'success.main',
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {step}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              )}

              {(status === 'failed' || status === 'missing') && (
                <Stack spacing={2.5}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, overflowWrap: 'anywhere' }}>
                    {status === 'missing'
                      ? 'Verification links are single-use and expire after 24 hours. If you requested a new one, please use the most recent email in your inbox.'
                      : 'Verification links are single-use and expire after 24 hours. If you have already verified your email, you can log in directly. Otherwise, request a fresh link from the login page.'}
                  </Typography>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.disabled" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                      Things to check
                    </Typography>
                    {[
                      'Look for the most recent verification email in your inbox',
                      'Check your spam or junk folder',
                      'Make sure you opened the full link from the email',
                    ].map((tip) => (
                      <Stack key={tip} direction="row" sx={{ minWidth: 0 }} spacing={1} alignItems="center">
                        <Box
                          sx={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            bgcolor: 'warning.main',
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {tip}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              )}

              {/* CTA */}
              {status !== 'loading' && (
                <Box sx={{ mt: 3.5 }}>
                  <Button
                    component={Link}
                    to="/login"
                    variant="contained"
                    size="large"
                    fullWidth
                    disableElevation
                    sx={{ borderRadius: 2, py: 1.25, fontWeight: 600 }}
                  >
                    {status === 'verified' ? 'Go to login' : 'Back to login'}
                  </Button>
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>

        {/* Footer note */}
        <Typography
          variant="caption"
          color="text.disabled"
          display="block"
          textAlign="center"
          sx={{ mt: 3 }}
        >
          Having trouble?{' '}
          <Box
            component={Link}
            to="/support"
            sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Contact support
          </Box>
        </Typography>
      </Container>
    </Box>
  );
}