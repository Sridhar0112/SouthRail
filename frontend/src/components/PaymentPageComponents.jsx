import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Fade,
  Grid,
  Skeleton,
  Stack,
  Typography,
  useTheme
} from "@mui/material"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong"
import { useNavigate } from "react-router-dom"

export const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000

export function loadRazorpayScript() {
  return new Promise(resolve => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function formatRupees(rupees) {
  const amount = Number(rupees)
  if (!Number.isFinite(amount)) return '0.00'
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function SectionCard({ icon, title, children }) {
  const theme = useTheme()
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        border: `1px solid ${theme.palette.custom?.cardBorder ?? theme.palette.divider}`,
        boxShadow: "none",
        mb: 2,
        overflow: "hidden"
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" alignItems="center" spacing={1.25} mb={1.75}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.09),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.palette.primary.main,
              flexShrink: 0
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.25 }}>
            {title}
          </Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

export function DetailRow({ label, value }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        py: 0.65
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700} textAlign="right" sx={{ minWidth: 0 }}>
        {value}
      </Typography>
    </Box>
  )
}

export function FareRow({ label, amount, bold, large }) {
  const theme = useTheme()
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
        py: bold ? 1.25 : 0.5,
        px: bold ? { xs: 1.25, sm: 1.5 } : 0,
        bgcolor: bold ? alpha(theme.palette.primary.main, 0.055) : "transparent",
        borderRadius: bold ? 2 : 0,
        border: bold ? `1px solid ${alpha(theme.palette.primary.main, 0.10)}` : 0
      }}
    >
      <Typography
        variant={large ? "body1" : "body2"}
        fontWeight={bold ? 800 : 400}
        color={bold ? "text.primary" : "text.secondary"}
      >
        {label}
      </Typography>
      <Typography
        variant={large ? "h5" : "body2"}
        fontWeight={bold ? 900 : 600}
        color={bold ? "primary.main" : "text.primary"}
        sx={{ whiteSpace: "nowrap" }}
      >
        ₹{formatRupees(amount)}
      </Typography>
    </Box>
  )
}

export function SuccessAnimation({ ticketId }) {
  const navigate = useNavigate()
  return (
    <Fade in timeout={450}>
      <Box textAlign="center" py={{ xs: 2.5, sm: 3.5 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
            color: "success.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            border: (theme) => `1px solid ${alpha(theme.palette.success.main, 0.22)}`
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 40 }} />
        </Box>
        <Typography variant="h5" fontWeight={900} mb={0.75}>
          Booking confirmed
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3} sx={{ maxWidth: 420, mx: "auto" }}>
          Your payment was successful and your ticket is ready. You can open the ticket now or manage the journey from your dashboard.
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.25}
          justifyContent="center"
          sx={{ "& .MuiButton-root": { minWidth: { sm: 150 } } }}
        >
          <Button
            variant="contained"
            startIcon={<ReceiptLongIcon />}
            onClick={() => navigate(ticketId ? `/pnr?pnr=${encodeURIComponent(ticketId)}` : "/dashboard")}
          >
            View ticket
          </Button>
          <Button variant="outlined" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </Stack>
      </Box>
    </Fade>
  )
}

export function PaymentSkeleton() {
  return (
    <Grid container spacing={{ xs: 2, md: 3 }}>
      <Grid item xs={12} md={7}>
        {[1, 2, 3].map(i => (
          <Box key={i} mb={2}>
            <Skeleton variant="rounded" height={i === 1 ? 180 : 140} sx={{ borderRadius: 2.5 }} />
          </Box>
        ))}
      </Grid>
      <Grid item xs={12} md={5}>
        <Skeleton variant="rounded" height={420} sx={{ borderRadius: 2.5 }} />
      </Grid>
    </Grid>
  )
}
