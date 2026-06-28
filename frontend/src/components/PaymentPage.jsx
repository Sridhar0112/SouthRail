import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
  RadioGroup,
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
import CreditCardIcon from "@mui/icons-material/CreditCard"
import AccountBalanceIcon from "@mui/icons-material/AccountBalance"
import WalletIcon from "@mui/icons-material/Wallet"
import RefreshIcon from "@mui/icons-material/Refresh"
import ScheduleIcon from "@mui/icons-material/Schedule"
import api from "../services/api.js"
import {
  PAYMENT_TIMEOUT_MS,
  UPI_OPTIONS,
  loadRazorpayScript,
  SectionCard,
  DetailRow,
  FareRow,
  PaymentMethodOption,
  SuccessAnimation,
  PaymentSkeleton,
  formatRupees
} from "./PaymentPageComponents.jsx"

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { bookingId } = useParams()

  const [booking, setBooking] = useState(null)
  const [loadingBooking, setLoadingBooking] = useState(true)
  const [bookingError, setBookingError] = useState(null)

  const [paymentMethod, setPaymentMethod] = useState("upi")
  const [paymentState, setPaymentState] = useState("idle")
  const [errorMessage, setErrorMessage] = useState(null)
  const [ticketId, setTicketId] = useState()

  const razorpayRef = useRef(null)
  const timeoutRef = useRef(null)

  // ── Fetch booking ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!bookingId) {
      navigate("/")
      return
    }

    setLoadingBooking(true)
    api.get(`/api/bookings/${bookingId}`)
      .then(({ data }) => setBooking(data))
      .catch(() => setBookingError(
        "Unable to load booking details. Please go back and try again."
      ))
      .finally(() => setLoadingBooking(false))
  }, [bookingId, navigate])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      razorpayRef.current?.close()
    }
  }, [])

  // ── Payment flow ───────────────────────────────────────────────────────────

  const handlePay = useCallback(async () => {
    if (!booking) return
    setErrorMessage(null)
    setPaymentState("creating_order")

    // 1. Load Razorpay SDK
    const loaded = await loadRazorpayScript()
    if (!loaded) {
      setErrorMessage(
        "Payment gateway failed to load. Please refresh and try again."
      )
      setPaymentState("failed")
      return
    }

    let orderData
    try {
      // 2. Create order on backend
      // Amount in paise (backend expects paise)
      const { data: createdOrder } = await api.post("/api/payment/create-order", {
        bookingId: booking.bookingId,
        amount: booking.fare.totalAmount * 100
      })
      orderData = createdOrder
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ??
          (err instanceof Error ? err.message : "Could not initiate payment. Try again.")
      )
      setPaymentState("failed")
      return
    }

    // 3. Start payment timeout watchdog
    timeoutRef.current = setTimeout(() => {
      razorpayRef.current?.close()
      setPaymentState("timeout")
      setErrorMessage("Payment session expired. Please try again.")
    }, PAYMENT_TIMEOUT_MS)

    // 4. Open Razorpay checkout
    setPaymentState("awaiting_payment")

    const options = {
      key: orderData.razorpayKey,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "South Rail",
      description: `${booking.trainName} · ${booking.sourceCode} → ${booking.destinationCode}`,
      order_id: orderData.orderId,
      prefill: {
        name: booking.passengers[0]?.name
      },
      theme: { color: "#064E3B" },
      modal: {
        ondismiss: () => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          setPaymentState("idle")
        },
        escape: false
      },
      retry: { enabled: false, max_count: 0 },
      handler: async response => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        setPaymentState("verifying")

        try {
          // 5. Verify signature on backend
          const { data: result } = await api.post("/api/payment/verify", {
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            bookingId: booking.bookingId
          })

          if (result.success) {
            setTicketId(result.ticketId)
            setPaymentState("success")
          } else {
            throw new Error(
              "Payment verification failed. Contact support with your payment ID."
            )
          }
        } catch (err) {
          setErrorMessage(
            err.response?.data?.message ??
              (err instanceof Error ? err.message : "Verification failed. Contact support.")
          )
          setPaymentState("failed")
        }
      }
    }

    const rzp = new window.Razorpay(options)
    razorpayRef.current = rzp
    rzp.on("payment.failed", () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setErrorMessage(
        "Payment was declined. Please try a different payment method."
      )
      setPaymentState("failed")
    })
    rzp.open()
  }, [booking])

  const handleRetry = useCallback(() => {
    setPaymentState("idle")
    setErrorMessage(null)
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  const isProcessing = [
    "creating_order",
    "awaiting_payment",
    "verifying"
  ].includes(paymentState)
  const primaryColor = theme.palette.primary.main

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: theme.palette.custom.pageBg
      }}
    >
      {/* ── Header ── */}
      <Box
        component="header"
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          backdropFilter: "blur(16px)",
          bgcolor: theme.palette.custom.appBar,
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            py={1.25}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <TrainIcon sx={{ color: primaryColor, fontSize: 22 }} />
              <Typography variant="h6" fontWeight={800} color="primary.main">
                SouthRail
              </Typography>
            </Stack>

            <Typography
              variant="h6"
              fontWeight={800}
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              Complete your booking
            </Typography>

            <Tooltip title="Secured by Razorpay & 256-bit SSL">
              <Chip
                icon={<LockIcon sx={{ fontSize: "14px !important" }} />}
                label="Secure payment"
                size="small"
                sx={{
                  bgcolor: alpha(primaryColor, 0.09),
                  color: primaryColor,
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 24
                }}
              />
            </Tooltip>
          </Stack>
        </Container>
      </Box>

      {/* ── Mobile page title ── */}
      <Container maxWidth="lg">
        <Box display={{ xs: "block", sm: "none" }} pt={2} pb={0.5}>
          <Typography variant="h6" fontWeight={800}>
            Complete your booking
          </Typography>
        </Box>
      </Container>

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
                    <Typography variant="caption" color="text.secondary">
                      {booking.departureTime}
                    </Typography>
                  </Box>

                  <Box flex={1} textAlign="center" px={1}>
                    <TrainIcon sx={{ color: primaryColor, fontSize: 20 }} />
                    <Divider
                      sx={{
                        borderStyle: "dashed",
                        borderColor: primaryColor,
                        opacity: 0.4,
                        mt: "-10px"
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
                    <Typography variant="caption" color="text.secondary">
                      {booking.arrivalTime}
                    </Typography>
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
                {booking.passengers.map((p, idx) => (
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
                      <Chip
                        label={p.seatPreference}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    <DetailRow label="Coach type" value={p.coachType} />
                  </Box>
                ))}
              </SectionCard>

              {/* Fare breakdown */}
              <SectionCard
                icon={<ReceiptLongIcon fontSize="small" />}
                title="Fare breakdown"
              >
                <Stack spacing={0.25}>
                  <FareRow label="Base fare" amount={booking.fare.baseFare} />
                  <FareRow
                    label="Reservation charge"
                    amount={booking.fare.reservationCharge}
                  />
                  <FareRow
                    label="Convenience fee"
                    amount={booking.fare.convenienceFee}
                  />
                  <FareRow label="GST" amount={booking.fare.gst} />
                  <Box mt={1}>
                    <Divider sx={{ mb: 1 }} />
                    <FareRow
                      label="Total payable amount"
                      amount={booking.fare.totalAmount}
                      bold
                      large
                    />
                  </Box>
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
                  top: { md: 80 },
                  overflow: "visible"
                }}
              >
                <CardContent sx={{ p: "20px !important" }}>
                  <Typography variant="h6" fontWeight={800} mb={2}>
                    Choose payment method
                  </Typography>

                  {/* UPI */}
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    display="block"
                    mb={0.75}
                    sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                  >
                    UPI
                  </Typography>
                  <RadioGroup
                    value={paymentMethod}
                    onChange={(_, v) => setPaymentMethod(v)}
                  >
                    <Stack spacing={0.75} mb={1.5}>
                      {UPI_OPTIONS.map(opt => (
                        <PaymentMethodOption
                          key={opt.id}
                          value="upi"
                          selected={paymentMethod === "upi"}
                          icon={
                            <span style={{ fontSize: 16 }}>{opt.icon}</span>
                          }
                          label={opt.label}
                          onChange={() => setPaymentMethod("upi")}
                        />
                      ))}
                    </Stack>

                    {/* Cards */}
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                      display="block"
                      mb={0.75}
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Cards
                    </Typography>
                    <Stack spacing={0.75} mb={1.5}>
                      <PaymentMethodOption
                        value="card"
                        selected={paymentMethod === "card"}
                        icon={<CreditCardIcon sx={{ fontSize: 18 }} />}
                        label="Debit / Credit card"
                        sublabel="Visa, Mastercard, RuPay"
                        onChange={setPaymentMethod}
                      />
                    </Stack>

                    {/* Net banking */}
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.secondary"
                      display="block"
                      mb={0.75}
                      sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
                    >
                      Net banking & wallet
                    </Typography>
                    <Stack spacing={0.75} mb={2}>
                      <PaymentMethodOption
                        value="netbanking"
                        selected={paymentMethod === "netbanking"}
                        icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />}
                        label="Net banking"
                        sublabel="All major banks supported"
                        onChange={setPaymentMethod}
                      />
                      <PaymentMethodOption
                        value="wallet"
                        selected={paymentMethod === "wallet"}
                        icon={<WalletIcon sx={{ fontSize: 18 }} />}
                        label="Wallet"
                        sublabel="Mobikwik, Freecharge & more"
                        onChange={setPaymentMethod}
                      />
                    </Stack>
                  </RadioGroup>

                  <Divider sx={{ mb: 2 }} />

                  {/* Error / timeout message */}
                  <Collapse in={!!errorMessage || paymentState === "timeout"}>
                    <Alert
                      severity="error"
                      icon={<ErrorOutlineIcon />}
                      sx={{ mb: 2, fontSize: "0.78rem" }}
                    >
                      {errorMessage ?? "Payment session expired."}
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
                  {paymentState !== "failed" && paymentState !== "timeout" ? (
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
                              : "Awaiting payment…"}
                          </span>
                        </Stack>
                      ) : (
                        <>
                          <LockIcon
                            sx={{ fontSize: 18, mr: 1, opacity: 0.85 }}
                          />
                          Pay ₹{formatRupees(booking.fare.totalAmount)}
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
                    in={paymentState === "timeout" || paymentState === "failed"}
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
                        Your booking is held for 10 minutes.
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
                      </Box>{" "}
                      · 256-bit SSL
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
