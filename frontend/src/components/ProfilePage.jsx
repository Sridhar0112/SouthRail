import { useEffect, useState } from 'react';
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
  Grid,
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
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function FieldRow({ icon, label, children }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 160 }}>
        <Box sx={{ color: 'text.disabled', display: 'flex' }}>{icon}</Box>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>{label}</Typography>
      </Stack>
      <Box sx={{ flexGrow: 1 }}>{children}</Box>
    </Stack>
  );
}

function SectionCard({ title, subtitle, icon, action, children }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2.5}>
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
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
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
      {/* Accent stripe */}
      <Box
        sx={{
          height: 80,
          bgcolor: 'primary.main',
          opacity: 0.12,
          position: 'absolute',
          top: 0, left: 0, right: 0
        }}
      />
      <Box sx={{ position: 'relative', px: { xs: 2, sm: 3 }, pt: 3, pb: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'flex-end' }}>
          <Avatar
            sx={{
              width: 80, height: 80, fontSize: 28, fontWeight: 800,
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
                <Typography variant="h5" fontWeight={800} lineHeight={1.2}>{displayName}</Typography>
                <Typography variant="body2" color="text.secondary">{profile?.email}</Typography>
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
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }

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
  fullName: form.fullName,
  phone: form.phone.replace(/\D/g, '').slice(0, 10)
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
    <Stack spacing={3}>
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
            <Stack spacing={2.5}>
              <FieldRow icon={<BadgeIcon fontSize="small" />} label="Full name">
                <TextField
                  fullWidth size="small"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  disabled={!editing}
                  required
                  placeholder="Your full name"
                />
              </FieldRow>

              <FieldRow icon={<EmailIcon fontSize="small" />} label="Email">
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
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
                  fullWidth size="small"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  disabled={!editing}
                  placeholder="10-digit mobile number"
                  inputProps={{ maxLength: 10 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="body2" color="text.secondary">+91</Typography>
                      </InputAdornment>
                    )
                  }}
                />
              </FieldRow>

              {message && (
                <Alert severity={message.type} sx={{ borderRadius: 2 }}>{message.text}</Alert>
              )}

              {editing && (
                <Stack direction="row" spacing={1.5} justifyContent="flex-end" pt={1}>
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
      setTimeout(() => {
  dispatch(logout());
  navigate('/login');
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
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={toggleShow(field)} edge="end">
              {show[field] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </InputAdornment>
        )
      }}
    />
  );

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Change password"
        subtitle="Use a strong password you don't use elsewhere"
        icon={<LockIcon fontSize="small" />}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            {pwField('current', 'Current password')}
            <Divider />
            {pwField('next', 'New password')}
            {pwField('confirm', 'Confirm new password')}
            {form.next && (
              <PasswordStrengthBar password={form.next} />
            )}
            {message && (
              <Alert severity={message.type} sx={{ borderRadius: 2 }}>{message.text}</Alert>
            )}
            <Stack direction="row" justifyContent="flex-end">
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
  bgcolor: (theme) =>
    theme.palette.mode === 'dark'
      ? 'rgba(244,67,54,0.12)'
      : 'rgba(244,67,54,0.05)'
}}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="body2" fontWeight={700}>Delete my account</Typography>
            <Typography variant="caption"  sx={{
    color: 'text.secondary'
  }}>
              Deactivates your account and signs you out from all devices.
