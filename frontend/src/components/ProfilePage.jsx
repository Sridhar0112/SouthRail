import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector,useDispatch } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PhoneIcon from '@mui/icons-material/Phone';
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';
import ShieldIcon from '@mui/icons-material/Shield';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../services/api.js';
import { getApiErrorMessage, isAuthError } from '../utils/apiErrors.js';
import { logout, updateUser } from '../features/auth/authSlice.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function getErrorMessage(error, fallback) {
  if (isAuthError(error)) return 'Please login again to continue.';
  return getApiErrorMessage(error, fallback);
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 3 }} role="tabpanel" id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`}>{children}</Box> : null;
}

function FieldRow({ icon, label, children }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: { xs: 0, sm: 160 }, width: { xs: '100%', sm: 'auto' } }}>
        <Box sx={{ color: 'text.disabled', display: 'flex' }}>{icon}</Box>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>{label}</Typography>
      </Stack>
      <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>{children}</Box>
    </Stack>
  );
}

function SectionCard({ title, subtitle, icon, action, children }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'flex-start' }} justifyContent="space-between" spacing={1.5} mb={2.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 38, height: 38, borderRadius: 2,
                bgcolor: 'primary.main', color: 'primary.contrastText',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}
            >
              {icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{title}</Typography>
              {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
            </Box>
          </Stack>
          {action}
        </Stack>
        <Divider sx={{ mb: 2.5 }} />
        {children}
      </CardContent>
    </Card>
  );
}

// ── Profile hero banner ────────────────────────────────────────────────────

function ProfileHero({ profile, loading }) {
  const roles = Array.from(profile?.roles || []);
  const displayName = profile?.fullName || 'Passenger';
  const initials = getInitials(displayName);

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <Box
        sx={{
          height: 64,
          bgcolor: 'primary.main',
          opacity: 0.12,
          position: 'absolute',
          top: 0, left: 0, right: 0
        }}
      />
      <Box sx={{ position: 'relative', px: { xs: 2, sm: 3 }, pt: 3, pb: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-end' }}>
          <Avatar
            sx={{
              width: 64, height: 64, fontSize: 28, fontWeight: 800,
              bgcolor: 'primary.main', color: 'primary.contrastText',
              border: 4, borderColor: 'background.paper',
              boxShadow: 3, flexShrink: 0, mt: { xs: 1, sm: 0 }
            }}
          >
            {loading ? '' : initials}
          </Avatar>
          <Stack flexGrow={1} pb={0.5}>
            {loading ? (
              <>
                <Skeleton width={180} height={32} />
                <Skeleton width={220} height={20} sx={{ mt: 0.5 }} />
              </>
            ) : (
              <>
                <Typography variant="h5" fontWeight={800} lineHeight={1.2} sx={{ overflowWrap: 'anywhere' }}>{displayName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{profile?.email}</Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap" useFlexGap>
                  {profile?.emailVerified && (
                    <Chip
                      size="small"
                      icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                      label="Verified"
                      color="success"
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: 11 }}
                    />
                  )}
                  {roles.map((r) => (
                    <Chip
                      key={r}
                      size="small"
                      icon={<ShieldIcon sx={{ fontSize: '14px !important' }} />}
                      label={String(r).replace('ROLE_', '')}
                      color={r === 'ROLE_ADMIN' ? 'error' : 'primary'}
                      variant="outlined"
                      sx={{ fontWeight: 600, fontSize: 11 }}
                    />
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
}

// ── Tab: Personal Info ─────────────────────────────────────────────────────

function PersonalInfoTab({ profile, loading, error, onSaved,onProfileUpdated, onRetry }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (profile) setForm({ fullName: profile.fullName || '', phone: profile.phone || '' });
  }, [profile]);

  const startEdit = () => { setMessage(null); setEditing(true); };
  const discardEdit = () => {
    setForm({ fullName: profile?.fullName || '', phone: profile?.phone || '' });
    setEditing(false);
    setMessage(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await api.put('/users/me', {
        fullName: form.fullName.trim(),
        phone: form.phone.trim()
      });
      onProfileUpdated?.(data);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      setEditing(false);
      onSaved?.();
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Could not update profile.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <SectionCard
        title="Personal details"
        subtitle="Your name and contact information"
        icon={<BadgeIcon fontSize="small" />}
        action={
          !editing && !loading && !error && (
            <Button size="small" startIcon={<EditIcon />} onClick={startEdit} sx={{ borderRadius: 2 }}>
              Edit
            </Button>
          )
        }
      >
        {loading && (
          <Stack spacing={2}>
            {[...Array(3)].map((_, i) => <Skeleton key={i} height={48} variant="rounded" />)}
          </Stack>
        )}
        {!loading && error && (
          <Stack alignItems="center" spacing={1.5} py={2}>
            <Typography color="error" variant="body2">{error}</Typography>
            <Button size="small" onClick={onRetry}>Retry</Button>
          </Stack>
        )}
        {!loading && !error && profile && (
          <Box component="form" onSubmit={handleSave}>
            <Stack spacing={1.5}>
              <FieldRow icon={<BadgeIcon fontSize="small" />} label="Full name">
                <TextField
                  label="Full name"
                  fullWidth size="small"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  disabled={!editing}
                  required
                  placeholder="Your full name"
                  inputProps={{ minLength: 2, maxLength: 120 }}
                />
              </FieldRow>

              <FieldRow icon={<EmailIcon fontSize="small" />} label="Email">
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Email"
                    fullWidth size="small"
                    value={profile.email || ''}
                    disabled
                    helperText="Email cannot be changed here"
                  />
                  {profile.emailVerified && (
                    <Tooltip title="Email verified">
                      <CheckCircleIcon color="success" fontSize="small" />
                    </Tooltip>
                  )}
                </Stack>
              </FieldRow>

              <FieldRow icon={<PhoneIcon fontSize="small" />} label="Phone">
                <TextField
                  label="Phone"
                  fullWidth size="small"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.slice(0, 15) }))}
                  disabled={!editing}
                  placeholder="Optional phone number"
                  inputProps={{ maxLength: 15 }}
                />
              </FieldRow>

              {message && (
                <Alert severity={message.type} sx={{ borderRadius: 2 }}>{message.text}</Alert>
              )}

              {editing && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end" pt={1}>
                  <Button variant="outlined" onClick={discardEdit} sx={{ borderRadius: 2 }}>
                    Discard
                  </Button>
                  <Button
                    type="submit" variant="contained"
                    startIcon={<SaveIcon />}
                    disabled={saving}
                    sx={{ borderRadius: 2 }}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        )}
      </SectionCard>
    </Stack>
  );
}

// ── Tab: Security ──────────────────────────────────────────────────────────

function SecurityTab({ onDeleteClick }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);
  useEffect(() => () => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
  }, []);
  const toggleShow = (field) => () => setShow((s) => ({ ...s, [field]: !s[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (form.next !== form.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (form.next.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    try {
      await api.put('/users/me/password', { currentPassword: form.current, newPassword: form.next });
      setMessage({ type: 'success', text: 'Password updated successfully.' });
      setForm({ current: '', next: '', confirm: '' });
      redirectTimerRef.current = setTimeout(() => {
        dispatch(logout());
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Could not update password.') });
    } finally {
      setSaving(false);
    }
  };

  const pwField = (field, label) => (
    <TextField
      label={label}
      type={show[field] ? 'text' : 'password'}
      value={form[field]}
      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
      fullWidth size="small" required
      inputProps={{ maxLength: 128 }}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={toggleShow(field)} edge="end" aria-label={show[field] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
              {show[field] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        )
      }}
    />
  );

  return (
    <Stack spacing={2}>
      <SectionCard
        title="Change password"
        subtitle="Use a strong password you don't use elsewhere"
        icon={<LockIcon fontSize="small" />}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={1.5}>
            {pwField('current', 'Current password')}
            <Divider />
            {pwField('next', 'New password')}
            {pwField('confirm', 'Confirm new password')}
            {form.next && <PasswordStrengthBar password={form.next} />}
            {message && <Alert severity={message.type} sx={{ borderRadius: 2 }}>{message.text}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end">
              <Button
                type="submit" variant="contained"
                startIcon={<LockIcon />}
                disabled={saving}
                sx={{ borderRadius: 2 }}
              >
                {saving ? 'Updating…' : 'Update password'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </SectionCard>

      <SectionCard
        title="Account roles"
        subtitle="Managed by administrators — contact support to request changes"
        icon={<ShieldIcon fontSize="small" />}
      >
        <AccountRoles />
      </SectionCard>

      <SectionCard
        title="Danger zone"
        subtitle="Irreversible actions — proceed with caution"
        icon={<SecurityIcon fontSize="small" />}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{
            p: 2,
            border: 1,
            borderColor: 'error.main',
            borderRadius: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(244,67,54,0.12)'
              : 'rgba(244,67,54,0.05)'
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="body2" fontWeight={700}>Delete my account</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-line' }}>
              {'Deactivates your account and signs you out from all devices.\nYou may register again later using the same email address.'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteForeverIcon />}
            sx={{ borderRadius: 2, flexShrink: 0, zIndex: 1 }}
            onClick={onDeleteClick}
          >
            Delete account
          </Button>
        </Stack>
      </SectionCard>
    </Stack>
  );
}

function PasswordStrengthBar({ password }) {
  const score = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['error', 'error', 'warning', 'info', 'success'];
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.5}>
        {[...Array(5)].map((_, i) => (
          <Box
            key={i}
            sx={{
              height: 4, flexGrow: 1, borderRadius: 2,
              bgcolor: i < score ? (score > 0 ? `${colors[score - 1]}.main` : 'transparent') : 'action.disabledBackground',
              transition: 'background-color 0.2s'
            }}
          />
        ))}
      </Stack>
      <Typography variant="caption" color={score > 0 ? `${colors[score - 1]}.main` : 'text.disabled'} fontWeight={600}>
        {score > 0 ? labels[score - 1] : ''}
      </Typography>
    </Stack>
  );
}

function AccountRoles() {
  const auth = useSelector((state) => state.auth);
  const roles = Array.from(auth.user?.roles || []);
  if (!roles.length) return <Typography variant="body2" color="text.secondary">No roles assigned.</Typography>;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {roles.map((r) => (
        <Chip
          key={r}
          label={String(r).replace('ROLE_', '')}
          icon={<ShieldIcon />}
          color={r === 'ROLE_ADMIN' ? 'error' : 'primary'}
          sx={{ fontWeight: 700 }}
        />
      ))}
    </Stack>
  );
}

// ── Tab: Notifications ─────────────────────────────────────────────────────

function NotificationsTab() {
  const items = ['Booking confirmations', 'Booking cancellations', 'PNR status updates', 'Account security messages'];

  return (
    <SectionCard
      title="Notifications"
      subtitle="Essential account and journey messages"
      icon={<NotificationsIcon fontSize="small" />}
    >
      <Stack spacing={2}>
        <Alert severity="info">
          SouthRail currently sends essential booking and account emails automatically. Notification preferences are not configurable yet.
        </Alert>
        <Box>
          <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1}>
            Email updates
          </Typography>
          <Stack component="ul" spacing={0.75} sx={{ pl: 2.5, mb: 0, mt: 1 }}>
            {items.map((item) => (
              <Typography component="li" variant="body2" color="text.secondary" key={item}>{item}</Typography>
            ))}
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      setDeleteError('');
      await api.delete('/users/me', { data: { password: deletePassword } });
      setDeleteDialogOpen(false);
      setDeletePassword('');
      setDeleteError('');
      dispatch(logout());
      navigate('/');
    } catch (error) {
      setDeleteError(getApiErrorMessage(error, 'Unable to delete account'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchProfile = useCallback(() => {
    setLoading(true);
    setError('');
    api.get('/users/me')
      .then(({ data }) => setProfile(data))
      .catch((err) => {
        setError(getErrorMessage(err, 'Unable to load profile right now.'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProfile(); }, [auth.user, fetchProfile]);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 2.25, md: 3.5 } }}>
      <Container maxWidth="md">
        <Stack spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Account</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your personal details, security, and account notifications
            </Typography>
          </Box>

          <ProfileHero profile={profile} loading={loading} />

          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: 2,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 44 }
              }}
            >
              <Tab id="tab-0" aria-controls="tabpanel-0" icon={<BadgeIcon fontSize="small" />} iconPosition="start" label="Personal info" />
              <Tab id="tab-1" aria-controls="tabpanel-1" icon={<LockIcon fontSize="small" />} iconPosition="start" label="Security" />
              <Tab id="tab-2" aria-controls="tabpanel-2" icon={<NotificationsIcon fontSize="small" />} iconPosition="start" label="Notifications" />
            </Tabs>
            <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
              <TabPanel value={tab} index={0}>
                <PersonalInfoTab
                  profile={profile}
                  loading={loading}
                  error={error}
                  onSaved={fetchProfile}
                  onProfileUpdated={(updatedUser) => dispatch(updateUser(updatedUser))}
                  onRetry={fetchProfile}
                />
              </TabPanel>
              <TabPanel value={tab} index={1}>
                <SecurityTab onDeleteClick={() => setDeleteDialogOpen(true)} />
              </TabPanel>
              <TabPanel value={tab} index={2}>
                <NotificationsTab />
              </TabPanel>
            </Box>
          </Paper>
        </Stack>
      </Container>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteDialogOpen(false);
            setDeletePassword('');
            setDeleteError('');
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete account</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will deactivate your SouthRail account and terminate all active sessions. You can register again later using the same email address.
          </Typography>
          <TextField
            fullWidth
            required
            autoFocus
            type="password"
            label="Confirm password"
            value={deletePassword}
            error={Boolean(deleteError)}
            helperText={deleteError}
            onChange={(e) => {
              setDeletePassword(e.target.value);
              if (deleteError) setDeleteError('');
            }}
            disabled={deleteLoading}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeletePassword('');
              setDeleteError('');
            }}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={!deletePassword || deleteLoading}
            onClick={handleDeleteAccount}
          >
            {deleteLoading ? 'Deleting...' : 'Delete account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
