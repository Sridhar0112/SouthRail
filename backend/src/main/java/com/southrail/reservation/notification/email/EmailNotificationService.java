package com.southrail.reservation.notification.email;

import com.southrail.reservation.booking.Booking;
import com.southrail.reservation.booking.inventory.BookingSeat;
import com.southrail.reservation.booking.Passenger;
import com.southrail.reservation.account.User;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Service
public class EmailNotificationService {
  private static final Logger log = LoggerFactory.getLogger(EmailNotificationService.class);
  private final JavaMailSender mailSender;
  private final String from;
  private final String frontendUrl;

  public EmailNotificationService(JavaMailSender mailSender,
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

      String html = String.format("<!DOCTYPE html>\n" +
                "<html>\n" +
                "<body style=\"margin:0;padding:0;background:#edf2f7;font-family:Arial,Helvetica,sans-serif;\">\n" +
                "\n" +
                "<table width=\"100%%\" cellpadding=\"0\" cellspacing=\"0\">\n" +
                "<tr>\n" +
                "<td align=\"center\" style=\"padding:40px 20px;\">\n" +
                "\n" +
                "<table width=\"600\" cellpadding=\"0\" cellspacing=\"0\"\n" +
                "       style=\"background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2e8f0;\">\n" +
                "\n" +
                "<!-- HEADER -->\n" +
                "<tr>\n" +
                "<td style=\"background:#013220;padding:50px 40px;text-align:center;\">\n" +
                "\n" +
                "    <div style=\"font-size:42px;margin-bottom:12px;\">🚆</div>\n" +
                "\n" +
                "    <div style=\"\n" +
                "        font-size:30px;\n" +
                "        font-weight:800;\n" +
                "        color:#ffffff;\">\n" +
                "        SouthRail\n" +
                "    </div>\n" +
                "\n" +
                "    <div style=\"\n" +
                "        color:#9FE1CB;\n" +
                "        font-size:12px;\n" +
                "        letter-spacing:1px;\n" +
                "        margin-top:8px;\">\n" +
                "        Secure Railway Reservation System\n" +
                "    </div>\n" +
                "\n" +
                "</td>\n" +
                "</tr>\n" +
                "\n" +
                "<!-- BODY -->\n" +
                "<tr>\n" +
                "<td style=\"padding:42px 40px;\">\n" +
                "\n" +
                "    <h2 style=\"\n" +
                "        color:#102a43;\n" +
                "        margin-top:0;\n" +
                "        font-size:28px;\">\n" +
                "        %s\n" +
                "    </h2>\n" +
                "\n" +
                "    <p style=\"\n" +
                "        color:#334e68;\n" +
                "        font-size:15px;\n" +
                "        line-height:1.8;\">\n" +
                "        %s\n" +
                "    </p>\n" +
                "\n" +
                "    <table width=\"100%%\"\n" +
                "           cellpadding=\"0\"\n" +
                "           cellspacing=\"0\"\n" +
                "           style=\"background:#f8fafc;border-radius:10px;margin:24px 0;\">\n" +
                "    <tr>\n" +
                "    <td style=\"padding:18px;\">\n" +
                "\n" +
                "        <strong style=\"color:#102a43;\">\n" +
                "            🔒 Secure One-Time Link\n" +
                "        </strong>\n" +
                "\n" +
                "        <p style=\"\n" +
                "            margin:8px 0 0;\n" +
                "            color:#334e68;\n" +
                "            font-size:13px;\n" +
                "            line-height:1.6;\">\n" +
                "            This action link is generated securely for your account.\n" +
                "        </p>\n" +
                "\n" +
                "    </td>\n" +
                "    </tr>\n" +
                "    </table>\n" +
                "\n" +
                "    <div style=\"text-align:center;margin:35px 0;\">\n" +
                "\n" +
                "        <a href=\"%s\"\n" +
                "           style=\"\n" +
                "            background:#0a4f42;\n" +
                "            color:#ffffff;\n" +
                "            text-decoration:none;\n" +
                "            padding:16px 40px;\n" +
                "            border-radius:10px;\n" +
                "            font-size:16px;\n" +
                "            font-weight:700;\n" +
                "            display:inline-block;\">\n" +
                "            %s\n" +
                "        </a>\n" +
                "\n" +
                "    </div>\n" +
                "\n" +
                "    <table width=\"100%%\"\n" +
                "           cellpadding=\"0\"\n" +
                "           cellspacing=\"0\"\n" +
                "           style=\"border:1px solid #e2e8f0;border-radius:10px;margin-top:24px;\">\n" +
                "\n" +
                "        <tr>\n" +
                "\n" +
                "            <td width=\"33%%\"\n" +
                "                style=\"padding:16px;text-align:center;border-right:1px solid #e2e8f0;\">\n" +
                "                ⏱<br>\n" +
                "                <span style=\"font-size:12px;color:#334e68;\">\n" +
                "                    Expires in 30 minutes\n" +
                "                </span>\n" +
                "            </td>\n" +
                "\n" +
                "            <td width=\"33%%\"\n" +
                "                style=\"padding:16px;text-align:center;border-right:1px solid #e2e8f0;\">\n" +
                "                🔄<br>\n" +
                "                <span style=\"font-size:12px;color:#334e68;\">\n" +
                "                    Single-use token\n" +
                "                </span>\n" +
                "            </td>\n" +
                "\n" +
                "            <td width=\"33%%\"\n" +
                "                style=\"padding:16px;text-align:center;\">\n" +
                "                🛡️<br>\n" +
                "                <span style=\"font-size:12px;color:#334e68;\">\n" +
                "                    Secure action\n" +
                "                </span>\n" +
                "            </td>\n" +
                "\n" +
                "        </tr>\n" +
                "\n" +
                "    </table>\n" +
                "\n" +
                "    <div style=\"\n" +
                "        background:#E1F5EE;\n" +
                "        border-radius:8px;\n" +
                "        padding:14px 16px;\n" +
                "        margin-top:24px;\">\n" +
                "\n" +
                "        <p style=\"\n" +
                "            margin:0;\n" +
                "            font-size:13px;\n" +
                "            color:#085041;\n" +
                "            line-height:1.6;\">\n" +
                "\n" +
                "            If you did not request this action,\n" +
                "            you may safely ignore this email.\n" +
                "\n" +
                "        </p>\n" +
                "\n" +
                "    </div>\n" +
                "\n" +
                "</td>\n" +
                "</tr>\n" +
                "\n" +
                "<!-- FOOTER -->\n" +
                "<tr>\n" +
                "<td style=\"background:#013220;padding:28px 36px;\">\n" +
                "\n" +
                "    <div style=\"\n" +
                "        text-align:center;\n" +
                "        color:#ffffff;\n" +
                "        font-size:16px;\n" +
                "        font-weight:700;\">\n" +
                "        🚆 SouthRail\n" +
                "    </div>\n" +
                "\n" +
                "    <div style=\"\n" +
                "        text-align:center;\n" +
                "        color:#9FE1CB;\n" +
                "        font-size:12px;\n" +
                "        margin-top:8px;\">\n" +
                "        Secure Railway Reservation System\n" +
                "    </div>\n" +
                "\n" +
                "    <div style=\"\n" +
                "        text-align:center;\n" +
                "        color:#5DCAA5;\n" +
                "        font-size:11px;\n" +
                "        margin-top:16px;\n" +
                "        line-height:1.7;\">\n" +
                "\n" +
                "        This is an automated security email regarding your SouthRail account.\n" +
                "\n" +
                "        <br><br>\n" +
                "\n" +
                "        © 2026 SouthRail. All rights reserved.\n" +
                "\n" +
                "    </div>\n" +
                "\n" +
                "</td>\n" +
                "</tr>\n" +
                "\n" +
                "</table>\n" +
                "\n" +
                "</td>\n" +
                "</tr>\n" +
                "</table>\n" +
                "\n" +
                "</body>\n" +
                "</html>\n",
              title,
              description,
              actionLink,
              buttonText
      );

      helper.setText(html, true);

      mailSender.send(message);
      log.info("account_email_sent type={}", emailType(subject));

    } catch (Exception e) {
      throw new IllegalStateException("Unable to send account email", e);
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
        passengerRows.append(String.format("<tr style=\"border-bottom:1px solid #f0f0f0;background:%s;\">\n" +
                "    <td style=\"padding:12px 14px;color:#999;\">%d</td>\n" +
                "    <td style=\"padding:12px 14px;color:#1a1a1a;font-weight:600;\">%s</td>\n" +
                "    <td style=\"padding:12px 14px;color:#555;\">%s</td>\n" +
                "    <td style=\"padding:12px 14px;color:#0a4f42;font-weight:700;font-family:monospace;font-size:14px;\">%s-%s</td>\n" +
                "    <td style=\"padding:12px 14px;\">\n" +
                "        <span style=\"background:#e1f5ee;color:#0a4f42;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;\">%s</span>\n" +
                "    </td>\n" +
                "</tr>\n",
                rowBg,
                i + 1,
                passenger.getFullName(),
                passenger.getAge(),
                coachCode,
                seatNumber,
                berthType
        ));
      }

