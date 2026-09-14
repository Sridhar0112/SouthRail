package com.southrail.reservation.payment.service;

import com.southrail.reservation.config.properties.RazorpayProperties;
import com.southrail.reservation.entity.account.*; import com.southrail.reservation.entity.booking.Booking;
import com.southrail.reservation.entity.payment.*; import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.payment.dto.PaymentDtos.*; import com.southrail.reservation.payment.gateway.PaymentGateway;
import com.southrail.reservation.repository.account.UserRepository; import com.southrail.reservation.repository.booking.BookingRepository; import com.southrail.reservation.repository.payment.*; import com.southrail.reservation.service.audit.AuditLogService;
import java.math.*; import java.util.*; import org.springframework.http.HttpStatus; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {
 private final PaymentRepository payments; private final PaymentRefundRepository refunds; private final BookingRepository bookings; private final UserRepository users; private final PaymentGateway gateway; private final RazorpayProperties config; private final AuditLogService audit;
 public PaymentService(PaymentRepository p,PaymentRefundRepository r,BookingRepository b,UserRepository u,PaymentGateway g,RazorpayProperties c,AuditLogService a){payments=p;refunds=r;bookings=b;users=u;gateway=g;config=c;audit=a;}
 public static long toMinorUnits(BigDecimal amount){try{return amount.setScale(2,RoundingMode.UNNECESSARY).movePointRight(2).longValueExact();}catch(ArithmeticException e){throw new IllegalArgumentException("Amount must have at most two decimal places");}}

 @Transactional
 public CreatePaymentOrderResponse createOrder(String email,UUID bookingId,String requestKey){
  User user=user(email); Booking booking=bookings.findById(bookingId).orElseThrow(()->notFound()); own(user,booking);
  if(requestKey==null||requestKey.isBlank()||requestKey.length()>128)throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_IDEMPOTENCY_KEY","A valid Idempotency-Key is required");
  String key=user.getId()+":"+requestKey.trim(); Optional<Payment> old=payments.findByIdempotencyKey(key); if(old.isPresent())return order(old.get());
  if(payments.findFirstByBookingIdAndStatusOrderByCreatedAtDesc(bookingId,PaymentStatus.CAPTURED).isPresent())throw new ApiException(HttpStatus.CONFLICT,"PAYMENT_ALREADY_COMPLETED","Booking is already paid");
  Payment payment=payments.saveAndFlush(Payment.create(booking,key)); long amount=toMinorUnits(payment.getAmount());
  var created=gateway.createOrder(amount,"INR",payment.getId().toString(),Map.of("booking_id",bookingId.toString(),"pnr",booking.getPnr()));
  if(created.amount()!=amount||!"INR".equals(created.currency()))throw new ApiException(HttpStatus.BAD_GATEWAY,"PAYMENT_AMOUNT_MISMATCH","Provider order amount or currency did not match");
  payment.orderCreated(created.id()); audit.log(user.getId(),email,"PAYMENT_ORDER_CREATED","PAYMENT","Payment "+payment.getId()+" order "+created.id()+" for PNR "+booking.getPnr()+" amount "+payment.getAmount());
  return order(payment);
 }
 @Transactional
 public PaymentStatusResponse verify(String email,UUID id,VerificationRequest request){
  Payment p=payments.findByIdForUpdate(id).orElseThrow(()->notFound()); User user=user(email); own(user,p.getBooking());
  if(!Objects.equals(p.getProviderOrderId(),request.razorpayOrderId()))throw new ApiException(HttpStatus.BAD_REQUEST,"PAYMENT_ORDER_MISMATCH","Payment order does not match");
  if(p.getStatus()==PaymentStatus.CAPTURED){if(Objects.equals(p.getProviderPaymentId(),request.razorpayPaymentId()))return status(p);throw new ApiException(HttpStatus.CONFLICT,"PAYMENT_ALREADY_COMPLETED","Payment is already completed");}
  if(!RazorpaySignatures.verify(request.razorpayOrderId()+"|"+request.razorpayPaymentId(),request.razorpaySignature(),config.keySecret()))throw new ApiException(HttpStatus.BAD_REQUEST,"PAYMENT_SIGNATURE_INVALID","Payment signature is invalid");
  payments.findByProviderPaymentId(request.razorpayPaymentId()).filter(other->!other.getId().equals(id)).ifPresent(other->{throw new ApiException(HttpStatus.CONFLICT,"PAYMENT_ALREADY_COMPLETED","Provider payment is already associated with another payment");});
  var remote=gateway.fetchPayment(request.razorpayPaymentId()); validateRemote(p,remote);
  if("authorized".equals(remote.status())) p.authorized(remote.id()); else if("captured".equals(remote.status())) p.captured(remote.id()); else throw new ApiException(HttpStatus.CONFLICT,"PAYMENT_NOT_CAPTURED","Provider has not captured this payment");
  audit.log(user.getId(),email,p.getStatus()==PaymentStatus.CAPTURED?"PAYMENT_CAPTURED":"PAYMENT_VERIFIED","PAYMENT","Payment "+p.getId()+" verified for PNR "+p.getBooking().getPnr()); return status(p);
 }
 @Transactional(readOnly=true) public PaymentStatusResponse get(String email,UUID id){Payment p=payments.findById(id).orElseThrow(()->notFound());own(user(email),p.getBooking());return status(p);}
 @Transactional public PaymentRefund createRefundObligation(Booking booking,BigDecimal amount){
  if(amount==null||amount.signum()<=0)return null; Payment p=payments.findFirstByBookingIdAndStatusOrderByCreatedAtDesc(booking.getId(),PaymentStatus.CAPTURED).orElse(null); if(p==null)return null;
  String key="cancellation:"+booking.getId(); PaymentRefund existing=refunds.findByIdempotencyKey(key).orElse(null); if(existing!=null)return existing;
  PaymentRefund r=refunds.save(PaymentRefund.request(p,amount,key,"SouthRail cancellation refund")); p.transition(PaymentStatus.REFUND_PENDING); audit.log(booking.getUser().getId(),booking.getUser().getEmail(),"REFUND_REQUESTED","PAYMENT","Refund "+r.getId()+" for PNR "+booking.getPnr()+" amount "+amount); return r;
 }
 private void validateRemote(Payment p,PaymentGateway.GatewayPayment r){if(!Objects.equals(r.orderId(),p.getProviderOrderId())||r.amount()!=toMinorUnits(p.getAmount())||!p.getCurrency().equals(r.currency()))throw new ApiException(HttpStatus.BAD_REQUEST,"PAYMENT_AMOUNT_MISMATCH","Provider payment details did not match the order");}
 private CreatePaymentOrderResponse order(Payment p){if(p.getProviderOrderId()==null)throw new ApiException(HttpStatus.CONFLICT,"PAYMENT_ORDER_PENDING","Previous order creation has not completed; retry later");return new CreatePaymentOrderResponse(p.getId(),p.getProviderOrderId(),config.keyId(),toMinorUnits(p.getAmount()),p.getCurrency());}
 private PaymentStatusResponse status(Payment p){return new PaymentStatusResponse(p.getId(),p.getBooking().getId(),p.getAmount(),p.getCurrency(),p.getStatus(),p.getProviderOrderId(),p.getProviderPaymentId());}
 private User user(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"User not found"));}
 private void own(User user,Booking b){if(!b.getUser().getId().equals(user.getId())&&!user.getRoles().contains(RoleName.ROLE_ADMIN))throw new ApiException(HttpStatus.FORBIDDEN,"PAYMENT_ACCESS_DENIED","Payment does not belong to this user");}
 private ApiException notFound(){return new ApiException(HttpStatus.NOT_FOUND,"PAYMENT_NOT_FOUND","Payment was not found");}
}
