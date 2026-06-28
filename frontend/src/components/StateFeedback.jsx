import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchOffIcon from '@mui/icons-material/SearchOff';

const statePanelSx = {
  p: { xs: 1.5, sm: 2 },
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.paper',
  boxShadow: 'var(--southrail-card-shadow)',
  transition: 'opacity 200ms ease'
};

export function LoadingState({ message = 'Loading...' }) {
  return (
    <Box sx={statePanelSx}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">{message}</Typography>
      </Stack>
    </Box>
  );
}

export function ErrorState({ title = 'Something needs attention', message, actionLabel, onAction, children }) {
  return (
    <Box sx={{ ...statePanelSx, borderColor: 'error.main' }}>
      <Stack spacing={1.5}>
        <Alert severity="error" icon={<ErrorOutlineIcon fontSize="small" />}>
          <Typography fontWeight={800}>{title}</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{message || 'Please try again.'}</Typography>
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

export function EmptyState({ title = 'No data found', message, actionLabel, onAction }) {
  return (
    <Box sx={statePanelSx}>
      <Stack spacing={1.5} alignItems="center" textAlign="center" py={1}>
        <SearchOffIcon color="disabled" sx={{ fontSize: 40 }} />
        <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
        {message && <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>{message}</Typography>}
        {actionLabel && onAction && (
          <Box>
            <Button variant="outlined" onClick={onAction} size="small">{actionLabel}</Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}

export function SuccessState({ title = 'Success', message, children }) {
  return (
    <Box sx={{ ...statePanelSx, borderColor: 'success.main' }}>
      <Stack spacing={1.5}>
        <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="small" />}>
          <Typography fontWeight={800}>{title}</Typography>
          {message && <Typography variant="body2">{message}</Typography>}
        </Alert>
        {children}
      </Stack>
    </Box>
  );
}

export function InfoState({ title = 'Notice', message, children }) {
  return (
    <Box sx={{ ...statePanelSx, borderColor: 'info.main' }}>
      <Stack spacing={1.5}>
        <Alert severity="info" icon={<InfoOutlinedIcon fontSize="small" />}>
          <Typography fontWeight={800}>{title}</Typography>
          {message && <Typography variant="body2">{message}</Typography>}
        </Alert>
        {children}
      </Stack>
    </Box>
  );
}
