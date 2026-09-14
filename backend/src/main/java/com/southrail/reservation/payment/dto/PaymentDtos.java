package com.southrail.reservation.payment.dto;
import com.southrail.reservation.entity.payment.*; import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.util.UUID;
public final class PaymentDtos { private PaymentDtos(){}
 public record CreatePaymentOrderResponse(UUID paymentId,String razorpayOrderId,String keyId,long amount,String currency){}
 public record VerificationRequest(@NotBlank String razorpayOrderId,@NotBlank String razorpayPaymentId,@NotBlank String razorpaySignature){}
 public record PaymentStatusResponse(UUID paymentId,UUID bookingId,BigDecimal amount,String currency,PaymentStatus status,String providerOrderId,String providerPaymentId){}
}
