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
        borderRadius: 2,
        border: `1px solid ${theme.palette.custom?.cardBorder ??
          theme.palette.divider}`,
        boxShadow: theme.palette.custom?.cardShadow,
        mb: 2
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.palette.primary.main,
              flexShrink: 0
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" fontWeight={800}>
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
        alignItems: "center",
        py: 0.5
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} textAlign="right">
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
        py: bold ? 1 : 0.5,
        px: bold ? 1.5 : 0,
        bgcolor: bold ? alpha(theme.palette.primary.main, 0.06) : "transparent",
        borderRadius: bold ? 1.5 : 0
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
        fontWeight={bold ? 800 : 600}
        color={bold ? "primary.main" : "text.primary"}
      >
        ₹{formatRupees(amount)}
      </Typography>
    </Box>
  )
}

export function SuccessAnimation({ ticketId }) {
  const navigate = useNavigate()
  return (
    <Fade in timeout={600}>
      <Box textAlign="center" py={4}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: "success.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            animation: "pulse 1.5s ease-in-out infinite",
            "@keyframes pulse": {
              "0%, 100%": { transform: "scale(1)", opacity: 1 },
              "50%": { transform: "scale(1.06)", opacity: 0.92 }
            }
          }}
        >
          <CheckCircleOutlineIcon sx={{ fontSize: 44, color: "white" }} />
        </Box>
        <Typography variant="h5" fontWeight={800} color="success.main" mb={0.5}>
          Payment successful
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Your ticket has been booked. Check your email for the confirmation.
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="center"
        >
          <Button
            variant="contained"
            startIcon={<ReceiptLongIcon />}
            onClick={() =>
              navigate(ticketId ? `/pnr?pnr=${encodeURIComponent(ticketId)}` : "/dashboard")
            }
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
    <Grid container spacing={3}>
      <Grid item xs={12} md={7}>
        {[1, 2, 3].map(i => (
          <Box key={i} mb={2}>
            <Skeleton variant="rounded" height={160} />
          </Box>
        ))}
      </Grid>
      <Grid item xs={12} md={5}>
        <Skeleton variant="rounded" height={480} />
      </Grid>
    </Grid>
  )
}
