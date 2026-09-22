import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Grid,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme
} from "@mui/material"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import LockIcon from "@mui/icons-material/Lock"
import TrainIcon from "@mui/icons-material/Train"
import PersonIcon from "@mui/icons-material/Person"
import PaymentIcon from "@mui/icons-material/Payment"
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid"
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong"
import RefreshIcon from "@mui/icons-material/Refresh"
import ScheduleIcon from "@mui/icons-material/Schedule"
import api from "../services/api.js"
import { getApiErrorMessage } from "../utils/apiErrors.js"
import {
  PAYMENT_TIMEOUT_MS,
  loadRazorpayScript,
  SectionCard,
  FareRow,
  SuccessAnimation,
  PaymentSkeleton,
  formatRupees
} from "./PaymentPageComponents.jsx"

const PAYMENT_STATUS_POLL_INTERVAL_MS = 1500
const PAYMENT_STATUS_POLL_TIMEOUT_MS = 30000

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const { holdId } = useParams()

  const [booking, setBooking] = useState(null)
  const [loadingBooking, setLoadingBooking] = useState(true)
  const [bookingError, setBookingError] = useState(null)

  const [paymentState, setPaymentState] = useState("idle")
  const [errorMessage, setErrorMessage] = useState(null)
  const [ticketId, setTicketId] = useState()
  const [recoverablePaymentId, setRecoverablePaymentId] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(null)

  const razorpayRef = useRef(null)
  const timeoutRef = useRef(null)
  const pollTimerRef = useRef(null)
  const pollingRef = useRef(false)
  const paymentActionRef = useRef(false)
  const expiryRefreshRef = useRef(false)
  const currentHoldRef = useRef(holdId)
  currentHoldRef.current = holdId

  // ── Fetch booking ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!holdId) {
      navigate("/")
      return undefined
    }

    let active = true
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    pollingRef.current = false
    paymentActionRef.current = false
    expiryRefreshRef.current = false
    razorpayRef.current?.close()
    setBooking(null)
    setBookingError(null)
    setPaymentState("idle")
    setErrorMessage(null)
    setTicketId(undefined)
    setRecoverablePaymentId(null)
    setSecondsRemaining(null)
    setLoadingBooking(true)
    api.get(`/reservation-holds/${holdId}`)
      .then(({ data }) => {
        if (!active) return
        setBooking(data)
        if (data.status === "CONFIRMED" && data.pnr) {
          setTicketId(data.pnr)
          setPaymentState("success")
        } else if (data.status === "CONFIRMED") {
          setPaymentState("status_check_available")
          setErrorMessage("Payment was received, but the ticket is still being finalized. Check the status again shortly.")
        } else if (data.status === "EXPIRED") {
          setPaymentState("expired")
          setErrorMessage("Your reservation hold has expired. The seats have been released. Please search again to continue booking.")
        } else if (data.status === "CANCELLED") {
          setPaymentState("unavailable")
          setErrorMessage("This reservation hold was cancelled and can no longer be paid. Please search again to continue booking.")
        }
      })
      .catch((error) => {
        if (active) setBookingError(getApiErrorMessage(
          error,
          "Unable to load booking details. Please go back and try again."
        ))
      })
      .finally(() => { if (active) setLoadingBooking(false) })
    return () => { active = false }
  }, [holdId, navigate])

  const refreshConfirmedHold = useCallback(async () => {
    const expectedHoldId = holdId
    const { data } = await api.get(`/reservation-holds/${expectedHoldId}`)
    if (currentHoldRef.current !== expectedHoldId) return false
    setBooking(data)
    if (data.status === "CONFIRMED" && data.pnr) {
      setTicketId(data.pnr)
      return true
    }
    if (data.status === "EXPIRED") {
      razorpayRef.current?.close()
      paymentActionRef.current = false
      setPaymentState("expired")
      setErrorMessage("Your reservation hold has expired. The seats have been released. Please search again to continue booking.")
    } else if (data.status === "CANCELLED") {
      razorpayRef.current?.close()
      paymentActionRef.current = false
      setPaymentState("unavailable")
      setErrorMessage("This reservation hold was cancelled and can no longer be paid. Please search again to continue booking.")
    }
    return false
  }, [holdId])

  useEffect(() => {
    if (!booking?.expiresAt || booking.status !== "ACTIVE") return undefined
    const update = () => {
      const remaining = Math.max(0, Math.ceil((new Date(booking.expiresAt).getTime() - Date.now()) / 1000))
      setSecondsRemaining(remaining)
      if (remaining === 0 && !expiryRefreshRef.current) {
        expiryRefreshRef.current = true
        refreshConfirmedHold().finally(() => { expiryRefreshRef.current = false })
      }
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [booking?.expiresAt, booking?.status, refreshConfirmedHold])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
      pollingRef.current = false
      razorpayRef.current?.close()
    }
  }, [])

  // ── Payment flow ───────────────────────────────────────────────────────────

  const pollPaymentStatus = useCallback((paymentId) => {
    if (pollingRef.current) return
    const expectedHoldId = holdId
    if (currentHoldRef.current !== expectedHoldId) return
    pollingRef.current = true
    setRecoverablePaymentId(paymentId)
    setPaymentState("verification_pending")
    setErrorMessage(null)
    const deadline = Date.now() + PAYMENT_STATUS_POLL_TIMEOUT_MS

    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/${paymentId}`)
        if (!pollingRef.current || currentHoldRef.current !== expectedHoldId) return
        if (data.status === "CAPTURED") {
          const confirmed = await refreshConfirmedHold()
          if (confirmed) {
            pollingRef.current = false
            paymentActionRef.current = false
            setPaymentState("success")
            return
          }
        }
        if (data.status === "FAILED") {
          pollingRef.current = false
          paymentActionRef.current = false
          sessionStorage.removeItem(`payment-key:${booking.holdId}`)
          setErrorMessage("Payment failed. Please retry with a new payment attempt.")
          setPaymentState("failed")
          return
        }
      } catch {
        // A transient status read failure is retried until the bounded deadline.
      }

      if (!pollingRef.current || currentHoldRef.current !== expectedHoldId) return
      if (Date.now() >= deadline) {
        pollingRef.current = false
        paymentActionRef.current = false
        setErrorMessage("Payment is still processing. Please check again shortly.")
        setPaymentState("status_check_available")
        return
      }
      pollTimerRef.current = setTimeout(poll, PAYMENT_STATUS_POLL_INTERVAL_MS)
    }

    poll()
  }, [booking, holdId, refreshConfirmedHold])

  const handlePay = useCallback(async () => {
    if (!booking || paymentActionRef.current) return
    const expectedHoldId = holdId
    paymentActionRef.current = true
    setErrorMessage(null)
    setPaymentState("creating_order")

    // 1. Load Razorpay SDK
    const loaded = await loadRazorpayScript()
    if (currentHoldRef.current !== expectedHoldId) return
    if (!loaded) {
      setErrorMessage(
        "Payment gateway failed to load. Please refresh and try again."
      )
      setPaymentState("failed")
      paymentActionRef.current = false
      return
    }

    let orderData
    try {
      // 2. Create order on backend
      // The server derives the authoritative amount from the booking.
      const idempotencyKey = sessionStorage.getItem(`payment-key:${booking.holdId}`)
        || window.crypto.randomUUID()
      sessionStorage.setItem(`payment-key:${booking.holdId}`, idempotencyKey)
      const { data: createdOrder } = await api.post(
        `/payments/reservation-holds/${booking.holdId}/orders`, {},
        { headers: { "Idempotency-Key": idempotencyKey } }
      )
      if (currentHoldRef.current !== expectedHoldId) return
      orderData = createdOrder
    } catch (err) {
      if (currentHoldRef.current !== expectedHoldId) return
      if (err.response?.data?.errorCode === "PAYMENT_ATTEMPT_ACTIVE") {
        try {
          const { data: activePayment } = await api.get(
            `/payments/reservation-holds/${booking.holdId}/active`
          )
          if (currentHoldRef.current !== expectedHoldId) return
          setRecoverablePaymentId(activePayment.paymentId)
          if (activePayment.status === "CAPTURED") {
            const confirmed = await refreshConfirmedHold()
            if (confirmed) { paymentActionRef.current = false; setPaymentState("success") }
            else pollPaymentStatus(activePayment.paymentId)
            return
          }
          if (activePayment.status === "AUTHORIZED"
              || activePayment.status === "CREATED") {
            pollPaymentStatus(activePayment.paymentId)
            return
          }
          if (activePayment.status === "PENDING" && activePayment.razorpayOrderId) {
            orderData = activePayment
          } else {
            pollPaymentStatus(activePayment.paymentId)
            return
          }
        } catch (recoveryError) {
          if (currentHoldRef.current !== expectedHoldId) return
          setErrorMessage(
            getApiErrorMessage(recoveryError, "The active payment attempt could not be recovered. Please try again shortly.")
          )
          setPaymentState("failed")
          paymentActionRef.current = false
          return
        }
      } else {
        if (err.response?.data?.errorCode === "PAYMENT_ORDER_FAILED") {
          sessionStorage.removeItem(`payment-key:${booking.holdId}`)
        }
        setErrorMessage(
          getApiErrorMessage(err, "Could not initiate payment. Please try again.")
        )
        setPaymentState("failed")
        paymentActionRef.current = false
        return
      }
    }

    if (currentHoldRef.current !== expectedHoldId) return

    // 3. Start payment timeout watchdog
    timeoutRef.current = setTimeout(() => {
      if (currentHoldRef.current !== expectedHoldId) return
      razorpayRef.current?.close()
      paymentActionRef.current = false
      setPaymentState("timeout")
      setErrorMessage("Payment session expired. Please try again.")
    }, PAYMENT_TIMEOUT_MS)

    // 4. Open Razorpay checkout
    setPaymentState("awaiting_payment")

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "South Rail",
      description: `${booking.trainName} · ${booking.sourceCode} → ${booking.destinationCode}`,
      order_id: orderData.razorpayOrderId,
      prefill: {
        name: booking.passengers?.[0]?.name
      },
      theme: { color: "#064E3B" },
      modal: {
        ondismiss: () => {
          if (currentHoldRef.current !== expectedHoldId) return
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          setPaymentState("idle")
          paymentActionRef.current = false
        },
        escape: false
      },
      retry: { enabled: false, max_count: 0 },
      handler: async response => {
        if (currentHoldRef.current !== expectedHoldId) return
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setPaymentState("verifying")

        try {
          // 5. Verify signature on backend
          const { data: result } = await api.post(`/payments/${orderData.paymentId}/verify`, {
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature
          })
          if (currentHoldRef.current !== expectedHoldId) return

          if (result.status === "CAPTURED") {
            const confirmed = await refreshConfirmedHold()
            if (confirmed) { paymentActionRef.current = false; setPaymentState("success") }
            else pollPaymentStatus(orderData.paymentId)
          } else if (result.status === "AUTHORIZED" || result.status === "PENDING") {
            pollPaymentStatus(orderData.paymentId)
          } else if (result.status === "FAILED") {
            sessionStorage.removeItem(`payment-key:${booking.holdId}`)
            setErrorMessage("Payment failed. Please retry with a new payment attempt.")
            setPaymentState("failed")
            paymentActionRef.current = false
          } else {
            throw new Error(
              "Payment verification failed. Contact support with your payment ID."
            )
          }
        } catch (err) {
          if (currentHoldRef.current !== expectedHoldId) return
          setErrorMessage(
            getApiErrorMessage(err, "Verification could not be completed. Check the payment status before retrying.")
          )
          setPaymentState("failed")
          paymentActionRef.current = false
        }
      }
    }

    const rzp = new window.Razorpay(options)
    razorpayRef.current = rzp
    rzp.on("payment.failed", () => {
      if (currentHoldRef.current !== expectedHoldId) return
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      sessionStorage.removeItem(`payment-key:${booking.holdId}`)
      setErrorMessage(
        "Payment was declined. Please try a different payment method."
      )
      setPaymentState("failed")
      paymentActionRef.current = false
    })
    rzp.open()
  }, [booking, holdId, pollPaymentStatus, refreshConfirmedHold])

  const handleRetry = useCallback(() => {
    paymentActionRef.current = false
    setPaymentState("idle")
    setErrorMessage(null)
  }, [])

  const handleCheckStatus = useCallback(async () => {
    if (!recoverablePaymentId || pollingRef.current) return
    const expectedHoldId = holdId
    setErrorMessage(null)
    try {
      const { data } = await api.get(`/payments/${recoverablePaymentId}`)
      if (currentHoldRef.current !== expectedHoldId) return
      if (data.status === "CAPTURED") {
        const confirmed = await refreshConfirmedHold()
        if (confirmed) { paymentActionRef.current = false; setPaymentState("success") }
        else pollPaymentStatus(recoverablePaymentId)
      } else if (data.status === "FAILED") {
        sessionStorage.removeItem(`payment-key:${booking.holdId}`)
        setErrorMessage("Payment failed. Please retry with a new payment attempt.")
        setPaymentState("failed")
      } else if (data.status === "PENDING" && data.providerOrderId) {
        // handlePay recovers the existing active order; the backend constraint
        // prevents this status check from creating another payable attempt.
        await handlePay()
      } else {
        pollPaymentStatus(recoverablePaymentId)
      }
    } catch (err) {
      if (currentHoldRef.current !== expectedHoldId) return
      setErrorMessage(
        getApiErrorMessage(err, "Payment status could not be checked. Please try again.")
      )
      setPaymentState("status_check_available")
    }
  }, [booking, handlePay, holdId, pollPaymentStatus, recoverablePaymentId, refreshConfirmedHold])

  // ─── Render ────────────────────────────────────────────────────────────────

  const isProcessing = [
    "creating_order",
    "awaiting_payment",
    "verifying",
    "verification_pending"
  ].includes(paymentState)
  const primaryColor = theme.palette.primary.main
  const departureTime = booking?.departureTime || location.state?.departureTime
  const arrivalTime = booking?.arrivalTime || location.state?.arrivalTime

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: theme.palette.custom.pageBg
      }}
    >
      {/* ── Page introduction ── */}
      <Box
        component="section"
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.paper, 0.72)
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            spacing={1}
            py={1.25}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" component="h1" fontWeight={900}>Complete your booking</Typography>
              <Typography variant="body2" color="text.secondary">Review your journey and finish secure payment before the hold expires.</Typography>
            </Box>

            <Tooltip title="Secure checkout with Razorpay">
              <Chip
                icon={<LockIcon sx={{ fontSize: "14px !important" }} />}
                label="Secure payment"
                size="small"
                sx={{
                  bgcolor: alpha(primaryColor, 0.09),
                  color: primaryColor,
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 24,
                  flexShrink: 0
                }}
              />
            </Tooltip>
          </Stack>
        </Container>
      </Box>

      {/* ── Main content ── */}
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        {loadingBooking ? (
          <PaymentSkeleton />
        ) : bookingError ? (
          <Alert severity="error" icon={<ErrorOutlineIcon />}>
            {bookingError}
          </Alert>
        ) : !booking ? null : paymentState === "success" ? (
          <Box maxWidth={560} mx="auto">
            <SectionCard
              icon={<PaymentIcon fontSize="small" />}
              title="Payment confirmed"
            >
              <SuccessAnimation ticketId={ticketId} />
            </SectionCard>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="flex-start">
            {/* ── LEFT: Booking summary ── */}
            <Grid item xs={12} md={7}>
              {/* Journey summary */}
              <SectionCard
                icon={<TrainIcon fontSize="small" />}
                title="Journey summary"
              >
                <Alert severity={["expired", "unavailable"].includes(paymentState) ? "error" : "info"} sx={{ mb: 1.5 }}>
                  {["expired", "unavailable"].includes(paymentState) ? errorMessage : `Seats reserved for ${formatCountdown(secondsRemaining)}`}
                </Alert>
                {/* Route strip */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.5,
                    borderRadius: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(primaryColor, 0.04),
                    mb: 1.5
                  }}
                >
                  <Box textAlign="left">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      FROM
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {booking.sourceCode}
                    </Typography>
                    <Typography fontWeight={800}>{formatJourneyTime(departureTime)}</Typography>
                    <Typography variant="caption" color="text.secondary">Departure</Typography>
                  </Box>

                  <Box flex={1} textAlign="center" px={1}>
                    <TrainIcon sx={{ color: primaryColor, fontSize: 20, mb: 0.5 }} />
                    <Divider
                      sx={{
                        borderStyle: "dashed",
                        borderColor: primaryColor,
                        opacity: 0.4
                      }}
                    />
                  </Box>

                  <Box textAlign="right">
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      TO
                    </Typography>
                    <Typography variant="h6" fontWeight={800}>
                      {booking.destinationCode}
                    </Typography>
                    <Typography fontWeight={800}>{formatJourneyTime(arrivalTime)}</Typography>
                    <Typography variant="caption" color="text.secondary">Arrival</Typography>
                  </Box>
                </Box>

                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Train
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {booking.trainName} ({booking.trainNumber})
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Journey date
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {booking.journeyDate}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Travel class
                    </Typography>
                    <Chip
                      label={booking.travelClass}
                      size="small"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Quota
                    </Typography>
                    <Chip
                      label={booking.quota}
                      size="small"
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </SectionCard>

              {/* Passenger details */}
              <SectionCard
                icon={<PersonIcon fontSize="small" />}
                title="Passenger details"
              >
                {(booking.passengers || []).map((p, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: `1px solid ${theme.palette.divider}`,
                      mb: idx < booking.passengers.length - 1 ? 1 : 0
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Typography variant="body1" fontWeight={800}>
                        {p.name}
                      </Typography>
                      <Chip label={`Passenger ${idx + 1}`} size="small" />
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        label={`Age ${p.age}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip label={p.gender} size="small" variant="outlined" />
                      {p.berthPreference && (
                        <Chip
                          label={p.berthPreference}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
                ))}
              </SectionCard>

              {/* Fare breakdown */}
              <SectionCard
                icon={<ReceiptLongIcon fontSize="small" />}
                title="Fare summary"
              >
                <Stack spacing={0.25}>
                  <FareRow
                    label="Total payable amount"
                    amount={booking.totalFare}
                    bold
                    large
                  />
                </Stack>
              </SectionCard>
            </Grid>

            {/* ── RIGHT: Payment card ── */}
            <Grid item xs={12} md={5}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.custom.cardBorder}`,
                  boxShadow: theme.palette.custom.glassShadow,
                  position: { md: "sticky" },
                  top: { md: 80 }
                }}
              >
                <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                  <Typography variant="h6" fontWeight={800} mb={1}>
                    Secure checkout
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Continue to Razorpay to choose from the payment methods currently available for this order. SouthRail never stores your card, bank, or UPI credentials.
                  </Alert>

                  <Divider sx={{ mb: 2 }} />

                  {/* Error / timeout message */}
                  <Collapse in={(!!errorMessage
                    && paymentState !== "verification_pending"
                    && paymentState !== "status_check_available")
                    || paymentState === "timeout"}>
                    <Alert
                      severity="error"
                      icon={<ErrorOutlineIcon />}
                      sx={{ mb: 2, fontSize: "0.78rem" }}
                    >
                      {errorMessage ?? "Payment session expired."}
                    </Alert>
                  </Collapse>

                  <Collapse in={paymentState === "verification_pending"
                    || paymentState === "status_check_available"}>
                    <Alert severity="info" sx={{ mb: 2, fontSize: "0.78rem" }}>
                      {errorMessage || "Payment authorized. Waiting for capture…"}
                    </Alert>
                  </Collapse>

                  {/* Verifying state */}
                  <Collapse in={paymentState === "verifying"}>
                    <Alert severity="info" sx={{ mb: 2, fontSize: "0.78rem" }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CircularProgress size={14} color="inherit" />
                        <span>Verifying your payment…</span>
                      </Stack>
                    </Alert>
                  </Collapse>

                  {/* Pay button */}
                  {["expired", "unavailable"].includes(paymentState) ? (
                    <Button fullWidth variant="contained" size="large" onClick={() => navigate("/")}>
                      Search trains again
                    </Button>
                  ) : paymentState === "status_check_available" && recoverablePaymentId ? (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleCheckStatus}
                      sx={{ py: 1.5, fontWeight: 800, borderRadius: 2, minHeight: 52 }}
                    >
                      Check payment status
                    </Button>
                  ) : paymentState === "status_check_available" ? (
                    <Button fullWidth variant="contained" size="large" onClick={() => navigate("/dashboard")}>
                      View my bookings
                    </Button>
                  ) : paymentState !== "failed" && paymentState !== "timeout" ? (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isProcessing}
                      onClick={handlePay}
                      sx={{
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: 800,
                        borderRadius: 2,
                        minHeight: 52,
                        position: "relative"
                      }}
                    >
                      {isProcessing ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={18} color="inherit" />
                          <span>
                            {paymentState === "creating_order"
                              ? "Creating order…"
                              : paymentState === "verifying"
                              ? "Verifying…"
                              : paymentState === "verification_pending"
                              ? "Processing payment…"
                              : "Awaiting payment…"}
                          </span>
                        </Stack>
                      ) : (
                        <>
                          <LockIcon
                            sx={{ fontSize: 18, mr: 1, opacity: 0.85 }}
                          />
                          Pay ₹{formatRupees(booking.totalFare)}
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={handleRetry}
                      startIcon={<RefreshIcon />}
                      sx={{
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: 800,
                        borderRadius: 2,
                        minHeight: 52
                      }}
                    >
                      Retry payment
                    </Button>
                  )}

                  {/* Timeout extra action */}
                  <Collapse
                    in={paymentState === "timeout" || paymentState === "failed" || paymentState === "expired" || paymentState === "unavailable"}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      mt={1.5}
                    >
                      <ScheduleIcon
                        sx={{ fontSize: 14, color: "text.secondary" }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        This timer is a guide. SouthRail will confirm whether your reservation is still available before payment continues.
                      </Typography>
                    </Stack>
                  </Collapse>

                  {/* Security badge */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="center"
                    spacing={0.75}
                    mt={2}
                  >
                    <LockIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">
                      Payments secured by{" "}
                      <Box
                        component="span"
                        fontWeight={700}
                        color={primaryColor}
                      >
                        Razorpay
                      </Box>
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>

              {/* Phone icon note for mobile */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                mt={1.5}
                px={0.5}
                display={{ xs: "flex", md: "none" }}
              >
                <PhoneAndroidIcon
                  sx={{ fontSize: 15, color: "text.secondary" }}
                />
                <Typography variant="caption" color="text.secondary">
                  UPI apps will open automatically on this device.
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  )
}

function formatCountdown(seconds) {
  if (seconds == null) return "--:--"
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0")
  const remainder = (seconds % 60).toString().padStart(2, "0")
  return `${minutes}:${remainder}`
}

function formatJourneyTime(value) {
  if (!value) return "—"
  const [hours, minutes] = String(value).split(":")
  if (hours == null || minutes == null) return String(value)
  const date = new Date(2000, 0, 1, Number(hours), Number(minutes))
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(date)
}