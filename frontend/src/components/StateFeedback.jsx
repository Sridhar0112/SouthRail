import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

const statePanelSx = {
  p: { xs: 1.05, sm: 1.2 },
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
  boxShadow: 'var(--southrail-card-shadow)'
};

export function LoadingState({ message = 'Loading...' }) {
  return (
    <Box sx={statePanelSx}>
      <Stack direction="row" spacing={1} alignItems="center">
        <CircularProgress size={18} />
        <Typography variant="body2">{message}</Typography>
      </Stack>
    </Box>
  );
}

export function ErrorState({ title = 'Something needs attention', message, actionLabel, onAction, children }) {
  return (
    <Box sx={{ ...statePanelSx, borderColor: 'error.main' }}>
      <Stack spacing={1}>
        <Alert severity="error">
          <Typography fontWeight={800}>{title}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{message || 'Please try again.'}</Typography>
        </Alert>
        {actionLabel && onAction && <Button variant="contained" onClick={onAction}>{actionLabel}</Button>}
        {children}
      </Stack>
    </Box>
  );
}

export function EmptyState({ title = 'No data found', message, actionLabel, onAction }) {
  return (
    <Box sx={statePanelSx}>
      <Stack spacing={1}>
        <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
        {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
        {actionLabel && onAction && <Button variant="outlined" onClick={onAction}>{actionLabel}</Button>}
      </Stack>
    </Box>
  );
}

export function SuccessState({ title = 'Success', message, children }) {
  return (
    <Box sx={{ ...statePanelSx, borderColor: 'success.main' }}>
      <Stack spacing={1}>
        <Alert severity="success">
          <Typography fontWeight={800}>{title}</Typography>
          {message && <Typography variant="body2">{message}</Typography>}
        </Alert>
        {children}
      </Stack>
    </Box>
  );
}
