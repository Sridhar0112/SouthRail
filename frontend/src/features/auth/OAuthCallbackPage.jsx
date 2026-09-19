import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import api from '../../services/api.js';
import { authenticated, storeAuthSession } from './authSlice.js';
import { googleAuthorizationUrl } from './GoogleSignInButton.jsx';

const STATES = {
  account_conflict: {
    message: 'An account with this email already exists. Please sign in using your email and password.',
    emailAction: 'Sign in with Email', google: true
  },
  email_not_verified: {
    message: 'Your Google email could not be verified. Please use a verified Google account or sign in with email and password.',
    emailAction: 'Sign in with Email', google: true
  },
  account_disabled: {
    message: 'This SouthRail account is currently unavailable. Please contact support if you believe this is a mistake.',
    emailAction: 'Back to Login'
  },
  authentication_failed: {
    message: 'Google sign-in was cancelled or could not be completed.',
    emailAction: 'Back to Login', google: true
  },
  exchange_expired: {
    message: 'Your Google sign-in session expired. Please try signing in again.', google: true
  },
  exchange_invalid: {
    message: 'This Google sign-in session is no longer valid. Please try again.', google: true
  },
  malformed: {
    message: 'This Google sign-in link is invalid or incomplete. Please start the sign-in process again.',
    emailAction: 'Back to Login', google: true
  },
  unexpected: {
    message: "We couldn't complete Google sign-in right now. Please try again.",
    emailAction: 'Back to Login', google: true
  }
};

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const started = useRef(false);
  const [state, setState] = useState('processing');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    const reason = params.get('error');
    if (reason) {
      setState(Object.prototype.hasOwnProperty.call(STATES, reason) ? reason : 'malformed');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    if (!code) {
      setState('malformed');
      return;
    }
    window.history.replaceState({}, '', window.location.pathname);
    api.post('/auth/oauth/exchange', { code }).then(({ data }) => {
      storeAuthSession(data);
      dispatch(authenticated(data.user || null));
      const savedReturnTo = sessionStorage.getItem('southrail_oauth_return_to');
      sessionStorage.removeItem('southrail_oauth_return_to');
      const returnTo = typeof savedReturnTo === 'string'
        && savedReturnTo.startsWith('/')
        && !savedReturnTo.startsWith('//')
        ? savedReturnTo
        : '/dashboard';
      navigate(returnTo, { replace: true });
    }).catch((error) => {
      const errorCode = error.response?.data?.errorCode;
      if (errorCode === 'OAUTH_EXCHANGE_EXPIRED') setState('exchange_expired');
      else if (errorCode === 'OAUTH_EXCHANGE_INVALID') setState('exchange_invalid');
      else if (errorCode === 'OAUTH_ACCOUNT_DISABLED') setState('account_disabled');
      else if (error.response?.status === 400) setState('exchange_invalid');
      else setState('unexpected');
    });
  }, [dispatch, navigate, params]);

  const content = STATES[state];
  const tryGoogle = () => window.location.assign(googleAuthorizationUrl());

  return (
    <Container maxWidth="xs" sx={{ py: { xs: 4, sm: 8 } }}>
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center', borderRadius: 4 }}>
        {state === 'processing' ? (
          <Box role="status">
            <CircularProgress aria-hidden="true" />
            <Typography variant="h6" sx={{ mt: 2 }}>Signing you in with Google…</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={800}>Google sign-in</Typography>
            <Alert severity="error" sx={{ textAlign: 'left' }}>{content.message}</Alert>
            {content.google && <Button variant="contained" onClick={tryGoogle}>Try Google Again</Button>}
            {content.emailAction && <Button component={Link} to="/login" variant="outlined">{content.emailAction}</Button>}
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
