import { useContext, useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar, Avatar, Box, Button, Container, Divider,
  Drawer,
  IconButton, ListItemIcon, Menu, MenuItem,
  Stack, Toolbar, Tooltip, Typography,
  List, ListItemButton, ListItemText, alpha
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TrainIcon from '@mui/icons-material/Train';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import { ColorModeContext } from '../theme/AppThemeProvider.jsx';
import { logout } from '../features/auth/authSlice.js';

function getInitials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

const NAV_ITEMS = [
  { label: 'Search Trains', to: '/', icon: SearchIcon },
  { label: 'PNR Status', to: '/pnr', icon: ConfirmationNumberIcon },
  { label: 'Dashboard', to: '/dashboard', icon: DashboardIcon, auth: true },
  { label: 'Support', to: '/support', icon: SupportAgentIcon, auth: true },
  { label: 'Admin', to: '/admin', icon: SupportAgentIcon, admin: true }
];

export function Shell() {
  const { mode, toggleColorMode } = useContext(ColorModeContext);
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isPageSettling, setIsPageSettling] = useState(true);
  const avatarButtonRef = useRef(null);
  const pageSettleTimerRef = useRef(null);

  useEffect(() => {
    const clearAuth = () => dispatch(logout());
    window.addEventListener('southrail-auth-cleared', clearAuth);
    return () => {
      window.removeEventListener('southrail-auth-cleared', clearAuth);
    };
  }, [dispatch]);

  const closeAllMenus = () => {
    setAnchorEl(null);
    setMobileNavOpen(false);
  };

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMobileNavOpen(false);
    if (isPageSettling) { closeAllMenus(); return; }
    if (anchorEl) { setAnchorEl(null); return; }
    setAnchorEl(event.currentTarget);
  };

  const goTo = (path) => {
    closeAllMenus();
    if (location.pathname !== path) { navigate(path); }
  };

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!anchorEl) return;
      const clickedAvatar = avatarButtonRef.current?.contains(event.target);
      const clickedMenu = document.querySelector('[role="menu"]')?.contains(event.target);
      if (!clickedAvatar && !clickedMenu) { closeAllMenus(); }
    };
    document.addEventListener('mousedown', handleDocumentClick, true);
    return () => document.removeEventListener('mousedown', handleDocumentClick, true);
  }, [anchorEl]);

  useEffect(() => {
    closeAllMenus();
    setIsPageSettling(true);
    if (pageSettleTimerRef.current) clearTimeout(pageSettleTimerRef.current);
    pageSettleTimerRef.current = setTimeout(() => {
      setIsPageSettling(false);
      pageSettleTimerRef.current = null;
    }, 1000);
    return () => { if (pageSettleTimerRef.current) clearTimeout(pageSettleTimerRef.current); };
  }, [location.pathname, location.search, location.hash]);

  const signOut = () => { closeAllMenus(); dispatch(logout()); navigate('/'); };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const displayName = auth.user?.fullName || auth.user?.name || '';
  const initials = getInitials(displayName);

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (item.admin) return Boolean(auth.user?.roles?.includes('ROLE_ADMIN'));
    if (item.auth) return Boolean(auth.user);
    return true;
  });

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0} color="inherit">
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: { xs: 0.5, md: 1.5 }, minHeight: { xs: 48, sm: 52 }, py: 0.25 }}>
            {/* Logo */}
            <Stack
              component={Link}
              to="/"
              onClick={closeAllMenus}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                mr: 'auto',
                minWidth: 0,
                maxWidth: { xs: 'min(40vw, 160px)', sm: 'none' },
                py: 0.5,
                pr: 1.2,
                borderRadius: 2,
                color: 'text.primary',
                textDecoration: 'none',
                transition: 'all 180ms ease',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Box sx={{
                width: 32, height: 32, borderRadius: 2,
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`
              }}>
                <TrainIcon sx={{ fontSize: 18, color: 'primary.contrastText' }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={800} noWrap sx={{ fontSize: { xs: '0.88rem', sm: '0.95rem' }, lineHeight: 1.2 }}>
                  SouthRail
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.62rem', lineHeight: 1, display: { xs: 'none', sm: 'block' } }}>
                  Indian Railways Booking
                </Typography>
              </Box>
            </Stack>

            {/* Desktop nav */}
            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {visibleNavItems.map((item) => {
                const active = isActive(item.to);
                return (
                  <Button
                    key={item.to}
                    component={Link}
                    to={item.to}
                    onClick={closeAllMenus}
                    disableRipple
                    sx={{
                      position: 'relative',
                      color: active ? 'primary.main' : 'text.secondary',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.8rem',
                      px: 1.4,
                      py: 0.6,
                      minHeight: 32,
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      transition: 'all 200ms ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        color: active ? 'primary.main' : 'text.primary'
                      },
                      '&::after': active ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 2,
                        left: '20%',
                        width: '60%',
                        height: 2.5,
                        borderRadius: 999,
                        bgcolor: 'primary.main',
                        transition: 'all 200ms ease'
                      } : {}
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Stack>

            {/* Theme toggle */}
            <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
              <IconButton
                onClick={() => { closeAllMenus(); toggleColorMode(); }}
                sx={{
                  width: 32, height: 32,
                  bgcolor: 'action.hover',
                  flexShrink: 0,
                  borderRadius: 1.5,
                  color: 'text.secondary',
                  transition: 'all 180ms ease',
                  '&:hover': { bgcolor: 'action.selected', color: 'primary.main' }
                }}
                aria-label="Toggle theme"
              >
                {mode === 'light' ? <DarkModeIcon sx={{ fontSize: 18 }} /> : <LightModeIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </Tooltip>

            {/* Auth */}
            {auth.user ? (
              <>
                <Tooltip title="Account">
                  <IconButton
                    ref={avatarButtonRef}
                    onClick={handleMenuOpen}
                    aria-disabled={isPageSettling ? 'true' : undefined}
                    aria-haspopup="menu"
                    aria-expanded={anchorEl ? 'true' : undefined}
                    sx={{ p: 0, cursor: isPageSettling ? 'default' : 'pointer' }}
                  >
                    <Avatar
                      sx={{
                        width: 32, height: 32,
                        bgcolor: 'primary.main',
                        fontSize: 13,
                        fontWeight: 700,
                        border: 2,
                        borderColor: anchorEl ? 'primary.main' : 'transparent',
                        transition: 'all 180ms ease',
                        cursor: 'pointer',
                        boxShadow: (theme) => anchorEl ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}` : 'none'
                      }}
                    >
                      {initials || <AccountCircleIcon fontSize="small" />}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={closeAllMenus}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  slotProps={{ paper: { elevation: 0, sx: { mt: 1.2, width: { xs: 'calc(100vw - 32px)', sm: 280 }, maxWidth: 320, borderRadius: 3, overflow: 'visible' } } }}
                  sx={{ '& .MuiPaper-root': { border: (theme) => `1px solid ${theme.palette.divider}` } }}
                >
                  <Box sx={{ px: 2, py: 2, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ maxWidth: '100%' }}>
                      {displayName || 'Passenger'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ maxWidth: '100%', mt: 0.3 }}>
                      {auth.user?.email || ''}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={() => goTo('/dashboard')} sx={{ py: 1, mx: 0.5, borderRadius: 1.5 }}>
                    <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                    Dashboard
                  </MenuItem>
                  <MenuItem onClick={() => goTo('/profile')} sx={{ py: 1, mx: 0.5, borderRadius: 1.5 }}>
                    <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                    Profile
                  </MenuItem>
                  <MenuItem onClick={() => goTo('/my-tickets')} sx={{ py: 1, mx: 0.5, borderRadius: 1.5 }}>
                    <ListItemIcon><ConfirmationNumberIcon fontSize="small" /></ListItemIcon>
                    My Tickets
                  </MenuItem>
                  {auth.user?.roles?.includes('ROLE_ADMIN') && (
                    <MenuItem onClick={() => goTo('/admin/support-tickets')} sx={{ py: 1, mx: 0.5, borderRadius: 1.5 }}>
                      <ListItemIcon><SupportAgentIcon fontSize="small" /></ListItemIcon>
                      Support Tickets
                    </MenuItem>
                  )}
                  <Divider />
                  <MenuItem onClick={signOut} sx={{ py: 1, mx: 0.5, borderRadius: 1.5, color: 'error.main' }}>
                    <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                variant="contained"
                component={Link}
                to="/login"
                onClick={closeAllMenus}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  borderRadius: 2,
                  px: 2,
                  minHeight: 32,
                  fontSize: '0.8rem'
                }}
              >
                Sign In
              </Button>
            )}

            {/* Mobile menu trigger */}
            <Tooltip title="Menu">
              <IconButton
                onClick={() => { setAnchorEl(null); setMobileNavOpen(true); }}
                sx={{
                  display: { xs: 'inline-flex', md: 'none' },
                  width: 32, height: 32,
                  bgcolor: 'action.hover',
                  flexShrink: 0,
                  borderRadius: 1.5,
                  color: 'text.secondary'
                }}
                aria-label="Open navigation menu"
              >
                <MenuIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={mobileNavOpen}
        onClose={closeAllMenus}
        PaperProps={{ sx: { width: { xs: 'calc(100vw - 32px)', sm: 360 }, maxWidth: '100vw', p: 2 } }}
      >
        <Stack spacing={1.5} sx={{ height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 2,
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: (theme) => `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`
              }}>
                <TrainIcon sx={{ fontSize: 20, color: 'primary.contrastText' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>SouthRail</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', lineHeight: 1 }}>
                  Indian Railways Booking
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={closeAllMenus} aria-label="Close menu" sx={{ borderRadius: 1.5, width: 32, height: 32 }}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>

          <Divider />

          {/* Mobile nav logged-out state */}
          {!auth.user && (
            <Button
              variant="contained"
              fullWidth
              component={Link}
              to="/login"
              onClick={closeAllMenus}
              sx={{ borderRadius: 2, py: 1.2 }}
            >
              Sign In
            </Button>
          )}

          <List disablePadding sx={{ flex: 1 }}>
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <ListItemButton
                  key={item.to}
                  component={Link}
                  to={item.to}
                  onClick={closeAllMenus}
                  selected={active}
                  sx={{
                    borderRadius: 2,
                    py: 1.2,
                    px: 1.5,
                    mb: 0.3,
                    transition: 'all 150ms ease',
                    '&.Mui-selected': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                      '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.15) }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38, color: active ? 'primary.main' : 'text.secondary' }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: active ? 700 : 500,
                      color: active ? 'primary.main' : 'text.primary',
                      fontSize: '0.88rem'
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>

          {/* Account section in mobile drawer */}
          {auth.user && (
            <>
              <Divider />
              <Box sx={{ px: 1, py: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}>
                    {initials || <AccountCircleIcon fontSize="small" />}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>{displayName || 'Passenger'}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {auth.user?.email || ''}
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  onClick={signOut}
                  startIcon={<LogoutIcon />}
                  sx={{ mt: 1.5, borderRadius: 2, py: 0.8, fontSize: '0.8rem' }}
                >
                  Sign Out
                </Button>
              </Box>
            </>
          )}
        </Stack>
      </Drawer>

      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
