package com.southrail.reservation.repository.payment;
import com.southrail.reservation.entity.payment.PaymentWebhookEvent; import java.util.UUID; import org.springframework.data.jpa.repository.JpaRepository;
public interface PaymentWebhookEventRepository extends JpaRepository<PaymentWebhookEvent,UUID>{ boolean existsByProviderAndEventId(String provider,String eventId); }