      String html = String.format("<html>\n" +
                "<body style=\"margin:0;padding:32px 16px;background:#e8edf2;font-family:Arial,sans-serif;\">\n" +
                "\n" +
                "<div style=\"max-width:680px;margin:0 auto;\">\n" +
                "\n" +
                "  <!-- Header banner -->\n" +
                "  <div style=\"background:#0a4f42;border-radius:12px 12px 0 0;padding:32px 36px;display:flex;align-items:center;justify-content:space-between;\">\n" +
                "    <div>\n" +
                "      <div style=\"color:#5dcaa5;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;\">SouthRail</div>\n" +
                "      <div style=\"color:#ffffff;font-size:26px;font-weight:700;margin-bottom:4px;\">Booking Confirmed</div>\n" +
                "      <div style=\"color:#9fe1cb;font-size:14px;\">Your journey is all set. Have a great trip!</div>\n" +
                "    </div>\n" +
                "    <div style=\"font-size:48px;line-height:1;\">&#128642;</div>\n" +
                "  </div>\n" +
                "\n" +
                "  <!-- PNR bar -->\n" +
                "  <div style=\"background:#104a3e;padding:14px 36px;display:flex;align-items:center;gap:16px;\">\n" +
                "    <div style=\"color:#9fe1cb;font-size:12px;text-transform:uppercase;letter-spacing:1px;\">PNR Number</div>\n" +
                "    <div style=\"color:#ffffff;font-size:22px;font-weight:700;letter-spacing:3px;\">%s</div>\n" +
                "    <div style=\"margin-left:auto;background:#0d6b58;border:1px solid #1d9e75;border-radius:20px;padding:4px 16px;color:#5dcaa5;font-size:12px;font-weight:700;\">%s</div>\n" +
                "  </div>\n" +
                "\n" +
                "  <!-- Body -->\n" +
                "  <div style=\"background:#ffffff;padding:32px 36px;\">\n" +
                "\n" +
                "    <!-- Route card -->\n" +
                "    <div style=\"display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;background:#f0faf6;border-radius:10px;padding:24px;margin-bottom:28px;\">\n" +
                "      <div>\n" +
                "        <div style=\"color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;\">From</div>\n" +
                "        <div style=\"font-size:22px;font-weight:700;color:#0a4f42;\">%s</div>\n" +
                "      </div>\n" +
                "      <div style=\"text-align:center;\">\n" +
                "        <div style=\"color:#1d9e75;font-size:13px;margin-bottom:6px;\">&#9654;</div>\n" +
                "        <div style=\"width:80px;height:2px;background:#1d9e75;\"></div>\n" +
                "      </div>\n" +
                "      <div style=\"text-align:right;\">\n" +
                "        <div style=\"color:#666;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;\">To</div>\n" +
                "        <div style=\"font-size:22px;font-weight:700;color:#0a4f42;\">%s</div>\n" +
                "      </div>\n" +
                "    </div>\n" +
                "\n" +
                "    <!-- Journey meta grid -->\n" +
                "    <div style=\"display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1px;background:#e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:28px;\">\n" +
                "      <div style=\"background:#fff;padding:14px 16px;\">\n" +
                "        <div style=\"color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;\">Train</div>\n" +
                "        <div style=\"color:#1a1a1a;font-size:13px;font-weight:600;\">%s</div>\n" +
                "        <div style=\"color:#888;font-size:12px;\">#%s</div>\n" +
                "      </div>\n" +
                "      <div style=\"background:#fff;padding:14px 16px;\">\n" +
                "        <div style=\"color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;\">Date</div>\n" +
                "        <div style=\"color:#1a1a1a;font-size:13px;font-weight:600;\">%s</div>\n" +
                "      </div>\n" +
                "      <div style=\"background:#fff;padding:14px 16px;\">\n" +
                "        <div style=\"color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;\">Class</div>\n" +
                "        <div style=\"color:#1a1a1a;font-size:13px;font-weight:600;\">%s</div>\n" +
                "      </div>\n" +
                "      <div style=\"background:#fff;padding:14px 16px;\">\n" +
                "        <div style=\"color:#999;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;\">Passengers</div>\n" +
                "        <div style=\"color:#1a1a1a;font-size:13px;font-weight:600;\">%d</div>\n" +
                "      </div>\n" +
                "    </div>\n" +
                "\n" +
                "    <!-- Passengers table -->\n" +
                "    <div style=\"margin-bottom:28px;\">\n" +
                "      <div style=\"font-size:13px;font-weight:700;color:#0a4f42;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e1f5ee;\">Passenger Details</div>\n" +
                "      <table style=\"width:100%%;border-collapse:collapse;font-size:13px;\">\n" +
                "        <thead>\n" +
                "          <tr style=\"background:#0a4f42;\">\n" +
                "            <th style=\"color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;\">#</th>\n" +
                "            <th style=\"color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;\">Name</th>\n" +
                "            <th style=\"color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;\">Age</th>\n" +
                "            <th style=\"color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;\">Seat</th>\n" +
                "            <th style=\"color:#9fe1cb;font-weight:600;text-align:left;padding:10px 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;\">Berth</th>\n" +
                "          </tr>\n" +
                "        </thead>\n" +
                "        <tbody>\n" +
                "          %s\n" +
                "        </tbody>\n" +
                "      </table>\n" +
                "    </div>\n" +
                "\n" +
                "    <!-- Fare box -->\n" +
                "    <div style=\"background:#0a4f42;border-radius:10px;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;\">\n" +
                "      <div>\n" +
                "        <div style=\"color:#9fe1cb;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;\">Total Fare Paid</div>\n" +
                "        <div style=\"color:#ffffff;font-size:28px;font-weight:700;\">&#8377; %s</div>\n" +
                "      </div>\n" +
                "      <div style=\"text-align:right;\">\n" +
                "        <div style=\"color:#9fe1cb;font-size:11px;margin-bottom:2px;\">Payment Status</div>\n" +
                "        <div style=\"color:#5dcaa5;font-weight:700;font-size:15px;\">&#10004; Paid</div>\n" +
                "      </div>\n" +
                "    </div>\n" +
                "\n" +
                "    <!-- Tips -->\n" +
                "    <div style=\"border:1px dashed #cde8e0;border-radius:8px;padding:16px 20px;background:#f7fdfb;\">\n" +
                "      <div style=\"font-size:12px;font-weight:700;color:#0a4f42;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;\">Important Information</div>\n" +
                "      <ul style=\"margin:0;padding:0 0 0 18px;color:#555;font-size:13px;line-height:2;\">\n" +
                "        <li>Arrive at the station at least 30 minutes before departure.</li>\n" +
                "        <li>Carry a valid government-issued photo ID for all passengers.</li>\n" +
                "        <li>This PNR is your proof of booking &mdash; keep it handy.</li>\n" +
                "        <li>Cancellations can be done up to 4 hours before departure.</li>\n" +
                "      </ul>\n" +
                "    </div>\n" +
                "\n" +
                "  </div>\n" +
                "\n" +
                "  <!-- Footer -->\n" +
                "  <div style=\"background:#104a3e;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;\">\n" +
                "    <div style=\"color:#9fe1cb;font-size:13px;margin-bottom:4px;\">Thank you for choosing <strong style=\"color:#fff;\">SouthRail</strong></div>\n" +
                "    <div style=\"color:#5f9e8a;font-size:12px;\">For support, contact us at support@southrail.in or call 1800-XXX-XXXX</div>\n" +
                "  </div>\n" +
                "\n" +
                "</div>\n" +
                "\n" +
                "</body>\n" +
                "</html>\n",
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
      log.info("booking_confirmation_email_sent pnr={}", booking.getPnr());

    } catch (Exception e) {
      throw new IllegalStateException("Unable to send booking confirmation email", e);
    }
  }

  private String emailType(String subject) {
    if (subject == null) {
      return "unknown";
    }
    String normalized = subject.toLowerCase(java.util.Locale.ROOT);
    if (normalized.contains("verify")) { return "verification"; }
    if (normalized.contains("unlock")) { return "unlock"; }
    if (normalized.contains("password")) { return "password_reset"; }
    return "account_notification";
  }

}
