import { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Fab, FormControl, IconButton, InputLabel, MenuItem,
  Select, Stack, TextField, Tooltip, Typography, alpha
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import api from '../services/api.js';
import { getApiErrorMessage } from '../utils/apiErrors.js';

const STARTERS = ['How do I book a train?', 'Explain RAC and waitlist', 'How can I cancel a booking?'];

export function AiAssistant({ authenticated }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (!open || models.length || modelsLoading || modelsError) return;
    let active = true;
    setModelsLoading(true);
    api.get('/chat/models')
      .then(({ data }) => {
        if (!active) return;
        const available = Array.isArray(data) ? data : [];
        setModels(available);
        setModel(available[0]?.name || '');
      })
      .catch((error) => {
        if (active) setModelsError(getApiErrorMessage(error, 'The travel assistant is unavailable right now.'));
      })
      .finally(() => { if (active) setModelsLoading(false); });
    return () => { active = false; };
  }, [models.length, modelsError, modelsLoading, open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  if (!authenticated) return null;

  const send = async (suggestedMessage) => {
    const content = (suggestedMessage ?? message).trim();
    if (!content || sending || content.length > 4000) return;
    setMessage('');
    setMessages((current) => [...current, { role: 'user', content }]);
    setSending(true);
    try {
      const payload = { message: content };
      if (model) payload.model = model;
      const { data } = await api.post('/chat', payload);
      setMessages((current) => [...current, {
        role: 'assistant', content: data?.response || 'I could not create a response. Please try again.'
      }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'error', content: getApiErrorMessage(error, 'The travel assistant could not respond. Please try again.')
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <>
      <Tooltip title="Ask the SouthRail travel assistant">
        <Fab color="primary" size="medium" aria-label="Open travel assistant" onClick={() => setOpen(true)}
          sx={{ position: 'fixed', right: { xs: 18, sm: 28 }, bottom: { xs: 18, sm: 28 }, zIndex: 1100 }}>
          <AutoAwesomeIcon />
        </Fab>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={fullScreen} aria-labelledby="assistant-title">
        <DialogTitle id="assistant-title" sx={{ pr: 7 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AutoAwesomeIcon color="primary" />
            <Box>
              <Typography component="span" fontWeight={800}>Travel assistant</Typography>
              <Typography variant="caption" color="text.secondary" display="block">Guidance for using SouthRail</Typography>
            </Box>
          </Stack>
          <IconButton aria-label="Close assistant" onClick={() => setOpen(false)} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2}>
            {modelsLoading && <Stack direction="row" spacing={1} alignItems="center" role="status">
              <CircularProgress size={16} /><Typography variant="caption" color="text.secondary">Connecting to the assistant…</Typography>
            </Stack>}
            {modelsError && <Alert severity="warning" action={<Button size="small" onClick={() => setModelsError('')}>Retry</Button>}>{modelsError}</Alert>}
            {models.length > 1 && <FormControl size="small" fullWidth>
              <InputLabel id="assistant-model-label">AI model</InputLabel>
              <Select labelId="assistant-model-label" label="AI model" value={model} onChange={(event) => setModel(event.target.value)}>
                {models.map((item) => <MenuItem key={item.name} value={item.name}>{item.displayName || item.name}</MenuItem>)}
              </Select>
            </FormControl>}

            <Box aria-live="polite" sx={{ minHeight: 230, maxHeight: '45vh', overflowY: 'auto', px: 0.5, py: 1 }}>
              {!messages.length ? <Stack spacing={2} alignItems="center" textAlign="center" py={2}>
                <Box sx={(theme) => ({ p: 1.5, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex' })}>
                  <AutoAwesomeIcon />
                </Box>
                <Box>
                  <Typography fontWeight={800}>How can I help?</Typography>
                  <Typography variant="body2" color="text.secondary">Ask about search, reservations, PNR status, cancellations, or your SouthRail account.</Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
                  {STARTERS.map((starter) => <Button key={starter} variant="outlined" size="small" onClick={() => send(starter)} disabled={sending || Boolean(modelsError)}>{starter}</Button>)}
                </Stack>
              </Stack> : <Stack spacing={1.5}>
                {messages.map((item, index) => <Box key={`${item.role}-${index}`} sx={(theme) => ({
                  alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', px: 1.5, py: 1, borderRadius: 2,
                  bgcolor: item.role === 'user' ? 'primary.main' : alpha(theme.palette.text.primary, 0.06),
                  color: item.role === 'user' ? 'primary.contrastText' : item.role === 'error' ? 'error.main' : 'text.primary',
                  whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'
                })}><Typography variant="body2">{item.content}</Typography></Box>)}
                {sending && <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
                  <CircularProgress size={16} /><Typography variant="caption">Thinking…</Typography>
                </Stack>}
                <div ref={endRef} />
              </Stack>}
            </Box>
            <Typography variant="caption" color="text.secondary">AI responses may be inaccurate. Confirm fares, availability, and booking status in SouthRail before acting.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ alignItems: 'flex-end' }}>
          <TextField autoFocus fullWidth multiline maxRows={4} label="Ask a question" value={message}
            onChange={(event) => setMessage(event.target.value)} onKeyDown={handleKeyDown} inputProps={{ maxLength: 4000 }}
            helperText={`${message.length}/4000 · Enter to send, Shift+Enter for a new line`} disabled={sending || Boolean(modelsError)} />
          <IconButton color="primary" aria-label="Send message" onClick={() => send()} disabled={!message.trim() || sending || Boolean(modelsError)} sx={{ mb: 2.5 }}>
            {sending ? <CircularProgress size={22} /> : <SendIcon />}
          </IconButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
