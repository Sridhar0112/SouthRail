import { Alert, Box, Button, CircularProgress, Stack, Typography, alpha } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';

const statePanelSx = {
  p: { xs: 1.75, sm: 2.25 },
  border: 1,
  borderColor: 'divider',
  borderRadius: 2.5,
  bgcolor: 'background.paper',
  boxShadow: 'none',
  transition: 'border-color 180ms ease, background-color 180ms ease'
};

export function LoadingState({ message = 'Loading...' }) {
  return (
    <Box sx={(theme) => ({ ...statePanelSx, bgcolor: alpha(theme.palette.primary.main, 0.025) })} role="status" aria-live="polite">
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CircularProgress size={20} aria-hidden="true" />
        <Typography variant="body2" color="text.secondary">{message}</Typography>
      </Stack>
    </Box>
  );
}

export function ErrorState({ title = 'Something needs attention', message, actionLabel, onAction, children }) {
  return (
    <Box sx={(theme) => ({ ...statePanelSx, borderColor: alpha(theme.palette.error.main, 0.35), bgcolor: alpha(theme.palette.error.main, 0.025) })}>
      <Stack spacing={1.25}>
        <Alert severity="error" icon={<ErrorOutlineIcon fontSize="small" />} sx={{ border: 0, bgcolor: 'transparent', p: 0 }}>
          <Typography fontWeight={800}>{title}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 0.25 }}>{message || 'Please try again.'}</Typography>
        </Alert>
        {actionLabel && onAction && (
          <Box>
            <Button variant="contained" onClick={onAction} size="small">{actionLabel}</Button>
          </Box>
        )}
        {children}
      </Stack>
    </Box>
  );
}

export function EmptyState({ title = 'No data found', message, actionLabel, onAction, icon }) {
  return (
    <Box sx={statePanelSx} role="status">
      <Stack spacing={1} alignItems="center" textAlign="center" py={{ xs: 1.5, sm: 2 }}>
        <Box sx={(theme) => ({
          width: 48,
          height: 48,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.07),
          color: 'text.disabled'
        })}>
          {icon || <SearchOffIcon sx={{ fontSize: 26 }} />}
        </Box>
        <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
        {message && <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>{message}</Typography>}
        {actionLabel && onAction && (
          <Box sx={{ pt: 0.5 }}>
            <Button variant="outlined" onClick={onAction} size="small">{actionLabel}</Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

export function SuccessState({ title = 'Success', message, children }) {
  return (
    <Box sx={(theme) => ({ ...statePanelSx, borderColor: alpha(theme.palette.success.main, 0.35), bgcolor: alpha(theme.palette.success.main, 0.025) })}>
      <Stack spacing={1.25}>
        <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="small" />} sx={{ border: 0, bgcolor: 'transparent', p: 0 }}>
          <Typography fontWeight={800}>{title}</Typography>
          {message && <Typography variant="body2" sx={{ mt: 0.25 }}>{message}</Typography>}
        </Alert>
        {children}
      </Stack>
    </Box>
  );
}

export function InfoState({ title = 'Notice', message, children }) {
  return (
    <Box sx={(theme) => ({ ...statePanelSx, borderColor: alpha(theme.palette.info.main, 0.32), bgcolor: alpha(theme.palette.info.main, 0.02) })}>
      <Stack spacing={1.25}>
        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />} sx={{ border: 0, bgcolor: 'transparent', p: 0 }}>
          <Typography fontWeight={800}>{title}</Typography>
          {message && <Typography variant="body2" sx={{ mt: 0.25 }}>{message}</Typography>}
        </Alert>
        {children}
      </Stack>
    </Box>
  );
}
