import { useEffect, useRef, useState } from 'react';
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
  alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import TrainIcon from '@mui/icons-material/Train';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

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
      <LinearProgress variant="determinate" value={(score / 4) * 100} sx={{
        height: 5, borderRadius: 999,
        '& .MuiLinearProgress-bar': { backgroundColor: color, transition: 'width 0.3s ease' },
      }} />
      <Typography variant="caption" sx={{ color, fontWeight: 600, mt: 0.5, display: 'block' }}>
        {label}
      </Typography>
    </Box>
  );
}

function SuccessPanel({ onNavigate }) {
  return (
    <Box sx={{ textAlign: 'center', py: 1 }}>
      <Box sx={{ mx: 'auto', mb: 2.5, width: 68, height: 68, borderRadius: '50%', bgcolor: 'success.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircleOutlineIcon sx={{ color: '#fff', fontSize: 38 }} />
      </Box>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
        Password Updated Successfully
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
        Your SouthRail account password has been updated successfully.
      </Typography>
      <Alert severity="success" icon={false} sx={{ mb: 1.5, textAlign: 'left', borderRadius: 2 }}>
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
        <Typography variant="body2" color="text.secondary">
          Redirecting to login in 3 seconds\u2026
        </Typography>
      </Box>
      <Button variant="contained" fullWidth onClick={onNavigate} sx={{ borderRadius: 2, py: 1.4 }}>
        Go to Login Now
      </Button>
    </Box>
  );
}

export default function ResetPasswordPage() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const form = useForm({ defaultValues: { password: '' } });
  const password = form.watch('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const missingToken = !token;
  const redirectTimerRef = useRef(null);

  const submit = async (values) => {
    setError(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      setSuccess(true);
      redirectTimerRef.current = setTimeout(() => { navigate('/login'); }, 5000);
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Reset link is invalid, expired, or already used.'));
    } finally { setLoading(false); }
  };

  useEffect(() => { return () => { if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current); }; }, []);

  return (
    <Box sx={{ minHeight: '100vh', background: (theme) => theme.palette.custom.pageBg, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ height: 4, background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
      <Container maxWidth="xs" sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', py: { xs: 2, sm: 3 } }}>
        <Box sx={{ textAlign: 'center', mb: 2.5 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
            }}>
              <TrainIcon sx={{ fontSize: 18, color: 'primary.contrastText' }} />
            </Box>
          </Box>
        </Box>

        <Paper elevation={0} sx={{
          borderRadius: 3,
          border: '1px solid', borderColor: 'var(--southrail-card-border)',
          boxShadow: 'var(--southrail-card-shadow)',
          bgcolor: 'surface.raised',
          overflow: 'hidden',
        }}>
          <Box sx={{
            px: { xs: 2.5, sm: 4 }, py: { xs: 2, sm: 2.5 },
            background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          }}>
            <Typography variant="subtitle1" sx={{ color: 'primary.contrastText', fontWeight: 700 }}>
              Reset your password
            </Typography>
            <Typography variant="body2" sx={{ color: (theme) => alpha(theme.palette.primary.contrastText, 0.75), mt: 0.25 }}>
              Create a new secure password to regain access to your SouthRail account.
            </Typography>
          </Box>

          <Box sx={{ px: { xs: 1.75, sm: 2.25 }, py: { xs: 1.75, sm: 2 } }}>
            {missingToken && (
              <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>
                Reset link is invalid or missing. Please request a new password reset link.
              </Alert>
            )}
            {error && !missingToken && (
              <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{error}</Alert>
            )}

            {success ? (
              <SuccessPanel onNavigate={() => navigate('/login')} />
            ) : (
              <Box component="form" onSubmit={form.handleSubmit(submit)} noValidate>
                <Stack spacing={2}>
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
                            <IconButton onClick={() => setShowPass((v) => !v)} edge="end" aria-label={showPass ? 'Hide password' : 'Show password'} size="small" tabIndex={-1}>
                              {showPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      {...form.register('password', { required: 'Password is required', minLength: { value: 8, message: 'Use at least 8 characters' } })}
                    />
                    <Box sx={{ mt: 1 }}>
                      <PasswordStrength password={password} theme={theme} />
                    </Box>
                  </Box>

                  <Alert severity="info" icon={false} sx={{ py: 1.25, borderRadius: 2 }}>
                    <Typography variant="body2">
                      Use at least 8 characters. For better security, include uppercase letters, numbers, and special characters.
                    </Typography>
                  </Alert>

                  <Button type="submit" variant="contained" fullWidth disabled={loading || missingToken} sx={{ borderRadius: 2, py: 1.4 }}>
                    {loading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CircularProgress size={18} thickness={5} sx={{ color: 'inherit' }} />
                        Updating password...
                      </Box>
                    ) : 'Update password'}
                  </Button>

                  <Button component={Link} to="/login" variant="text" fullWidth sx={{ fontSize: '0.85rem' }}>
                    ← Back to sign in
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </Paper>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
            SouthRail Secure Account Recovery
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Your security is our priority.
          </Typography>
        </Box>
      </Container>
      <Box sx={{ height: 3, background: (theme) => `linear-gradient(90deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})` }} />
    </Box>
  );
}
