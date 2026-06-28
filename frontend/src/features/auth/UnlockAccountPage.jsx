import { useEffect, useState, useRef } from 'react';
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
import { alpha } from '@mui/material/styles';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import TrainIcon from '@mui/icons-material/Train';
const STATUS_CONFIG = {
  loading: {
    icon: LockOpenOutlinedIcon,
    color: 'info.main',
    bg: (theme) => alpha(theme.palette.info.main, 0.1),
    title: 'Unlocking your account…',
    body: 'Please wait while we verify your unlock link.',
  },
  missing: {
    icon: WarningAmberIcon,
    color: 'warning.main',
    bg: (theme) => alpha(theme.palette.warning.main, 0.1),
    title: 'No unlock token found',
    body: 'The link you followed appears to be incomplete. Check your inbox for the original unlock email and try again.',
  },
  failed: {
    icon: ErrorOutlineIcon,
    color: 'error.main',
    bg: (theme) => alpha(theme.palette.error.main, 0.1),
    title: 'Unable to unlock account',
    body: null, // dynamic
  },
  success: {
    icon: CheckCircleOutlineIcon,
    color: 'success.main',
    bg: (theme) => alpha(theme.palette.success.main, 0.1),
    title: 'Account unlocked!',
    body: 'Your SouthRail account is active again. You\'re being redirected to the login page in a few seconds.',
  },
};

export default function UnlockAccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const hasCalled = useRef(false);

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;
    let active = true;
    let redirectTimer;

    const token = searchParams.get('token');

    if (!token) {
      setStatus('missing');
      return;
    }

    (async () => {
      try {
        await api.post('/auth/unlock-account', { token });
        if (!active) return;
        setStatus('success');
        redirectTimer = setTimeout(() => {
          if (active) navigate('/login');
        }, 5000);
      } catch (apiError) {
        if (!active) return;
        setError(
          getApiErrorMessage(
            apiError,
            'Unlock link is invalid, expired, or already used.'
          )
        );
        setStatus('failed');
      }
    })();

    return () => {
      active = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [searchParams]);

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.loading;
  const Icon = cfg.icon;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
        {/* Brand header */}
        <Stack alignItems="center" spacing={0.5} sx={{ mb: { xs: 2.5, sm: 4 } }}>
          <TrainIcon color="primary" />
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
          {status === 'loading' && <LinearProgress sx={{ height: 3 }} />}

          <Stack spacing={0}>
            {/* Status banner */}
            <Box
              aria-live="polite"
              sx={{
                px: { xs: 2, sm: 5 },
                pt: { xs: 4, sm: 5 },
                pb: 3,
                bgcolor: (theme) => cfg.bg(theme),
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
                      ? (error || 'Unlock link is invalid, expired, or already used.')
                      : cfg.body}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Detail body */}
            <Box sx={{ px: { xs: 1.75, sm: 2.5 }, py: { xs: 2, sm: 2.5 } }}>

              {status === 'loading' && (
                <Typography variant="body2" color="text.secondary">
                  We're processing your unlock request. This usually completes within a second.
                </Typography>
              )}

              {status === 'success' && (
                <Stack spacing={2.5}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, overflowWrap: 'anywhere' }}>
                    Your account has been restored and is fully accessible. To keep your account safe going forward, consider reviewing your recent login activity and updating your password after signing in.
                  </Typography>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.disabled" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                      Recommended next steps
                    </Typography>
                    {[
                      'Log in to your SouthRail account',
                      'Review recent login activity in security settings',
                      'Update your password if you suspect unauthorized access',
                    ].map((step) => (
                      <Stack key={step} direction="row" sx={{ minWidth: 0 }} spacing={1} alignItems="center">
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary">{step}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              )}

              {(status === 'failed' || status === 'missing') && (
                <Stack spacing={2.5}>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, overflowWrap: 'anywhere' }}>
                    {status === 'missing'
                      ? 'Unlock links are single-use and expire after 24 hours. Please check your inbox for the most recent unlock email and use the link from that message.'
                      : 'Unlock links are single-use and expire after 24 hours. If your account is still locked, contact our support team and we\'ll help you regain access.'}
                  </Typography>
                  <Divider />
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.disabled" fontWeight={600} textTransform="uppercase" letterSpacing={0.8}>
                      Things to check
                    </Typography>
                    {[
                      'Look for the most recent unlock email in your inbox',
                      'Check your spam or junk folder',
                      'Make sure you opened the full, unmodified link from the email',
                    ].map((tip) => (
                      <Stack key={tip} direction="row" sx={{ minWidth: 0 }} spacing={1} alignItems="center">
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary">{tip}</Typography>
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
                    {status === 'success' ? 'Go to login' : 'Back to login'}
                  </Button>
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>

        {/* Footer */}
        <Typography
          variant="caption"
          color="text.disabled"
          display="block"
          textAlign="center"
          sx={{ mt: 3 }}
        >
          Need help accessing your account?{' '}
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