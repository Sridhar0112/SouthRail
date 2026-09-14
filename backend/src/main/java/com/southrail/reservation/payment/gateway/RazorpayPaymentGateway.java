package com.southrail.reservation.payment.gateway;
import com.fasterxml.jackson.databind.*; import com.southrail.reservation.config.properties.RazorpayProperties; import com.southrail.reservation.exception.ApiException;
import java.net.URI; import java.net.http.*; import java.nio.charset.StandardCharsets; import java.time.Duration; import java.util.*; import org.springframework.http.HttpStatus; import org.springframework.stereotype.Component;
@Component
public class RazorpayPaymentGateway implements PaymentGateway {
 private final RazorpayProperties config; private final ObjectMapper json; private final HttpClient http;
 public RazorpayPaymentGateway(RazorpayProperties config,ObjectMapper json){this(config,json,HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());}
 RazorpayPaymentGateway(RazorpayProperties c,ObjectMapper j,HttpClient h){config=c;json=j;http=h;}
 public GatewayOrder createOrder(long amount,String currency,String receipt,Map<String,String> notes){JsonNode n=call("POST","/orders",Map.of("amount",amount,"currency",currency,"receipt",receipt,"notes",notes),null);return new GatewayOrder(n.path("id").asText(),n.path("amount").asLong(),n.path("currency").asText(),n.path("status").asText());}
 public GatewayPayment fetchPayment(String id){JsonNode n=call("GET","/payments/"+id,null,null);return new GatewayPayment(n.path("id").asText(),n.path("order_id").asText(),n.path("amount").asLong(),n.path("currency").asText(),n.path("status").asText());}
 public GatewayRefund initiateRefund(String id,long amount,String key){JsonNode n=call("POST","/payments/"+id+"/refund",Map.of("amount",amount,"notes",Map.of("southrail_idempotency_key",key)),key);return new GatewayRefund(n.path("id").asText(),n.path("amount").asLong(),n.path("status").asText());}
 private JsonNode call(String method,String path,Object body,String idempotency){
  if(!config.enabled()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"RAZORPAY_UNAVAILABLE","Payment gateway is not enabled");
  try {var b=HttpRequest.newBuilder(URI.create(config.baseUrl()+path)).timeout(Duration.ofSeconds(10)).header("Authorization","Basic "+Base64.getEncoder().encodeToString((config.keyId()+":"+config.keySecret()).getBytes(StandardCharsets.UTF_8))).header("Content-Type","application/json"); if(idempotency!=null)b.header("X-Razorpay-Idempotency-Key",idempotency); HttpRequest req=body==null?b.GET().build():b.method(method,HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(); var res=http.send(req,HttpResponse.BodyHandlers.ofString()); if(res.statusCode()/100!=2) throw unavailable(); return json.readTree(res.body()); } catch(InterruptedException e){Thread.currentThread().interrupt();throw unavailable();} catch(Exception e){if(e instanceof ApiException a)throw a;throw unavailable();}
 }
 private ApiException unavailable(){return new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"RAZORPAY_UNAVAILABLE","Payment provider is temporarily unavailable");}
}
