package com.southrail.reservation.service;

import com.southrail.reservation.entity.Booking;
import com.southrail.reservation.entity.BookingSeat;
import com.southrail.reservation.entity.Passenger;
import com.southrail.reservation.entity.User;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AccountEmailService {
  private final JavaMailSender mailSender;
  private final String from;
  private final String frontendUrl;

  public AccountEmailService(JavaMailSender mailSender,
      @Value("${app.mail.from}") String from,
      @Value("${app.frontend-url}") String frontendUrl) {
    this.mailSender = mailSender;
    this.from = from;
    this.frontendUrl = frontendUrl;
  }

  public void sendPasswordReset(User user, String token) {
    send(user.getEmail(), "Action Required: Reset Your SouthRail Password",
        "Use this secure link to reset your SouthRail password:\n\n" + frontendUrl + "/reset-password?token=" + token);
  }

  public void sendEmailVerification(User user, String token) {
    System.out.println("Verification email triggered");

    send(
            user.getEmail(),
            "Verify your SouthRail email",
            "Confirm your SouthRail account email using this secure link:\n\n"
                    + frontendUrl + "/verify-email?token=" + token
    );
  }
    public void sendAccountUnlock(User user, String token) {

        send(
                user.getEmail(),
                "SouthRail Account Locked - Unlock Your Account",
                "Unlock your SouthRail account using this secure link:\n\n"
                        + frontendUrl + "/unlock-account?token=" + token
        );
    }
  private void send(String to, String subject, String body) {
    try {

      String actionLink = "#";

      if (body != null && body.contains("http")) {
        int start = body.indexOf("http");
        actionLink = body.substring(start).trim();
      }

        boolean isVerificationEmail =
                subject != null &&
                        subject.toLowerCase().contains("verify");

        boolean isUnlockEmail =
                subject != null &&
                        subject.toLowerCase().contains("unlock");

        String title;

        if (isVerificationEmail) {
            title = "Verify Your Email";
        } else if (isUnlockEmail) {
            title = "Unlock Your Account";
        } else {
            title = "Reset Your Password";
        }

        String description;

        if (isVerificationEmail) {

            description =
                    "Please verify your email address to activate your SouthRail account.";

        } else if (isUnlockEmail) {

            description =
                    "Your account has been temporarily locked due to multiple unsuccessful login attempts. Use the button below to unlock your account immediately.";

        } else {

            description =
                    "We received a request to reset the password associated with your SouthRail account.";
        }
        String buttonText;

        if (isVerificationEmail) {
            buttonText = "Verify Email";
        } else if (isUnlockEmail) {
            buttonText = "Unlock Account";
        } else {
            buttonText = "Reset Password";
        }

      MimeMessage message = mailSender.createMimeMessage();

      MimeMessageHelper helper =
              new MimeMessageHelper(message, true, "UTF-8");

      helper.setFrom(from);
      helper.setTo(to);
      helper.setSubject(subject);

      String html = """
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#edf2f7;font-family:Arial,Helvetica,sans-serif;">

        <table width="100%%" cellpadding="0" cellspacing="0">
        <tr>
        <td align="center" style="padding:40px 20px;">

        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;">

        <!-- HEADER -->
        <tr>
        <td style="background:#013220;padding:50px 40px;text-align:center;">

            <div style="font-size:42px;margin-bottom:12px;">🚆</div>

            <div style="
                font-size:30px;
                font-weight:800;
                color:#ffffff;">
                SouthRail
            </div>

            <div style="
                color:#9FE1CB;
                font-size:12px;
                letter-spacing:1px;
                margin-top:8px;">
                Secure Railway Reservation System
            </div>

        </td>
        </tr>

        <!-- BODY -->
        <tr>
        <td style="padding:42px 40px;">

            <h2 style="
                color:#102a43;
                margin-top:0;
                font-size:28px;">
                %s
            </h2>

            <p style="
                color:#334e68;
                font-size:15px;
                line-height:1.8;">
                %s
            </p>

            <table width="100%%"
                   cellpadding="0"
                   cellspacing="0"
                   style="background:#f8fafc;border-radius:10px;margin:24px 0;">
            <tr>
            <td style="padding:18px;">

                <strong style="color:#102a43;">
                    🔒 Secure One-Time Link
                </strong>

                <p style="
                    margin:8px 0 0;
                    color:#334e68;
                    font-size:13px;
                    line-height:1.6;">
                    This action link is generated securely for your account.
                </p>

            </td>
            </tr>
            </table>

            <div style="text-align:center;margin:35px 0;">

                <a href="%s"
                   style="
                    background:#0a4f42;
                    color:#ffffff;
                    text-decoration:none;
                    padding:16px 40px;
                    border-radius:10px;
                    font-size:16px;
                    font-weight:700;
                    display:inline-block;">
                    %s
                </a>

            </div>

            <table width="100%%"
                   cellpadding="0"
                   cellspacing="0"
                   style="border:1px solid #e2e8f0;border-radius:10px;margin-top:24px;">

                <tr>

                    <td width="33%%"
                        style="padding:16px;text-align:center;border-right:1px solid #e2e8f0;">
                        ⏱<br>
                        <span style="font-size:12px;color:#334e68;">
                            Expires in 30 minutes
                        </span>
                    </td>

                    <td width="33%%"
                        style="padding:16px;text-align:center;border-right:1px solid #e2e8f0;">
                        🔄<br>
                        <span style="font-size:12px;color:#334e68;">
                            Single-use token
                        </span>
                    </td>

                    <td width="33%%"
                        style="padding:16px;text-align:center;">
                        🛡️<br>
                        <span style="font-size:12px;color:#334e68;">
                            Secure action
                        </span>
                    </td>

                </tr>

            </table>

            <div style="
                background:#E1F5EE;
                border-radius:8px;
                padding:14px 16px;
                margin-top:24px;">

                <p style="
                    margin:0;
                    font-size:13px;
                    color:#085041;
                    line-height:1.6;">

                    If you did not request this action,
                    you may safely ignore this email.

                </p>

            </div>

        </td>
        </tr>

        <!-- FOOTER -->
        <tr>
        <td style="background:#013220;padding:28px 36px;">

            <div style="
                text-align:center;
                color:#ffffff;
                font-size:16px;
                font-weight:700;">
                🚆 SouthRail
            </div>

            <div style="
                text-align:center;
                color:#9FE1CB;
                font-size:12px;
                margin-top:8px;">
                Secure Railway Reservation System
            </div>

            <div style="
                text-align:center;
                color:#5DCAA5;
                font-size:11px;
                margin-top:16px;
                line-height:1.7;">

                This is an automated security email regarding your SouthRail account.

                <br><br>

                © 2026 SouthRail. All rights reserved.

            </div>

        </td>
        </tr>

        </table>

        </td>
        </tr>
        </table>

        </body>
        </html>
        """.formatted(
              title,
              description,
              actionLink,
              buttonText
      );

      helper.setText(html, true);

      System.out.println("Before mail send");
      System.out.println("Subject: " + subject);
      System.out.println("To: " + to);

      mailSender.send(message);

      System.out.println("After mail send");

    } catch (Exception e) {
      e.printStackTrace();
      throw new RuntimeException(e);
    }
  }

    public void sendBookingConfirmation(
          Booking booking,
          List<Passenger> passengers,
          List<BookingSeat> seats) {

    try {

      MimeMessage message = mailSender.createMimeMessage();

      MimeMessageHelper helper =
              new MimeMessageHelper(message, true, "UTF-8");

      helper.setFrom(from);
      helper.setTo(booking.getUser().getEmail());

      helper.setSubject(
              "SouthRail Booking Confirmed - PNR "
                      + booking.getPnr()
      );

      StringBuilder passengerRows = new StringBuilder();

      for (int i = 0; i < passengers.size(); i++) {
        Passenger passenger = passengers.get(i);
        BookingSeat seat = i < seats.size() ? seats.get(i) : null;
        String rowBg = (i % 2 == 0) ? "#ffffff" : "#fafafa";
        String coachCode =
                seat != null ? seat.getCoachCode() : "-";

        int seatNumber =
                seat != null ? seat.getSeatNumber() : 0;

        String berthType =
                seat != null ? seat.getBerthType() : "-";
        passengerRows.append("""
        <tr style="border-bottom:1px solid #f0f0f0;background:%s;">
            <td style="padding:12px 14px;color:#999;">%d</td>
            <td style="padding:12px 14px;color:#1a1a1a;font-weight:600;">%s</td>
            <td style="padding:12px 14px;color:#555;">%s</td>
            <td style="padding:12px 14px;color:#0a4f42;font-weight:700;font-family:monospace;font-size:14px;">%s-%s</td>
            <td style="padding:12px 14px;">
                <span style="background:#e1f5ee;color:#0a4f42;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;">%s</span>
            </td>
        </tr>
        """.formatted(
                rowBg,
                i + 1,
                passenger.getFullName(),
                passenger.getAge(),
                coachCode,
                seatNumber,
                berthType
        ));
      }

      String html = """
  <html>
  <body style="margin:0;padding:32px 16px;background:#e8edf2;font-family:Arial,sans-serif;">

  <div style="max-width:680px;margin:0 auto;">

    <!-- Header banner -->
    <div style="background:#0a4f42;border-radius:12px 12px 0 0;padding:32px 36px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="color:#5dcaa5;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">SouthRail</div>
        <div style="color:#ffffff;font-size:26px;font-weight:700;margin-bottom:4px;">Booking Confirmed</div>
        <div style="color:#9fe1cb;font-size:14px;">Your journey is all set. Have a great trip!</div>
      </div>
      <div style="font-size:48px;line-height:1;">&#128642;</div>
    </div>

    <!-- PNR bar -->
    <div style="background:#104a3e;padding:14px 36px;display:flex;align-items:center;gap:16px;">
      <div style="color:#9fe1cb;font-size:12px;text-transform:uppercase;letter-spacing:1px;">PNR Number</div>
      <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:3px;">%s</div>
      <div style="margin-left:auto;background:#0d6b58;border:1px solid #1d9e75;border-radius:20px;padding:4px 16px;color:#5dcaa5;font-size:12px;font-weight:700;">%s</div>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px 36px;">

      <!-- Route card -->
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;background:#f0faf6;border-radius:10px;padding:24px;margin-bottom:28px;">
        <div>
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">From</div>
          <div style="font-size:22px;font-weight:700;color:#0a4f42;">%s</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#1d9e75;font-size:13px;margin-bottom:6px;">&#9654;</div>
          <div style="width:80px;height:2px;background:#1d9e75;"></div>
        </div>
        <div style="text-align:right;">
          <div style="color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">To</div>
          <div style="font-size:22px;font-weight:700;color:#0a4f42;">%s</div>
        </div>
      </div>

      <!-- Journey meta grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1px;background:#e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:28px;">
        <div style="background:#fff;padding:14px 16px;">
          <div style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Train</div>
          <div style="color:#1a1a1a;font-size:13px;font-weight:600;">%s</div>
          <div style="color:#888;font-size:12px;">#%s</div>
        </div>
        <div style="background:#fff;padding:14px 16px;">
          <div style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Date</div>
          <div style="color:#1a1a1a;font-size:13px;font-weight:600;">%s</div>
        </div>
        <div style="background:#fff;padding:14px 16px;">
          <div style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Class</div>
          <div style="color:#1a1a1a;font-size:13px;font-weight:600;">%s</div>
        </div>
        <div style="background:#fff;padding:14px 16px;">
          <div style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Passengers</div>
          <div style="color:#1a1a1a;font-size:13px;font-weight:600;">%d</div>
        </div>
      </div>

      <!-- Passengers table -->
      <div style="margin-bottom:28px;">
        <div style="font-size:13px;font-weight:700;color:#0a4f42;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e1f5ee;">Passenger Details</div>
        <table style="width:100%%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#0a4f42;">
              <th style="color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">#</th>
              <th style="color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Name</th>
              <th style="color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Age</th>
              <th style="color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Seat</th>
              <th style="color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Berth</th>
            </tr>
          </thead>
          <tbody>
            %s
          </tbody>
        </table>
      </div>

      <!-- Fare box -->
      <div style="background:#0a4f42;border-radius:10px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
        <div>
          <div style="color:#9fe1cb;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Total Fare Paid</div>
          <div style="color:#ffffff;font-size:28px;font-weight:700;">&#8377; %s</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#9fe1cb;font-size:11px;margin-bottom:2px;">Payment Status</div>
          <div style="color:#5dcaa5;font-weight:700;font-size:15px;">&#10004; Paid</div>
        </div>
      </div>

      <!-- Tips -->
      <div style="border:1px dashed #cde8e0;border-radius:8px;padding:16px 20px;background:#f7fdfb;">
        <div style="font-size:12px;font-weight:700;color:#0a4f42;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Important Information</div>
        <ul style="margin:0;padding:0 0 0 18px;color:#555;font-size:13px;line-height:2;">
          <li>Arrive at the station at least 30 minutes before departure.</li>
          <li>Carry a valid government-issued photo ID for all passengers.</li>
          <li>This PNR is your proof of booking &mdash; keep it handy.</li>
          <li>Cancellations can be done up to 4 hours before departure.</li>
        </ul>
      </div>

    </div>

    <!-- Footer -->
    <div style="background:#104a3e;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
      <div style="color:#9fe1cb;font-size:13px;margin-bottom:4px;">Thank you for choosing <strong style="color:#fff;">SouthRail</strong></div>
      <div style="color:#5f9e8a;font-size:12px;">For support, contact us at support@southrail.in or call 1800-XXX-XXXX</div>
    </div>

  </div>

  </body>
  </html>
  """.formatted(
              booking.getPnr(),
              booking.getStatus(),
              booking.getSourceStation().getName(),
              booking.getDestinationStation().getName(),
              booking.getTrain().getName(),
              booking.getTrain().getNumber(),
              booking.getJourneyDate(),
              booking.getTravelClass(),
              passengers.size(),
              passengerRows,
              booking.getTotalFare()
      );
      helper.setText(html, true);

      mailSender.send(message);

    } catch (Exception e) {
      System.err.println("Booking confirmation email failed: " + e.getMessage());
      throw new RuntimeException(e);
    }
  }

}
