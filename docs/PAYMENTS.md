# Razorpay Test Mode payments and refunds

## Architecture and reservation boundary

SouthRail uses **Option A**: the existing booking transaction allocates a confirmed seat, RAC position, or waitlist position exactly as before; a separate payment attempt then records financial confirmation. No temporary hold, PNR, inventory, fare, queue, cancellation-policy, or promotion logic is replaced. A booking can have multiple attempts, while a database constraint permits only one captured attempt.

Provider access is isolated behind `PaymentGateway`. The current adapter uses Razorpay's synchronous HTTPS API without adding WebFlux or exposing the key secret. SouthRail owns fares and refund amounts; Razorpay only executes the resulting order/payment/refund.

## Configuration

Set `RAZORPAY_ENABLED=true`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Local development safely defaults the feature off, so an absent webhook secret cannot create an unsigned endpoint. Production startup rejects an enabled integration with missing credentials. Use Razorpay Test Mode keys only; no Live Mode/KYC validation is claimed.

Configure a public HTTPS webhook URL ending in `/api/payments/webhooks/razorpay` and subscribe only to `payment.authorized`, `payment.captured`, `payment.failed`, `refund.processed`, and `refund.failed`.

## Lifecycle and security

Payments transition `CREATED -> PENDING -> AUTHORIZED/CAPTURED/FAILED`, `AUTHORIZED -> CAPTURED/FAILED`, then `CAPTURED -> REFUND_PENDING -> PARTIALLY_REFUNDED/REFUNDED`. Refunds transition `REQUESTED -> PROCESSING -> PROCESSED/FAILED`; failed refunds are retryable. Invalid/reverse terminal transitions are rejected.

Order creation and status/verification APIs require JWT and enforce booking ownership (existing administrators retain their RBAC access). `Idempotency-Key` is required and persisted. Checkout signatures use constant-time HMAC-SHA256 validation, followed by a server-side provider fetch and amount/currency/order checks. Webhooks validate the signature over exact raw bytes. Provider event IDs (or a body hash fallback) are uniquely persisted, making redelivery harmless; row locks serialize callback/webhook races.

## Refunds and limitations

Cancellation first uses the unchanged `RefundCalculationService` and records the refund obligation in the local cancellation transaction. A scheduled worker dispatches requested/failed obligations with provider and local idempotency, while signed webhooks reconcile completion. Broader scheduled reconciliation of payments that receive neither a browser callback nor webhook remains operational follow-up work. A publicly reachable HTTPS webhook, Razorpay dashboard Test Mode configuration, and test credentials are required for end-to-end testing.

Run `mvn test` in `backend`, then `npm ci`, `npm run lint`, and `npm run build` in `frontend`. Tests never call Razorpay.
