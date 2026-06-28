import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography, alpha } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import EmailIcon from '@mui/icons-material/Email';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TrainIcon from '@mui/icons-material/Train';
import api from '../../services/api.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

export default function ForgotPasswordPage() {
  const form = useForm();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (values) => {
    setError(''); setMessage(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', values);
      setMessage('If an account exists for this email address, a password reset email has been sent.');
    } catch (apiError) {
      setError(getApiErrorMessage(apiError, 'Password reset request could not be submitted.'));
    } finally { setLoading(false); }
  };

  if (message) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
        <Paper elevation={0} sx={{
          p: { xs: 3, sm: 4 }, borderRadius: 4, textAlign: 'center',
          width: '100%', minWidth: 0,
          border: '1px solid', borderColor: 'var(--southrail-glass-border)',
          boxShadow: 'var(--southrail-glass-shadow)',
          background: (theme) => alpha(theme.palette.surface.raised, 0.96),
        }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MarkEmailReadIcon color="success" sx={{ fontSize: 36 }} />
            </Box>
          </Box>
          <Typography variant="h4" fontWeight={800} gutterBottom sx={{ fontSize: { xs: '1.35rem', sm: '1.7rem' } }}>
            Check your email
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, overflowWrap: 'anywhere', lineHeight: 1.6 }}>
            If an account exists for this email address, a password reset email has been sent.
            Please check your inbox and spam folder.
          </Typography>
          <Button component={Link} to="/login" variant="contained" fullWidth sx={{ borderRadius: 2, py: 1.4 }}>
            Back to sign in
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
      <Paper elevation={0} sx={{
        p: { xs: 2.5, sm: 3.5 }, borderRadius: 4,
        width: '100%', minWidth: 0,
        border: '1px solid', borderColor: 'var(--southrail-glass-border)',
        boxShadow: 'var(--southrail-glass-shadow)',
        background: (theme) => alpha(theme.palette.surface.raised, 0.96),
      }}>
        <Stack spacing={0.5} sx={{ mb: 3, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: 2.5,
              background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
            }}>
              <TrainIcon sx={{ fontSize: 24, color: 'primary.contrastText' }} />
            </Box>
          </Box>
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.4rem', sm: '1.7rem' } }}>
            Reset password
          </Typography>
          <Typography color="text.secondary">
            Enter your registered email address
          </Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={form.handleSubmit(submit)}>
          <Stack spacing={2.5}>
            <TextField
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              error={!!form.formState.errors.email}
              helperText={form.formState.errors.email?.message}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" color="disabled" /></InputAdornment> } }}
              {...form.register('email', { required: 'Email is required' })}
            />
            <Button type="submit" variant="contained" startIcon={<RestartAltIcon />} disabled={loading} fullWidth sx={{ borderRadius: 2, py: 1.4 }}>
              {loading ? 'Sending reset link\u2026' : 'Send reset link'}
            </Button>
            <Button component={Link} to="/login" variant="text" fullWidth sx={{ fontSize: '0.85rem' }}>
              Back to sign in
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
