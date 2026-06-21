import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

/* ── Password strength ────────────────────────────────────────── */
function getStrength(password) {
  if (!password) return { score: 0, label: '', color: 'inherit' };
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: 'Weak',   key: 'error'   };
  if (score === 2) return { score: 2, label: 'Fair',   key: 'warning' };
  if (score === 3) return { score: 3, label: 'Good',   key: 'info'    };
  return             { score: 4, label: 'Strong', key: 'success' };
}

function PasswordStrength({ password, theme }) {
  const { score, label, key } = getStrength(password);
  if (!password) return null;
  const color = key ? theme.palette[key]?.main : theme.palette.text.disabled;
  return (
    <Box>
      <LinearProgress
        variant="determinate"
        value={(score / 4) * 100}
        sx={{
          height: 5,
          '& .MuiLinearProgress-bar': { backgroundColor: color, transition: 'width 0.3s ease' },
        }}
      />
      <Typography variant="caption" sx={{ color, fontWeight: 600, mt: 0.5, display: 'block' }}>
        {label}
      </Typography>
    </Box>
  );
}

/* ── Success panel ────────────────────────────────────────────── */
function SuccessPanel({ onNavigate, theme }) {
  return (
    <Box sx={{ textAlign: 'center', py: 1 }}>
      <Box sx={{
        mx: 'auto', mb: 2.5,
        width: 68, height: 68, borderRadius: '50%',
        bgcolor: theme.palette.success.main,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircleOutlineIcon sx={{ color: '#fff', fontSize: 38 }} />
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.text.primary, mb: 1 }}>
        Password Updated Successfully
      </Typography>
      <Typography sx={{ color: theme.palette.text.secondary, mb: 1.5, lineHeight: 1.6 }}>
        Your SouthRail account password has been updated successfully.
      </Typography>

      <Alert severity="success" icon={false} sx={{ mb: 1.5, textAlign: 'left' }}>
        <Stack spacing={0.5}>
          {[
            'Future logins will require the new password',
            'Your account remains secure',
            'Password reset completed successfully',
          ].map((item) => (
            <Typography key={item} variant="body2" sx={{ fontWeight: 500 }}>✓ {item}</Typography>
          ))}
        </Stack>
      </Alert>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
        <CircularProgress size={14} thickness={5} color="primary" />
        <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
          Redirecting to login in 3 seconds…
        </Typography>
      </Box>

      <Button variant="contained" color="primary" fullWidth onClick={onNavigate}>
        Go to Login Now
      </Button>
    </Box>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function ResetPasswordPage() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const form = useForm({ defaultValues: { password: '' } });
  const password = form.watch('password');

  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const missingToken = !token;

  /* ── Original submit logic — untouched ── */
  const submit = async (values) => {
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      setSuccess(true);
      setTimeout(() => { navigate('/login'); }, 5000);
    } catch (apiError) {
      console.error('Reset password failed', apiError);
      setError(getApiErrorMessage(apiError, 'Reset link is invalid, expired, or already used.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: theme.palette.custom.pageBackground,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top accent bar */}
      <Box sx={{ height: 4, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />

      <Container
        maxWidth="sm"
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: { xs: 2, sm: 3 } }}
      >
        {/* Brand mark */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h6" sx={{
            fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: theme.palette.primary.main,
          }}>
            SouthRail
          </Typography>
          <Box sx={{ height: 2, width: 40, bgcolor: theme.palette.secondary.main, mx: 'auto', mt: 0.75, borderRadius: 1 }} />
        </Box>

        {/* Card */}
        <Paper elevation={0} sx={{
          borderRadius: 2,
          border: `1px solid ${theme.palette.custom.cardBorder}`,
          boxShadow: theme.palette.custom.cardShadow,
          bgcolor: theme.palette.surface.raised,
          overflow: 'hidden',
        }}>
          {/* Card header */}
          <Box sx={{
            px: { xs: 3, sm: 5 }, py: { xs: 2.5, sm: 3 },
            bgcolor: theme.palette.primary.main,
            borderBottom: `3px solid ${theme.palette.secondary.main}`,
          }}>
            <Typography variant="h5" sx={{ color: theme.palette.primary.contrastText }}>
              Reset Your Password
            </Typography>
            <Typography variant="body2" sx={{ color: theme.palette.primary.contrastText, opacity: 0.75, mt: 0.5 }}>
              Create a new secure password to regain access to your SouthRail account.
            </Typography>
          </Box>

          {/* Card body */}
          <Box sx={{ px: { xs: 1.75, sm: 2.5 }, py: { xs: 2, sm: 2.5 } }}>
            {/* Missing token error */}
            {missingToken && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                Reset link is invalid or missing. Please request a new password reset link.
              </Alert>
            )}

            {/* API error */}
            {error && !missingToken && (
              <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>
            )}

            {success ? (
              <SuccessPanel onNavigate={() => navigate('/login')} theme={theme} />
            ) : (
              <Box component="form" onSubmit={form.handleSubmit(submit)} noValidate>
                <Stack spacing={2.5}>
                  {/* Password field */}
                  <Box>
                    <TextField
                      label="New password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      fullWidth
                      disabled={loading || missingToken}
                      error={!!form.formState.errors.password}
                      helperText={form.formState.errors.password?.message}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPass((v) => !v)}
                              edge="end"
                              aria-label={showPass ? 'Hide password' : 'Show password'}
                              size="small"
                              tabIndex={-1}
                            >
                              {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      {...form.register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Use at least 8 characters' },
                      })}
                    />
                    <Box sx={{ mt: 1 }}>
                      <PasswordStrength password={password} theme={theme} />
                    </Box>
                  </Box>

                  {/* Password requirements */}
                  <Alert severity="info" icon={false} sx={{ py: 1.25 }}>
                    <Typography variant="body2">
                      Use at least 8 characters. For better security, include uppercase letters, numbers, and special characters.
                    </Typography>
                  </Alert>

                  {/* Submit */}
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={loading || missingToken}
                    aria-label={loading ? 'Updating password, please wait' : 'Update password'}
                    sx={{ py: 1.4 }}
                  >
                    {loading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CircularProgress size={18} thickness={5} sx={{ color: 'inherit' }} />
                        Updating Password...
                      </Box>
                    ) : 'Update Password'}
                  </Button>

                  {/* Back to login */}
                  <Button component={Link} to="/login" variant="text" fullWidth>
                    ← Back to Login
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="caption" sx={{
            display: 'block', fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: theme.palette.text.secondary,
          }}>
            SouthRail Secure Account Recovery
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
            Your security is our priority.
          </Typography>
        </Box>
      </Container>

      {/* Bottom accent bar */}
      <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})` }} />
    </Box>
  );
}