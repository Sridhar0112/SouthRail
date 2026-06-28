import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography, alpha } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EmailIcon from '@mui/icons-material/Email';
import BadgeIcon from '@mui/icons-material/Badge';
import PhoneIcon from '@mui/icons-material/Phone';
import TrainIcon from '@mui/icons-material/Train';
import { register as registerUser } from './authSlice.js';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

function PasswordStrengthBar({ password }) {
  const score = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);

  if (!password) return null;

  const labels = ['Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['error', 'warning', 'info', 'success'];
  const colorIndex = score <= 2 ? 0 : score === 3 ? 1 : score === 4 ? 2 : 3;

  return (
    <Stack spacing={0.75}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        {[1, 2, 3, 4].map((i) => (
          <Box key={i} sx={{
            height: 4, flex: 1, borderRadius: 2,
            bgcolor: i <= score ? `${colors[colorIndex]}.main` : 'action.disabledBackground',
            transition: 'background-color 200ms ease'
          }} />
        ))}
      </Box>
      <Typography variant="caption" fontWeight={600} color={`${colors[colorIndex]}.main`}>
        {labels[colorIndex]}
      </Typography>
    </Stack>
  );
}

export default function RegisterPage() {
  const form = useForm();
  const dispatch = useDispatch();
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const loading = useSelector((state) => state.auth.loading);
  const [showPassword, setShowPassword] = useState(false);
  const password = form.watch('password');

  const onSubmit = async (values) => {
    setApiError(''); setSuccessMessage(''); setRegisteredEmail('');
    try {
      const data = await dispatch(registerUser(values)).unwrap();
      setSuccessMessage(data?.message || 'Account created successfully. Please verify your email before logging in.');
      setRegisteredEmail(data?.email || values.email);
      form.reset();
    } catch (message) {
      setApiError(message || 'Registration failed. Please check your details.');
    }
  };

  if (successMessage) {
    return (
      <Container maxWidth="xs" sx={{ py: { xs: 2, sm: 4 } }}>
        <Paper elevation={0} sx={{
          p: { xs: 2, sm: 2.5 }, borderRadius: 3, textAlign: 'center',
          width: '100%', maxWidth: '100%', minWidth: 0,
          border: '1px solid', borderColor: 'var(--southrail-glass-border)',
          boxShadow: 'var(--southrail-glass-shadow)',
          background: (theme) => alpha(theme.palette.surface.raised, 0.96),
        }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Verify your email
          </Typography>
          <Alert severity="success" sx={{ mb: 1.5, textAlign: 'left', borderRadius: 2 }}>
            {successMessage}
          </Alert>
          {registeredEmail && (
            <Typography color="text.secondary" sx={{ mb: 1.5, overflowWrap: 'anywhere' }}>
              Verification email sent to: <strong>{registeredEmail}</strong>
            </Typography>
          )}
          <Typography color="text.secondary" sx={{ mb: 1.5, overflowWrap: 'anywhere' }} variant="body2">
            Please open the verification link from your email. After verification, you can login and access your dashboard.
          </Typography>
          <Button component={Link} to="/login" variant="contained" fullWidth sx={{ borderRadius: 2, py: 1.2 }}>
            Go to login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 2, sm: 4 } }}>
      <Paper elevation={0} sx={{
        p: { xs: 1.75, sm: 2.25 }, borderRadius: 3,
        width: '100%', maxWidth: '100%', minWidth: 0,
        border: '1px solid', borderColor: 'var(--southrail-glass-border)',
        boxShadow: 'var(--southrail-glass-shadow)',
        background: (theme) => alpha(theme.palette.surface.raised, 0.96),
      }}>
        <Stack spacing={0.5} sx={{ mb: 2, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.75 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2,
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
            }}>
              <TrainIcon sx={{ fontSize: 20, color: 'primary.contrastText' }} />
            </Box>
          </Box>
          <Typography variant="h5" fontWeight={800}>
            Create account
          </Typography>
          <Typography color="text.secondary" variant="caption">
            Join SouthRail for easy train bookings
          </Typography>
        </Stack>

        {apiError && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{apiError}</Alert>}

        <Box component="form" onSubmit={form.handleSubmit(onSubmit)}>
          <Stack spacing={2} sx={{ '& .MuiTextField-root': { width: '100%' } }}>
            <TextField
              label="Full name"
              placeholder="Your full name"
              error={!!form.formState.errors.fullName}
              helperText={form.formState.errors.fullName?.message}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><BadgeIcon fontSize="small" color="disabled" /></InputAdornment> } }}
              {...form.register('fullName', { required: 'Full name is required', minLength: { value: 2, message: 'Use at least 2 characters' } })}
            />
            <TextField
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              error={!!form.formState.errors.email}
              helperText={form.formState.errors.email?.message}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" color="disabled" /></InputAdornment> } }}
              {...form.register('email', { required: 'Email is required' })}
            />
            <TextField
              label="Phone number"
              placeholder="10-digit mobile number"
              inputProps={{ maxLength: 10 }}
              error={!!form.formState.errors.phone}
              helperText={form.formState.errors.phone?.message}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" color="disabled" /></InputAdornment> } }}
              {...form.register('phone', { required: 'Phone number is required', pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile number' } })}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              error={!!form.formState.errors.password}
              helperText={form.formState.errors.password?.message}
              placeholder="At least 8 characters"
              {...form.register('password', { required: 'Password is required', minLength: { value: 8, message: 'Use at least 8 characters' } })}
              slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }}
            />
            <PasswordStrengthBar password={password} />
            <Button type="submit" variant="contained" startIcon={<PersonAddIcon />} disabled={loading} fullWidth sx={{ borderRadius: 2, py: 1.4 }}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <Button component={Link} to="/login" variant="text" fullWidth sx={{ fontSize: '0.85rem' }}>
              Already have an account? Sign in
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