You may register again later using the same email address.
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
              bgcolor: i < score ? `${colors[score - 1]}.main` : 'action.disabledBackground',
              transition: 'background-color 0.2s'
            }}
          />
        ))}
      </Stack>
      <Typography variant="caption" color={`${colors[score - 1] || 'text'}.main`} fontWeight={600}>
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
  const [prefs, setPrefs] = useState({
    emailBookingConfirmation: true,
    emailCancellation: true,
    emailPnrUpdates: false,
    smsBookingConfirmation: false,
    smsCancellation: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/users/me/notification-preferences', prefs);
      setMessage({ type: 'success', text: 'Notification preferences saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Could not save preferences.') });
    } finally {
      setSaving(false);
    }
  };

  const groups = [
    {
      label: 'Email notifications',
      items: [
        { key: 'emailBookingConfirmation', label: 'Booking confirmed', desc: 'When a ticket is successfully booked' },
        { key: 'emailCancellation', label: 'Booking cancelled', desc: 'When a booking is cancelled' },
        { key: 'emailPnrUpdates', label: 'PNR status updates', desc: 'Waitlist and chart preparation alerts' },
      ]
    },
    {
      label: 'SMS notifications',
      items: [
        { key: 'smsBookingConfirmation', label: 'Booking confirmed', desc: 'SMS when ticket is booked' },
        { key: 'smsCancellation', label: 'Booking cancelled', desc: 'SMS when booking is cancelled' },
      ]
    }
  ];

  return (
    <SectionCard
      title="Notification preferences"
      subtitle="Choose how SouthRail keeps you in the loop"
      icon={<NotificationsIcon fontSize="small" />}
    >
      <Stack spacing={3}>
        {groups.map((group) => (
          <Box key={group.label}>
            <Typography variant="overline" color="text.disabled" fontWeight={700} letterSpacing={1}>
              {group.label}
            </Typography>
            <Stack spacing={1} mt={1}>
              {group.items.map((item) => (
                <Stack
                  key={item.key}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{
                    p: 1.5, borderRadius: 2,
                    border: 1, borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    transition: 'background-color 0.15s'
                  }}
                  onClick={() => toggle(item.key)}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{item.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.desc}</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 42, height: 24, borderRadius: 12,
                      bgcolor: prefs[item.key] ? 'primary.main' : 'action.disabledBackground',
                      position: 'relative', flexShrink: 0, ml: 2,
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <Box
                      sx={{
                        width: 18, height: 18, borderRadius: '50%',
                        bgcolor: 'white',
                        position: 'absolute',
                        top: 3,
                        left: prefs[item.key] ? 21 : 3,
                        transition: 'left 0.2s',
                        boxShadow: 1
                      }}
                    />
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}

        {message && <Alert severity={message.type} sx={{ borderRadius: 2 }}>{message.text}</Alert>}

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained" startIcon={<SaveIcon />}
            onClick={handleSave} disabled={saving}
            sx={{ borderRadius: 2 }}
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </Button>
        </Stack>
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
    await api.delete('/users/me', {
      data: {
        password: deletePassword
      }
    });

setDeleteDialogOpen(false);
setDeletePassword('');
setDeleteError('');
dispatch(logout());

navigate('/');

  } catch (error) {
setDeleteError(
    getApiErrorMessage(error, 'Unable to delete account')
  );
  } finally {
    setDeleteLoading(false);
  }
};
  const fetchProfile = () => {
    setLoading(true);
    setError('');
    api.get('/users/me')
      .then(({ data }) => setProfile(data))
      .catch((err) => {
        console.error('Profile load failed', err);
        setError(getErrorMessage(err, 'Unable to load profile right now.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, [auth.user]);

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          {/* Page title */}
          <Box>
            <Typography variant="h5" fontWeight={800}>Account</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your personal details, security, and notification preferences
            </Typography>
          </Box>

          {/* Hero */}
          <ProfileHero profile={profile} loading={loading} />

          {/* Tabs */}
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
                '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 52 }
              }}
            >
              <Tab icon={<BadgeIcon fontSize="small" />} iconPosition="start" label="Personal info" />
              <Tab icon={<LockIcon fontSize="small" />} iconPosition="start" label="Security" />
              <Tab icon={<NotificationsIcon fontSize="small" />} iconPosition="start" label="Notifications" />
            </Tabs>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
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
  <DialogTitle>Delete Account</DialogTitle>

  <DialogContent>
    <Typography sx={{ mb: 2 }}>
      This will deactivate your SouthRail account and terminate all active sessions.
      You can register again later using the same email address.
    </Typography>

    <TextField
  fullWidth
  required
  autoFocus
  type="password"
  label="Confirm Password"
  value={deletePassword}
  error={Boolean(deleteError)}
  helperText={deleteError}
  onChange={(e) => {
    setDeletePassword(e.target.value);
    if (deleteError) {
      setDeleteError('');
    }
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
      {deleteLoading ? 'Deleting...' : 'Delete Account'}
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
}