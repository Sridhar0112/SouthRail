import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import LoginIcon from "@mui/icons-material/Login";
import EmailIcon from "@mui/icons-material/Email";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ForwardToInboxIcon from "@mui/icons-material/ForwardToInbox";
import GppBadOutlinedIcon from "@mui/icons-material/GppBadOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import TrainIcon from "@mui/icons-material/Train";
import { login } from "./authSlice.js";
import api from "../../services/api.js";
import { getApiErrorMessage } from "../../utils/apiErrors.js";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  alpha,
} from "@mui/material";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
const LOCK_DURATION = 15 * 60;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [apiError, setApiError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const loading = useSelector((state) => state.auth.loading);
  const [showResend, setShowResend] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlockMessage, setUnlockMessage] = useState("");
  const [sendingUnlock, setSendingUnlock] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [countdownSecs, setCountdownSecs] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setInterval(() => {
      const remainingSeconds = Math.max(0, Math.floor((new Date(lockedUntil).getTime() - Date.now()) / 1000));
      setCountdownSecs(remainingSeconds);
      if (remainingSeconds <= 0) { setShowUnlock(false); setLockedUntil(null); setCountdownSecs(0); clearInterval(timer); }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const countdownDisplay = `${Math.floor(countdownSecs / 60)}:${String(countdownSecs % 60).padStart(2, "0")}`;
  const countdownProgress = ((LOCK_DURATION - countdownSecs) / LOCK_DURATION) * 100;
  const unlockTime = lockedUntil ? new Date(lockedUntil).toLocaleTimeString() : "";

  const onSubmit = async (values) => {
    setApiError(""); setShowResend(false); setVerificationMessage(""); setUnlockMessage("");
    try {
      await dispatch(login(values)).unwrap();
      navigate(location.state?.from?.pathname || "/dashboard");
    } catch (payload) {
      const response = normalizeLoginPayload(payload);
      const errorMessage = response.message;
      setApiError(errorMessage);
      if (errorMessage.toLowerCase().includes("verify your email")) { setShowResend(true); setEmailForVerification(values.email); }
      if (response.status === 423 && response.lockedUntil) {
        setShowUnlock(true); setUnlockEmail(values.email); setLockedUntil(response.lockedUntil);
        const initialSeconds = Math.max(0, Math.floor((new Date(response.lockedUntil).getTime() - Date.now()) / 1000));
        setCountdownSecs(initialSeconds);
      }
    }
  };

  const sendUnlockEmail = async () => {
    setApiError(""); setUnlockMessage(""); setSendingUnlock(true);
    try {
      await api.post("/auth/send-unlock-email", { email: unlockEmail });
      setUnlockMessage("Unlock email sent successfully. Please check your inbox.");
      setShowUnlock(false);
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Unable to send unlock email."));
      setShowUnlock(false);
    } finally { setSendingUnlock(false); }
  };

  const resendVerification = async () => {
    setApiError(""); setVerificationMessage(""); setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: emailForVerification });
      setVerificationMessage("Verification email sent successfully. Please check your inbox and spam folder.");
      setShowResend(false);
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Unable to resend verification email."));
    } finally { setResending(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          border: '1px solid',
          borderColor: 'var(--southrail-glass-border)',
          boxShadow: 'var(--southrail-glass-shadow)',
          background: (theme) => alpha(theme.palette.surface.raised, 0.96),
        }}
      >
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
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" } }}>
            Welcome back
          </Typography>
          <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            Sign in to your SouthRail account
          </Typography>
        </Stack>

        {location.state?.message && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{location.state.message}</Alert>}

        {apiError && !(apiError.toLowerCase().includes("account locked") || apiError.toLowerCase().includes("temporarily locked")) && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{apiError}</Alert>
        )}
        {unlockMessage && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{unlockMessage}</Alert>}
        {verificationMessage && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{verificationMessage}</Alert>}

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2.5}>
            <TextField
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              slotProps={{
                input: { startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" color="disabled" /></InputAdornment> }
              }}
              {...register("email", { required: "Email is required" })}
            />
            <TextField
              label="Password"
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register("password", { required: "Password is required" })}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />
            {showResend && (
              <Typography variant="body2" align="center">
                Need a new verification email?{' '}
                <Button variant="text" size="small" onClick={resendVerification} disabled={resending} sx={{ fontWeight: 700 }}>
                  {resending ? "Sending..." : "Resend verification email"}
                </Button>
              </Typography>
            )}
            <Button type="submit" variant="contained" startIcon={loading ? null : <LoginIcon />} disabled={loading} fullWidth sx={{ py: 1.4, borderRadius: 2 }}>
              {loading ? "Logging in\u2026" : "Sign in"}
            </Button>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button component={Link} to="/forgot-password" variant="text" size="small" sx={{ fontSize: '0.8rem' }}>
                Forgot password
              </Button>
              <Typography variant="body2" color="text.disabled" sx={{ alignSelf: 'center' }}>|</Typography>
              <Button component={Link} to="/register" variant="text" size="small" sx={{ fontSize: '0.8rem' }}>
                Create account
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Dialog
        open={showUnlock}
        onClose={() => setShowUnlock(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, overflow: "hidden", mx: { xs: 1.5, sm: 2 } }
        }}
      >
        <Box sx={{
          bgcolor: "#c62828", px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 },
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: { xs: 1.5, sm: 2 },
          position: "relative", overflow: "hidden"
        }}>
          <Box sx={{ position: "absolute", right: -24, top: -24, width: 110, height: 110, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.07)" }} />
          <Box sx={{ position: "absolute", right: 40, bottom: -35, width: 85, height: 85, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.05)" }} />
          <Box sx={{
            width: 44, height: 44, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1,
            animation: "lockPulse 2s ease-in-out infinite",
            "@keyframes lockPulse": {
              "0%,100%": { boxShadow: "0 0 0 0 rgba(255,255,255,0.35)" },
              "50%": { boxShadow: "0 0 0 10px rgba(255,255,255,0)" },
            },
          }}>
            <LockOutlinedIcon sx={{ color: "#fff", fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: "1 1 150px", minWidth: 0, zIndex: 1 }}>
            <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.25 }}>Account locked</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: "0.73rem", mt: 0.25 }}>Security protection triggered</Typography>
          </Box>
          <Box sx={{ bgcolor: "rgba(0,0,0,0.22)", borderRadius: 2, px: 1.4, py: 0.6, zIndex: 1, textAlign: "center", minWidth: 56, ml: "auto" }}>
            <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.5px" }}>
              {countdownDisplay}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.62)", fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              remaining
            </Typography>
          </Box>
        </Box>
        <Box sx={{ height: 4, bgcolor: "rgba(198,40,40,0.12)" }}>
          <Box sx={{ height: "100%", width: `${100 - countdownProgress}%`, bgcolor: "#ef5350", transition: "width 1s linear", borderRadius: "0 2px 2px 0" }} />
        </Box>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.65, fontSize: "0.83rem" }}>
            Your account was locked after{' '}
            <Box component="span" sx={{ fontWeight: 700, color: "#c62828" }}>5 failed attempts</Box>
            . Send an unlock link to your email or wait for the timer to expire.
          </Typography>
          <Typography sx={{ textAlign: "center", fontSize: "0.75rem", color: "text.secondary", mb: 2 }}>
            Automatic unlock at <strong>{unlockTime}</strong>
          </Typography>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mb: 2 }}>
            <Box sx={{ flex: 1, bgcolor: "action.hover", borderRadius: 2, px: 1.5, py: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
              <GppBadOutlinedIcon sx={{ fontSize: 18, color: "#c62828", flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "#c62828", lineHeight: 1 }}>5 / 5</Typography>
                <Typography sx={{ fontSize: "0.67rem", color: "text.disabled", mt: 0.25 }}>max attempts</Typography>
              </Box>
            </Box>
            <Box sx={{ flex: 1, bgcolor: "action.hover", borderRadius: 2, px: 1.5, py: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
              <AccessTimeIcon sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }} />
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: "0.88rem", color: "text.primary", lineHeight: 1 }}>{countdownDisplay}</Typography>
                <Typography sx={{ fontSize: "0.67rem", color: "text.disabled", mt: 0.25 }}>auto-unlock</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1.2, alignItems: "flex-start", bgcolor: "action.hover", borderLeft: "3px solid #c62828", borderRadius: "0 10px 10px 0", px: 1.5, py: 1.25, mb: 0.5 }}>
            <ShieldOutlinedIcon sx={{ fontSize: 15, color: "#c62828", mt: "1px", flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", lineHeight: 1.6 }}>
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>Security tip: </Box>
              If these weren't you, change your password immediately after unlocking.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 3, pt: 1.5, gap: 1.5, flexDirection: { xs: "column-reverse", sm: "row" }, "& .MuiButton-root": { width: { xs: "100%", sm: "auto" }, ml: { xs: "0 !important" } } }}>
          <Button onClick={() => { setShowUnlock(false); setLockedUntil(null); setCountdownSecs(0); }} variant="outlined" color="inherit" size="small" sx={{ flex: 1, borderRadius: 2, fontWeight: 600, py: 1, fontSize: "0.82rem" }}>
            Close
          </Button>
          <Button variant="contained" onClick={sendUnlockEmail} disabled={sendingUnlock} startIcon={<ForwardToInboxIcon sx={{ fontSize: 16 }} />} size="small" sx={{ flex: 2, borderRadius: 2, fontWeight: 600, py: 1, fontSize: "0.82rem", bgcolor: "#c62828", boxShadow: "0 4px 14px rgba(198,40,40,0.35)", "&:hover": { bgcolor: "#b71c1c", boxShadow: "0 6px 18px rgba(198,40,40,0.45)" } }}>
            {sendingUnlock ? "Sending..." : "Send unlock email"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function normalizeLoginPayload(payload) {
  if (typeof payload === "string") return { message: payload };
  if (payload && typeof payload === "object") {
    const message = typeof payload.message === "string" && payload.message.trim() ? payload.message : "Login failed. Check your email and password.";
    return { message, status: payload.status, lockedUntil: payload.lockedUntil };
  }
  return { message: "Login failed. Check your email and password." };
}
