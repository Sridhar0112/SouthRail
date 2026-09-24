import { useEffect, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Fade, IconButton, InputAdornment, FormControl, MenuItem,
  Select, Stack, TextField, Tooltip, Typography, alpha
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import TrainOutlinedIcon from '@mui/icons-material/TrainOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import api from '../services/api.js';
import { getApiErrorMessage } from '../utils/apiErrors.js';
import { AssistantMarkdown } from './AssistantMarkdown.jsx';

const STARTERS = ['How do I book a train?', 'Explain RAC and waitlist', 'How can I cancel a booking?'];
const MODEL_UNAVAILABLE_MESSAGE = 'The selected AI model is no longer available. Please choose another model.';
const NO_COMPATIBLE_MODELS_MESSAGE = 'No compatible AI models are currently available. Please try again later.';

export function AiAssistant({ authenticated }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState('');
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const loadModels = async ({ preserveSelection = true } = {}) => {
    if (modelsLoading) return;
    setModelsLoading(true);
    setModelsError('');
    try {
      const { data } = await api.get('/chat/models');
      const available = Array.isArray(data) ? data : [];
      setModels(available);
      setModel((current) => {
        if (preserveSelection && available.some((item) => item.name === current)) return current;
        return preserveSelection ? available[0]?.name || '' : '';
      });
      if (!available.length) setModelsError(NO_COMPATIBLE_MODELS_MESSAGE);
    } catch (error) {
      setModelsError(getApiErrorMessage(error, 'The travel assistant is unavailable right now.'));
    } finally {
      setModelsLoading(false);
    }
  };

  const openAssistant = () => {
    setOpen(true);
    if (!models.length && !modelsError) loadModels();
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages, reduceMotion, sending]);

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
        role: 'assistant',
        content: data?.response || 'I could not create a response. Please try again.',
        sources: Array.isArray(data?.sources) ? data.sources : []
      }]);
    } catch (error) {
      if (error.response?.data?.errorCode === 'AI_MODEL_UNAVAILABLE') {
        setModel('');
        setModels([]);
        setMessages((current) => [...current, { role: 'error', content: MODEL_UNAVAILABLE_MESSAGE }]);
        loadModels({ preserveSelection: false });
      } else {
        setMessages((current) => [...current, {
          role: 'error', content: getApiErrorMessage(error, 'The travel assistant could not respond. Please try again.')
        }]);
      }
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

  const isLight = theme.palette.mode === 'light';
  const nearLimit = message.length > 3600;

  return (
    <>
      {/* ---------- Floating launcher ---------- */}
      <Tooltip title="Ask the SouthRail travel assistant">
        <Box
          component="button"
          type="button"
          aria-label="Open travel assistant"
          onClick={openAssistant}
          sx={{
            position: 'fixed',
            right: { xs: 16, sm: 28 },
            bottom: { xs: 16, sm: 28 },
            zIndex: 1100,
            width: 60,
            height: 60,
            borderRadius: '50%',
            border: 'none',
            cursor: 'pointer',
            p: 0,
            display: 'grid',
            placeItems: 'center',
            color: theme.palette.primary.contrastText,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, isLight ? 0.38 : 0.5)}`,
            transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1), box-shadow 220ms ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: -6,
              borderRadius: '50%',
              border: `1.5px solid ${alpha(theme.palette.primary.main, 0.45)}`,
              animation: 'southrail-fab-ring 2.6s ease-out infinite'
            },
            '&:hover': {
              transform: 'translateY(-3px) scale(1.04)',
              boxShadow: `0 14px 36px ${alpha(theme.palette.primary.main, isLight ? 0.46 : 0.6)}`
            },
            '&:active': { transform: 'translateY(-1px) scale(0.98)' },
            '&:focus-visible': { outline: `2.5px solid ${theme.palette.primary.main}`, outlineOffset: 4 },
            '@media (prefers-reduced-motion: reduce)': { '&::before': { animation: 'none' } },
            '@keyframes southrail-fab-ring': {
              '0%': { opacity: 0.55, transform: 'scale(1)' },
              '100%': { opacity: 0, transform: 'scale(1.35)' }
            }
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 26 }} />
        </Box>
      </Tooltip>

      {/* ---------- Assistant window ---------- */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        fullScreen={fullScreen}
        aria-labelledby="assistant-title"
        TransitionComponent={Fade}
        transitionDuration={220}
        PaperProps={{
          sx: {
            overflow: 'hidden',
            backgroundColor: theme.palette.surface.raised,
            border: `1px solid ${theme.palette.custom.cardBorder}`,
            height: { xs: '100dvh', sm: 'min(78vh, 680px)' },
            maxWidth: { sm: 560 },
            maxHeight: { sm: 'min(700px, calc(100dvh - 48px))' },
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {/* Header */}
        <DialogTitle
          id="assistant-title"
          sx={{
            p: 0,
            flexShrink: 0,
            backgroundImage: theme.palette.custom.heroOverlay,
            backgroundColor: theme.palette.primary.dark,
            color: '#fff'
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: { xs: 2.25, sm: 3 }, py: 2 }}>
            <Box
              sx={{
                width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                display: 'grid', placeItems: 'center',
                bgcolor: alpha('#FFFFFF', 0.14),
                border: `1px solid ${alpha('#FFFFFF', 0.22)}`
              }}
            >
              <TrainOutlinedIcon sx={{ fontSize: 21 }} />
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography component="span" sx={{ fontWeight: 800, fontSize: '1.02rem', display: 'block', lineHeight: 1.2 }}>
                SouthRail Copilot
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.78), fontWeight: 500 }}>
                Guidance for using SouthRail
              </Typography>
            </Box>
            <IconButton
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              sx={{
                color: '#fff',
                bgcolor: alpha('#FFFFFF', 0.10),
                '&:hover': { bgcolor: alpha('#FFFFFF', 0.18) },
                '&:focus-visible': { outline: `2.5px solid #fff`, outlineOffset: 2 }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          {models.length > 0 && (
            <Box sx={{ px: { xs: 2.25, sm: 3 }, pb: 1.5 }}>
              <FormControl size="small" variant="standard" sx={{ minWidth: 160 }}>
                <Select
                  disableUnderline
                  displayEmpty
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  aria-label="AI model"
                  startAdornment={
                    <InputAdornment position="start" sx={{ ml: 0.25, mr: 0.75 }}>
                      <TuneRoundedIcon sx={{ fontSize: 16, color: alpha('#FFFFFF', 0.85) }} />
                    </InputAdornment>
                  }
                  sx={{
                    color: '#fff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: 999,
                    bgcolor: alpha('#FFFFFF', 0.12),
                    border: `1px solid ${alpha('#FFFFFF', 0.20)}`,
                    px: 1.25,
                    py: 0.25,
                    '& .MuiSelect-select': { py: 0.5, display: 'flex', alignItems: 'center' },
                    '& .MuiSvgIcon-root': { color: alpha('#FFFFFF', 0.85) },
                    '&:hover': { bgcolor: alpha('#FFFFFF', 0.18) },
                    '&:focus-visible': { outline: `2px solid #fff` }
                  }}
                  MenuProps={{ PaperProps: { sx: { mt: 0.5 } } }}
                >
                  <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>
                    Choose a model
                  </MenuItem>
                  {models.map((item) => (
                    <MenuItem key={item.name} value={item.name} sx={{ fontSize: '0.85rem' }}>
                      {item.displayName || item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogTitle>

        {/* Body */}
        <DialogContent
          sx={{
            p: 0,
            flexGrow: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: theme.palette.background.default,
            backgroundImage: theme.palette.custom.pageBg
          }}
        >
          {modelsLoading && (
            <Stack direction="row" spacing={1} alignItems="center" role="status" sx={{ px: 3, py: 1.25 }}>
              <CircularProgress size={14} thickness={5} />
              <Typography variant="caption" color="text.secondary">Connecting to the assistant…</Typography>
            </Stack>
          )}
          {modelsError && (
            <Box sx={{ px: 2.5, pt: 2 }}>
              <Alert
                severity="warning"
                variant="outlined"
                action={<Button size="small" onClick={() => loadModels()}>Retry</Button>}
              >
                {modelsError}
              </Alert>
            </Box>
          )}

          <Box
            aria-live="polite"
            sx={{
              flexGrow: 1,
              minHeight: 0,
              overflowY: 'auto',
              px: { xs: 2, sm: 2.75 },
              py: 2.5,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {!messages.length ? (
              <Stack spacing={2.5} alignItems="center" textAlign="center" sx={{ m: 'auto', py: 3, maxWidth: 380 }}>
                <Box
                  sx={{
                    width: 56, height: 56, borderRadius: '16px',
                    display: 'grid', placeItems: 'center',
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)}, ${alpha(theme.palette.secondary.main, 0.14)})`,
                    color: 'primary.main',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 26 }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>How can I help?</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ask about search, reservations, PNR status, cancellations, or your SouthRail account.
                  </Typography>
                </Box>
                <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center">
                  {STARTERS.map((starter) => (
                    <Button
                      key={starter}
                      variant="outlined"
                      size="small"
                      onClick={() => send(starter)}
                      disabled={sending || modelsLoading || !model || Boolean(modelsError)}
                      sx={{
                        borderRadius: 999,
                        borderColor: theme.palette.custom.fieldBorder,
                        bgcolor: theme.palette.surface.raised,
                        color: 'text.primary',
                        fontWeight: 600,
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: alpha(theme.palette.primary.main, 0.08)
                        }
                      }}
                    >
                      {starter}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={2} sx={{ mt: 'auto' }}>
                {messages.map((item, index) => {
                  const isUser = item.role === 'user';
                  const isError = item.role === 'error';
                  return (
                    <Stack
                      key={`${item.role}-${index}`}
                      direction={isUser ? 'row-reverse' : 'row'}
                      spacing={1}
                      alignItems="flex-end"
                      sx={{ maxWidth: '100%' }}
                    >
                      {!isUser && (
                        <Avatar
                          sx={{
                            width: 28, height: 28, flexShrink: 0,
                            bgcolor: isError ? alpha(theme.palette.error.main, 0.14) : alpha(theme.palette.primary.main, 0.14),
                            color: isError ? 'error.main' : 'primary.main'
                          }}
                        >
                          {isError ? <ErrorOutlineRoundedIcon sx={{ fontSize: 16 }} /> : <AutoAwesomeIcon sx={{ fontSize: 15 }} />}
                        </Avatar>
                      )}
                      <Box
                        sx={{
                          width: 'fit-content',
                          minWidth: 0,
                          maxWidth: isUser
                            ? { xs: '86%', sm: '72%' }
                            : { xs: '88%', sm: '76%' },
                          px: 1.75,
                          py: 1.1,
                          borderRadius: '16px',
                          borderBottomRightRadius: isUser ? '4px' : '16px',
                          borderBottomLeftRadius: !isUser ? '4px' : '16px',
                          overflowWrap: 'anywhere',
                          ...(isUser
                            ? {
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                color: theme.palette.primary.contrastText,
                                boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.28)}`
                              }
                            : isError
                            ? {
                                bgcolor: alpha(theme.palette.error.main, isLight ? 0.08 : 0.14),
                                color: 'error.main',
                                border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`
                              }
                            : {
                                bgcolor: theme.palette.surface.raised,
                                color: 'text.primary',
                                border: `1px solid ${theme.palette.custom.cardBorder}`,
                                boxShadow: theme.palette.custom.cardShadow
                              })
                        }}
                      >
                        {!isUser && !isError ? (
                          <>
                            <AssistantMarkdown>{item.content}</AssistantMarkdown>
                            {item.sources?.length > 0 && (
                              <Box
                                component="aside"
                                aria-label="Answer sources"
                                sx={{ mt: 1.25, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}
                              >
                                <Typography
                                  component="h4"
                                  variant="caption"
                                  sx={{ display: 'block', mb: 0.35, color: 'text.secondary', fontWeight: 700 }}
                                >
                                  Sources
                                </Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2, color: 'text.secondary' }}>
                                  {item.sources.map((source) => (
                                    <Typography
                                      component="li"
                                      variant="caption"
                                      key={`${source.document}-${source.section}`}
                                      sx={{ lineHeight: 1.45, overflowWrap: 'anywhere' }}
                                    >
                                      {source.document}{source.section ? ` · ${source.section}` : ''}
                                    </Typography>
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </>
                        ) : (
                          <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.content}</Typography>
                        )}
                      </Box>
                    </Stack>
                  );
                })}

                {sending && (
                  <Stack direction="row" spacing={1} alignItems="flex-end">
                    <Avatar sx={{ width: 28, height: 28, bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main' }}>
                      <AutoAwesomeIcon sx={{ fontSize: 15 }} />
                    </Avatar>
                    <Box
                      role="status"
                      aria-label="Assistant is thinking"
                      sx={{
                        px: 1.75, py: 1.35, borderRadius: '16px', borderBottomLeftRadius: '4px',
                        bgcolor: theme.palette.surface.raised,
                        border: `1px solid ${theme.palette.custom.cardBorder}`,
                        boxShadow: theme.palette.custom.cardShadow,
                        display: 'flex', gap: '5px', alignItems: 'center'
                      }}
                    >
                      {[0, 1, 2].map((dot) => (
                        <Box
                          key={dot}
                          sx={{
                            width: 6, height: 6, borderRadius: '50%',
                            bgcolor: alpha(theme.palette.primary.main, 0.75),
                            animation: 'southrail-typing 1.15s ease-in-out infinite',
                            animationDelay: `${dot * 0.16}s`,
                            '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.6 },
                            '@keyframes southrail-typing': {
                              '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.4 },
                              '30%': { transform: 'translateY(-4px)', opacity: 1 }
                            }
                          }}
                        />
                      ))}
                    </Box>
                  </Stack>
                )}
                <div ref={endRef} />
              </Stack>
            )}
          </Box>
        </DialogContent>

        {/* Composer */}
        <DialogActions
          sx={{
            flexShrink: 0,
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: 0.75,
            px: { xs: 2, sm: 2.75 },
            py: 1.75,
            bgcolor: theme.palette.surface.raised,
            borderTop: `1px solid ${theme.palette.custom.cardBorder}`
          }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-end">
            <TextField
              autoFocus
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask a question"
              aria-label="Ask a question"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              inputProps={{ maxLength: 4000, 'aria-describedby': 'assistant-composer-hint' }}
              disabled={sending || modelsLoading || !model || Boolean(modelsError)}
              variant="filled"
              hiddenLabel
              InputProps={{
                disableUnderline: true,
                sx: {
                  borderRadius: '18px',
                  bgcolor: theme.palette.surface.input,
                  border: `1.5px solid ${theme.palette.custom.fieldBorder}`,
                  px: 1.75,
                  py: 0.5,
                  fontSize: '0.9rem',
                  transition: 'border-color 180ms ease, box-shadow 180ms ease',
                  '&.Mui-focused': {
                    borderColor: 'primary.main',
                    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`
                  }
                }
              }}
              sx={{ '& .MuiFilledInput-root': { pt: 1, pb: 1 } }}
            />
            <Tooltip title="Send message">
              <span>
                <IconButton
                  aria-label="Send message"
                  onClick={() => send()}
                  disabled={!message.trim() || sending || modelsLoading || !model || Boolean(modelsError)}
                  sx={{
                    width: 44, height: 44, flexShrink: 0, color: '#fff',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.32)}`,
                    transition: 'transform 160ms ease, opacity 160ms ease',
                    '&:hover': { transform: 'translateY(-1px)' },
                    '&.Mui-disabled': { background: theme.palette.action.disabledBackground, color: theme.palette.action.disabled, boxShadow: 'none' },
                    '&:focus-visible': { outline: `2.5px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
                  }}
                >
                  {sending ? <CircularProgress size={19} thickness={5} sx={{ color: 'inherit' }} /> : <SendRoundedIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Typography id="assistant-composer-hint" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Press Enter to send, Shift+Enter for a new line.
          </Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              AI responses may be inaccurate. Confirm fares, availability, and booking status in SouthRail before acting.
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.7rem', flexShrink: 0, ml: 1, color: nearLimit ? 'warning.main' : 'text.secondary', fontWeight: nearLimit ? 700 : 400 }}
            >
              {message.length}/4000
            </Typography>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}
