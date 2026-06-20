import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import LoginIcon from "@mui/icons-material/Login";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ForwardToInboxIcon from "@mui/icons-material/ForwardToInbox";
import GppBadOutlinedIcon from "@mui/icons-material/GppBadOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
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
      const remainingSeconds = Math.max(
        0,
        Math.floor((new Date(lockedUntil).getTime() - Date.now()) / 1000),
      );

      setCountdownSecs(remainingSeconds);

      if (remainingSeconds <= 0) {
        setShowUnlock(false);
        setLockedUntil(null);
        setCountdownSecs(0);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockedUntil]);

  const countdownDisplay = `${Math.floor(countdownSecs / 60)}:${String(countdownSecs % 60).padStart(2, "0")}`;
  const countdownProgress =
    ((LOCK_DURATION - countdownSecs) / LOCK_DURATION) * 100;
  const unlockTime = lockedUntil
    ? new Date(lockedUntil).toLocaleTimeString()
    : "";
  const onSubmit = async (values) => {
    setApiError("");
    setShowResend(false);
    setVerificationMessage("");
    setUnlockMessage("");
    try {
      await dispatch(login(values)).unwrap();
      navigate(location.state?.from?.pathname || "/dashboard");
    } catch (message) {
      const errorMessage =
        message?.message || "Login failed. Check your email and password.";
      setApiError(message);
      if (errorMessage?.toLowerCase().includes("verify your email")) {
        setShowResend(true);
        setEmailForVerification(values.email);
      }
      const response = message;

      if (response?.status === 423 && response?.lockedUntil) {
        setShowUnlock(true);
        setUnlockEmail(values.email);
        setLockedUntil(response.lockedUntil);
        const initialSeconds = Math.max(
          0,
          Math.floor(
            (new Date(response.lockedUntil).getTime() - Date.now()) / 1000,
          ),
        );

        setCountdownSecs(initialSeconds);
      }
    }
  };

  const sendUnlockEmail = async () => {
    setApiError("");
    setUnlockMessage("");
    setSendingUnlock(true);
    try {
      await api.post("/auth/send-unlock-email", { email: unlockEmail });
      setUnlockMessage(
        "Unlock email sent successfully. Please check your inbox.",
      );
      setShowUnlock(false);
    } catch (error) {
      setApiError(getApiErrorMessage(error, "Unable to send unlock email."));
      setShowUnlock(false);
    } finally {
      setSendingUnlock(false);
    }
  };

  const resendVerification = async () => {
    setApiError("");
    setVerificationMessage("");
    setResending(true);
    try {
      await api.post("/auth/resend-verification", {
        email: emailForVerification,
      });
      setVerificationMessage(
        "Verification email sent successfully. Please check your inbox and spam folder.",
      );
      setShowResend(false);
    } catch (error) {
      setApiError(
        getApiErrorMessage(error, "Unable to resend verification email."),
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 8 } }}>
      <Paper sx={{ p: { xs: 2, sm: 5 }, width: "100%", maxWidth: "100%", minWidth: 0 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          gutterBottom
          sx={{ fontSize: { xs: "1.65rem", sm: "2.125rem" } }}
        >
          Welcome back
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, overflowWrap: 'anywhere' }}>
          Book faster across Chennai, Bengaluru, Kochi, Hyderabad, Madurai,
          Mangaluru, and more.
        </Typography>

        {location.state?.message && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {location.state.message}
          </Alert>
        )}
        {apiError &&
          !(
            (apiError?.message || "")
              .toLowerCase()
              .includes("account locked") ||
            (apiError?.message || "")
              .toLowerCase()
              .includes("temporarily locked")
          ) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError?.message || apiError}
            </Alert>
          )}
        {unlockMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {unlockMessage}
          </Alert>
        )}
        {verificationMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {verificationMessage}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2} sx={{ "& .MuiTextField-root": { width: "100%" } }}>
            <TextField
              label="Email"
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email", { required: "Email is required" })}
            />
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register("password", {
                required: "Password is required",
              })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {showResend && (
              <Typography align="center" sx={{ mb: 2 }}>
                Need a new verification email?{" "}
                <Button
                  variant="text"
                  size="small"
                  onClick={resendVerification}
                  disabled={resending}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </Button>
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              startIcon={<LoginIcon />}
              disabled={loading}
              fullWidth
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
            <Button component={Link} to="/forgot-password" fullWidth>
              Forgot password
            </Button>
            <Button component={Link} to="/register" fullWidth>
              Create a new account
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* ✅ Dialog is NOW outside Paper and form — renders at root level */}
      <Dialog
        open={showUnlock}
        onClose={() => setShowUnlock(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            width: "calc(100% - 24px)",
            mx: { xs: 1.5, sm: 2 },
          },
        }}
      >
        {/* ── Red Header ── */}
        <Box
          sx={{
            bgcolor: "#c62828",
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: { xs: 1.5, sm: 2 },
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative bubbles */}
          <Box
            sx={{
              position: "absolute",
              right: -24,
              top: -24,
              width: 110,
              height: 110,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.07)",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              right: 40,
              bottom: -35,
              width: 85,
              height: 85,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.05)",
            }}
          />

          {/* Pulsing lock */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              zIndex: 1,
              animation: "lockPulse 2s ease-in-out infinite",
              "@keyframes lockPulse": {
                "0%,100%": { boxShadow: "0 0 0 0 rgba(255,255,255,0.35)" },
                "50%": { boxShadow: "0 0 0 10px rgba(255,255,255,0)" },
              },
            }}
          >
            <LockOutlinedIcon sx={{ color: "#fff", fontSize: 22 }} />
          </Box>

          {/* Title */}
          <Box sx={{ flex: "1 1 150px", minWidth: 0, zIndex: 1 }}>
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: "1.05rem",
                lineHeight: 1.25,
              }}
            >
              Account locked
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.72)",
                fontSize: "0.73rem",
                mt: 0.25,
              }}
            >
              Security protection triggered
            </Typography>
          </Box>

          {/* Countdown badge */}
          <Box
            sx={{
              bgcolor: "rgba(0,0,0,0.22)",
              borderRadius: "12px",
              px: 1.4,
              py: 0.6,
              zIndex: 1,
              textAlign: "center",
              minWidth: 56,
              ml: "auto",
            }}
          >
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 800,
                fontSize: "1.05rem",
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.5px",
              }}
            >
              {countdownDisplay}
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.62)",
                fontSize: "0.58rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              remaining
            </Typography>
          </Box>
        </Box>

        {/* ── Draining progress bar ── */}
        <Box sx={{ height: 4, bgcolor: "rgba(198,40,40,0.12)" }}>
          <Box
            sx={{
              height: "100%",
              width: `${100 - countdownProgress}%`,
              bgcolor: "#ef5350",
              transition: "width 1s linear",
              borderRadius: "0 2px 2px 0",
            }}
          />
        </Box>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: 1 }}>
          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.65, fontSize: "0.83rem" }}
          >
            Your account was locked after{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "#c62828" }}>
              5 failed attempts
            </Box>
            . Send an unlock link to your email or wait for the timer to expire.
          </Typography>
          <Typography
            sx={{
              textAlign: "center",
              fontSize: "0.75rem",
              color: "text.secondary",
              mb: 2,
            }}
          >
            Automatic unlock at <strong>{unlockTime}</strong>
          </Typography>
          {/* Stat pills */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box
              sx={{
                flex: 1,
                bgcolor: "action.hover",
                borderRadius: "12px",
                px: 1.5,
                py: 1.25,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <GppBadOutlinedIcon
                sx={{ fontSize: 18, color: "#c62828", flexShrink: 0 }}
              />
              <Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: "#c62828",
                    lineHeight: 1,
                  }}
                >
                  5 / 5
                </Typography>
                <Typography
                  sx={{ fontSize: "0.67rem", color: "text.disabled", mt: 0.25 }}
                >
                  max attempts
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1,
                bgcolor: "action.hover",
                borderRadius: "12px",
                px: 1.5,
                py: 1.25,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <AccessTimeIcon
                sx={{ fontSize: 18, color: "text.secondary", flexShrink: 0 }}
              />
              <Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: "text.primary",
                    lineHeight: 1,
                  }}
                >
                  {countdownDisplay}
                </Typography>
                <Typography
                  sx={{ fontSize: "0.67rem", color: "text.disabled", mt: 0.25 }}
                >
                  auto-unlock
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Security tip */}
          <Box
            sx={{
              display: "flex",
              gap: 1.2,
              alignItems: "flex-start",
              bgcolor: "action.hover",
              borderLeft: "3px solid #c62828",
              borderRadius: "0 10px 10px 0",
              px: 1.5,
              py: 1.25,
              mb: 0.5,
            }}
          >
            <ShieldOutlinedIcon
              sx={{ fontSize: 15, color: "#c62828", mt: "1px", flexShrink: 0 }}
            />
            <Typography
              sx={{
                fontSize: "0.72rem",
                color: "text.secondary",
                lineHeight: 1.6,
              }}
            >
              <Box
                component="span"
                sx={{ fontWeight: 700, color: "text.primary" }}
              >
                Security tip:{" "}
              </Box>
              If these weren't you, change your password immediately after
              unlocking.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            pb: 3,
            pt: 1.5,
            gap: 1.5,
            flexDirection: { xs: "column-reverse", sm: "row" },
            "& .MuiButton-root": {
              width: { xs: "100%", sm: "auto" },
              ml: { xs: "0 !important" },
            },
          }}
        >
          <Button
            onClick={() => {
              setShowUnlock(false);
              setLockedUntil(null);
              setCountdownSecs(0);
            }}
            variant="outlined"
            color="inherit"
            size="small"
            sx={{
              flex: 1,
              textTransform: "none",
              borderRadius: "50px",
              fontWeight: 600,
              py: 1,
              fontSize: "0.82rem",
            }}
          >
            close
          </Button>
          <Button
            variant="contained"
            onClick={sendUnlockEmail}
            disabled={sendingUnlock}
            startIcon={<ForwardToInboxIcon sx={{ fontSize: 16 }} />}
            size="small"
            sx={{
              flex: 2,
              textTransform: "none",
              borderRadius: "50px",
              fontWeight: 600,
              py: 1,
              fontSize: "0.82rem",
              bgcolor: "#c62828",
              boxShadow: "0 4px 14px rgba(198,40,40,0.35)",
              "&:hover": {
                bgcolor: "#b71c1c",
                boxShadow: "0 6px 18px rgba(198,40,40,0.45)",
              },
            }}
          >
            {sendingUnlock ? "Sending..." : "Send unlock email"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
