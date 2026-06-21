package com.southrail.reservation.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.southrail.reservation.entity.Booking;
import com.southrail.reservation.entity.BookingStatus;
import com.southrail.reservation.entity.Passenger;
import com.southrail.reservation.entity.RoleName;
import com.southrail.reservation.entity.Station;
import com.southrail.reservation.entity.User;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.BookingRepository;
import com.southrail.reservation.repository.PassengerRepository;
import com.southrail.reservation.repository.UserRepository;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketPdfService {

    private static final DateTimeFormatter DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private static final DateTimeFormatter BOOKING_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm")
                    .withZone(ZoneId.systemDefault());

    private static final DateTimeFormatter JOURNEY_DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd-MMM-yyyy");

    private static final Color SOUTHRAIL_NAVY = new Color(14, 46, 89);
    private static final Color SOUTHRAIL_BLUE = new Color(25, 118, 210);
    private static final Color SOUTHRAIL_LIGHT_BLUE = new Color(232, 242, 255);
    private static final Color SOUTHRAIL_GREEN = new Color(0, 121, 85);
    private static final Color SOUTHRAIL_DARK_GREEN = new Color(0, 92, 64);
    private static final Color SOUTHRAIL_ORANGE = new Color(220, 124, 0);
    private static final Color SOUTHRAIL_RED = new Color(198, 40, 40);
    private static final Color BORDER_COLOR = new Color(40, 40, 40);
    private static final Color SOFT_BORDER = new Color(205, 213, 222);
    private static final Color SOFT_BG = new Color(246, 249, 252);
    private static final Color PALE_GREEN = new Color(235, 248, 243);
    private static final Color WHITE = Color.WHITE;
    private static final Color BLACK = Color.BLACK;
    private static final Color DARK_TEXT = new Color(35, 43, 51);
    private static final Color MUTED_TEXT = new Color(90, 104, 118);

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final PassengerRepository passengerRepository;

    public TicketPdfService(
            BookingRepository bookingRepository,
            UserRepository userRepository,
            AuditLogService auditLogService,
            PassengerRepository passengerRepository) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.passengerRepository = passengerRepository;
    }

    @Transactional(readOnly = true)
    public byte[] generateTicket(String email, String pnr) {
        User currentUser = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));

        Booking booking = bookingRepository
                .findByPnr(pnr)
                .orElseThrow(() ->
                        new ApiException(HttpStatus.NOT_FOUND, "Booking not found"));

        validateAccess(currentUser, booking);

        List<Passenger> passengers = passengerRepository.findByBooking(booking)
                .stream()
                .sorted(Comparator.comparing(
                        Passenger::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        byte[] pdfBytes = buildPdf(booking, passengers);

        auditLogService.log(
                currentUser.getId(),
                currentUser.getEmail(),
                "TICKET_DOWNLOADED",
                "BOOKING",
                "Ticket PDF downloaded for PNR " + booking.getPnr());

        return pdfBytes;
    }

    private void validateAccess(User currentUser, Booking booking) {
        boolean isOwner = booking.getUser()
                .getEmail()
                .equalsIgnoreCase(currentUser.getEmail());

        boolean isAdmin = currentUser
                .getRoles()
                .contains(RoleName.ROLE_ADMIN);

        if (!isOwner && !isAdmin) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Access denied");
        }
    }

    private byte[] buildPdf(Booking booking, List<Passenger> passengers) {
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Document document = new Document(PageSize.A4, 24, 24, 22, 22);
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);

            document.open();

            drawPageBorder(writer);
            addHeader(document, booking);
            addRouteSummary(document, booking);
            addJourneyInfoStrip(document, booking);
            addPassengerDetails(document, booking, passengers);
            addPaymentAndVerificationBlock(document, booking);
            addImportantInstructions(document);
            addFooter(document, booking);

            document.close();
            return outputStream.toByteArray();

        } catch (Exception ex) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to generate ticket PDF");
        }
    }

    private void drawPageBorder(PdfWriter writer) {
        PdfContentByte canvas = writer.getDirectContent();
        Rectangle page = PageSize.A4;

        canvas.saveState();
        canvas.setColorStroke(BORDER_COLOR);
        canvas.setLineWidth(1.4f);
        canvas.rectangle(
                18,
                18,
                page.getWidth() - 36,
                page.getHeight() - 36);
        canvas.stroke();

        canvas.setColorStroke(SOUTHRAIL_BLUE);
        canvas.setLineWidth(0.8f);
        canvas.rectangle(
                23,
                23,
                page.getWidth() - 46,
                page.getHeight() - 46);
        canvas.stroke();
        canvas.restoreState();
    }

    private void addHeader(Document document, Booking booking) throws Exception {
        PdfPTable header = new PdfPTable(3);
        header.setWidthPercentage(100);
        header.setWidths(new float[] { 1.4f, 5.2f, 1.8f });

        PdfPCell logoCell = noBorderCell("", 8);
        PdfPTable logoBox = new PdfPTable(1);
        logoBox.setWidthPercentage(100);

        PdfPCell srBadge = new PdfPCell();
        srBadge.setBorder(Rectangle.BOX);
        srBadge.setBorderColor(SOUTHRAIL_NAVY);
        srBadge.setBackgroundColor(SOUTHRAIL_NAVY);
        srBadge.setPadding(8);
        srBadge.setHorizontalAlignment(Element.ALIGN_CENTER);
        srBadge.setVerticalAlignment(Element.ALIGN_MIDDLE);

        Paragraph badgeText = new Paragraph();
        badgeText.setAlignment(Element.ALIGN_CENTER);
        badgeText.add(new Phrase("SR\n", font(FontFactory.HELVETICA_BOLD, 21, WHITE)));
        badgeText.add(new Phrase("SouthRail", font(FontFactory.HELVETICA_BOLD, 8, WHITE)));
        srBadge.addElement(badgeText);
        logoBox.addCell(srBadge);

        logoCell.addElement(logoBox);
        header.addCell(logoCell);

        PdfPCell titleCell = noBorderCell("", 6);
        Paragraph title = new Paragraph();
        title.setAlignment(Element.ALIGN_CENTER);
        title.add(new Phrase("Electronic Reservation Slip (ERS)", font(FontFactory.HELVETICA_BOLD, 14, BLACK)));
        title.add(new Phrase(" - SouthRail User", font(FontFactory.HELVETICA, 10, DARK_TEXT)));
        title.setSpacingAfter(4);

        Paragraph subTitle = new Paragraph(
                "Secure Railway Reservation Ticket | Generated on "
                        + LocalDateTime.now().format(DATE_TIME_FORMAT),
                font(FontFactory.HELVETICA, 8, MUTED_TEXT));
        subTitle.setAlignment(Element.ALIGN_CENTER);

        Paragraph platform = new Paragraph(
                "SouthRail Reservation Platform",
                font(FontFactory.HELVETICA_BOLD, 10, SOUTHRAIL_BLUE));
        platform.setAlignment(Element.ALIGN_CENTER);

        titleCell.addElement(title);
        titleCell.addElement(subTitle);
        titleCell.addElement(platform);
        header.addCell(titleCell);

        PdfPCell statusCell = noBorderCell("", 6);
        PdfPTable statusBox = new PdfPTable(1);
        statusBox.setWidthPercentage(100);

        PdfPCell status = new PdfPCell(new Phrase(
                safeEnum(booking.getStatus()),
                font(FontFactory.HELVETICA_BOLD, 9, WHITE)));
        status.setBackgroundColor(statusColor(booking));
        status.setBorder(Rectangle.NO_BORDER);
        status.setPadding(7);
        status.setHorizontalAlignment(Element.ALIGN_CENTER);
        statusBox.addCell(status);

        PdfPCell ticketType = new PdfPCell(new Phrase(
                "E-TICKET",
                font(FontFactory.HELVETICA_BOLD, 9, SOUTHRAIL_NAVY)));
        ticketType.setBackgroundColor(SOUTHRAIL_LIGHT_BLUE);
        ticketType.setBorder(Rectangle.NO_BORDER);
        ticketType.setPadding(7);
        ticketType.setHorizontalAlignment(Element.ALIGN_CENTER);
        statusBox.addCell(ticketType);

        statusCell.addElement(statusBox);
        header.addCell(statusCell);

        document.add(header);
        addThinLine(document, SOUTHRAIL_NAVY, 1.3f, 6);
    }

    private void addRouteSummary(Document document, Booking booking) throws Exception {
        PdfPTable route = new PdfPTable(3);
        route.setWidthPercentage(100);
        route.setSpacingBefore(6);
        route.setWidths(new float[] { 2.5f, 2.4f, 2.5f });

        route.addCell(routeCell(
                "BOOKED FROM",
                stationCode(booking.getSourceStation()),
                stationName(booking.getSourceStation()),
                "Start Date: " + formatJourneyDate(booking),
                Element.ALIGN_CENTER));

        PdfPCell boardingCell = new PdfPCell();
        boardingCell.setPadding(8);
        boardingCell.setBorder(Rectangle.BOX);
        boardingCell.setBorderColor(SOFT_BORDER);
        boardingCell.setBackgroundColor(SOUTHRAIL_LIGHT_BLUE);
        boardingCell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Paragraph boarding = new Paragraph();
        boarding.setAlignment(Element.ALIGN_CENTER);
        boarding.add(new Phrase("BOARDING AT\n", font(FontFactory.HELVETICA_BOLD, 9, SOUTHRAIL_BLUE)));
        boarding.add(new Phrase(stationCode(booking.getSourceStation()) + "\n", font(FontFactory.HELVETICA_BOLD, 15, SOUTHRAIL_NAVY)));
        boarding.add(new Phrase(stationName(booking.getSourceStation()) + "\n", font(FontFactory.HELVETICA, 8, MUTED_TEXT)));
        boarding.add(new Phrase("Departure: As per railway schedule", font(FontFactory.HELVETICA, 7, MUTED_TEXT)));
        boardingCell.addElement(boarding);
        route.addCell(boardingCell);

        route.addCell(routeCell(
                "TO",
                stationCode(booking.getDestinationStation()),
                stationName(booking.getDestinationStation()),
                "Arrival: As per railway schedule",
                Element.ALIGN_CENTER));

        document.add(route);
    }

    private PdfPCell routeCell(
            String label,
            String code,
            String name,
            String footer,
            int align) {

        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(SOFT_BORDER);
        cell.setBackgroundColor(WHITE);
        cell.setPadding(8);
        cell.setHorizontalAlignment(align);

        Paragraph paragraph = new Paragraph();
        paragraph.setAlignment(align);
        paragraph.add(new Phrase(label + "\n", font(FontFactory.HELVETICA_BOLD, 8, MUTED_TEXT)));
        paragraph.add(new Phrase(code + "\n", font(FontFactory.HELVETICA_BOLD, 14, BLACK)));
        paragraph.add(new Phrase(name + "\n", font(FontFactory.HELVETICA, 8, DARK_TEXT)));
        paragraph.add(new Phrase(footer, font(FontFactory.HELVETICA, 7, MUTED_TEXT)));
        cell.addElement(paragraph);

        return cell;
    }

    private void addJourneyInfoStrip(Document document, Booking booking) throws Exception {
        PdfPTable strip = new PdfPTable(3);
        strip.setWidthPercentage(100);
        strip.setSpacingBefore(8);
        strip.setWidths(new float[] { 2.1f, 3.8f, 2.1f });

        strip.addCell(highlightCell(
                "PNR",
                safe(booking.getPnr()),
                SOUTHRAIL_BLUE));

        strip.addCell(highlightCell(
                "TRAIN NO. / NAME",
                trainNoName(booking),
                SOUTHRAIL_NAVY));

        strip.addCell(highlightCell(
                "CLASS",
                safe(booking.getTravelClass()),
                SOUTHRAIL_BLUE));

        strip.addCell(smallInfoCell("Quota", safe(booking.getQuota())));
        strip.addCell(smallInfoCell("Journey Date", formatJourneyDate(booking)));
        strip.addCell(smallInfoCell("Booking Date", formatInstant(booking.getCreatedAt())));

        strip.addCell(smallInfoCell("Reservation", safe(booking.getReservationLabel())));
        strip.addCell(smallInfoCell("Allotment", formatAllotment(booking)));
        strip.addCell(smallInfoCell("Total Fare", formatFare(booking.getTotalFare())));

        document.add(strip);
    }

    private PdfPCell highlightCell(String label, String value, Color color) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(8);
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(BORDER_COLOR);
        cell.setBackgroundColor(WHITE);

        Paragraph paragraph = new Paragraph();
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.add(new Phrase(label + "\n", font(FontFactory.HELVETICA_BOLD, 8, MUTED_TEXT)));
        paragraph.add(new Phrase(value, font(FontFactory.HELVETICA_BOLD, 13, color)));
        cell.addElement(paragraph);

        return cell;
    }

    private PdfPCell smallInfoCell(String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(7);
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(BORDER_COLOR);
        cell.setBackgroundColor(SOFT_BG);

        Paragraph paragraph = new Paragraph();
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.add(new Phrase(label + "\n", font(FontFactory.HELVETICA_BOLD, 7, MUTED_TEXT)));
        paragraph.add(new Phrase(value, font(FontFactory.HELVETICA_BOLD, 9, BLACK)));
        cell.addElement(paragraph);

        return cell;
    }

    private void addPassengerDetails(
            Document document,
            Booking booking,
            List<Passenger> passengers) throws Exception {

        addSectionTitle(document, "Passenger Details", SOUTHRAIL_NAVY);

        PdfPTable table = new PdfPTable(7);
        table.setWidthPercentage(100);
        table.setWidths(new float[] { 0.45f, 2.4f, 0.75f, 0.8f, 1.65f, 1.65f, 1.8f });

        addTableHeader(table, "#");
        addTableHeader(table, "Name");
        addTableHeader(table, "Age");
        addTableHeader(table, "Gender");
        addTableHeader(table, "Booking Status");
        addTableHeader(table, "Current Status");
        addTableHeader(table, "Allotment");

        if (passengers == null || passengers.isEmpty()) {
            addPassengerRow(table, 1, "-", "-", "-", safeEnum(booking.getStatus()), safeEnum(booking.getStatus()), formatAllotment(booking));
        } else {
            int index = 1;
            for (Passenger passenger : passengers) {
                addPassengerRow(
                        table,
                        index++,
                        safe(passenger.getFullName()),
                        String.valueOf(passenger.getAge()),
                        safe(passenger.getGender()),
                        safeEnum(passenger.getStatus()),
                        safeEnum(booking.getStatus()),
                        passengerAllotment(booking, passenger));
            }
        }

        document.add(table);
    }

    private void addPassengerRow(
            PdfPTable table,
            int index,
            String name,
            String age,
            String gender,
            String bookingStatus,
            String currentStatus,
            String allotment) {

        addTableCell(table, String.valueOf(index), Element.ALIGN_CENTER, false);
        addTableCell(table, name, Element.ALIGN_LEFT, true);
        addTableCell(table, age, Element.ALIGN_CENTER, false);
        addTableCell(table, gender, Element.ALIGN_CENTER, false);
        addTableCell(table, bookingStatus, Element.ALIGN_CENTER, false);
        addTableCell(table, currentStatus, Element.ALIGN_CENTER, false);
        addTableCell(table, allotment, Element.ALIGN_CENTER, true);
    }

    private void addPaymentAndVerificationBlock(Document document, Booking booking) throws Exception {
        PdfPTable wrapper = new PdfPTable(2);
        wrapper.setWidthPercentage(100);
        wrapper.setSpacingBefore(8);
        wrapper.setWidths(new float[] { 3.9f, 1.6f });

        PdfPCell paymentCell = new PdfPCell();
        paymentCell.setPadding(8);
        paymentCell.setBorder(Rectangle.BOX);
        paymentCell.setBorderColor(BORDER_COLOR);
        paymentCell.setBackgroundColor(WHITE);

        Paragraph tx = new Paragraph(
                "Transaction ID: " + transactionRef(booking),
                font(FontFactory.HELVETICA_BOLD, 9, BLACK));
        tx.setSpacingAfter(6);
        paymentCell.addElement(tx);

        Paragraph recovery = new Paragraph(
                "SouthRail service charge and payment recovery details are calculated as per reservation rules.",
                font(FontFactory.HELVETICA, 8, MUTED_TEXT));
        recovery.setSpacingAfter(6);
        paymentCell.addElement(recovery);

        Paragraph paymentTitle = new Paragraph(
                "Payment Details",
                font(FontFactory.HELVETICA_BOLD, 11, BLACK));
        paymentTitle.setSpacingAfter(4);
        paymentCell.addElement(paymentTitle);

        PdfPTable payment = new PdfPTable(2);
        payment.setWidthPercentage(100);
        payment.setWidths(new float[] { 3f, 1.2f });

        BigDecimal totalFare = booking.getTotalFare();
        addPaymentRow(payment, "Ticket Fare", formatFare(totalFare));
        addPaymentRow(payment, "SouthRail Convenience Fee", "Included");
        addPaymentRow(payment, "Travel Insurance Premium", "Not opted");
        addPaymentRow(payment, "Total Fare", formatFare(totalFare));

        paymentCell.addElement(payment);
        wrapper.addCell(paymentCell);

        PdfPCell verifyCell = new PdfPCell();
        verifyCell.setPadding(8);
        verifyCell.setBorder(Rectangle.BOX);
        verifyCell.setBorderColor(BORDER_COLOR);
        verifyCell.setBackgroundColor(SOFT_BG);

        Paragraph verifyTitle = new Paragraph(
                "Ticket Verification",
                font(FontFactory.HELVETICA_BOLD, 10, SOUTHRAIL_NAVY));
        verifyTitle.setAlignment(Element.ALIGN_CENTER);
        verifyTitle.setSpacingAfter(6);
        verifyCell.addElement(verifyTitle);

        PdfPTable pseudoQr = createVerificationPattern(booking);
        verifyCell.addElement(pseudoQr);

        Paragraph verifyText = new Paragraph(
                "Scan/verify using PNR\n" + safe(booking.getPnr()),
                font(FontFactory.HELVETICA_BOLD, 8, DARK_TEXT));
        verifyText.setAlignment(Element.ALIGN_CENTER);
        verifyText.setSpacingBefore(6);
        verifyCell.addElement(verifyText);

        wrapper.addCell(verifyCell);

        document.add(wrapper);
    }

    private PdfPTable createVerificationPattern(Booking booking) {
        PdfPTable grid = new PdfPTable(9);
        grid.setWidthPercentage(78);
        grid.setHorizontalAlignment(Element.ALIGN_CENTER);

        String seed = safe(booking.getPnr()) + transactionRef(booking) + safeEnum(booking.getStatus());

        for (int i = 0; i < 81; i++) {
            int value = Math.abs((seed + i).hashCode());
            boolean filled = value % 3 != 0 || i < 9 || i % 9 == 0 || i % 9 == 8 || i > 71;

            PdfPCell cell = new PdfPCell(new Phrase(" "));
            cell.setFixedHeight(8);
            cell.setPadding(0);
            cell.setBorder(Rectangle.NO_BORDER);
            cell.setBackgroundColor(filled ? BLACK : WHITE);
            grid.addCell(cell);
        }

        return grid;
    }

    private void addPaymentRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, font(FontFactory.HELVETICA, 8, DARK_TEXT)));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPadding(3);

        PdfPCell valueCell = new PdfPCell(new Phrase(value, font(FontFactory.HELVETICA_BOLD, 8, BLACK)));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPadding(3);
        valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addImportantInstructions(Document document) throws Exception {
        PdfPTable box = new PdfPTable(1);
        box.setWidthPercentage(100);
        box.setSpacingBefore(8);

        PdfPCell cell = new PdfPCell();
        cell.setPadding(8);
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(BORDER_COLOR);
        cell.setBackgroundColor(new Color(255, 252, 239));

        Paragraph title = new Paragraph(
                "Important Instructions",
                font(FontFactory.HELVETICA_BOLD, 10, BLACK));
        title.setSpacingAfter(4);
        cell.addElement(title);

        String[] points = {
                "This ticket is booked on a personal SouthRail user account. Sale or purchase of transferred tickets is not permitted.",
                "Prescribed original ID proof is required while travelling. Passenger may be treated as without ticket if valid ID proof is not carried.",
                "Departure and arrival timings are subject to operational changes. Please verify the latest status before travel.",
                "Cancellation, refund and charting rules are subject to SouthRail reservation policy.",
                "For assistance, use only official SouthRail support channels from your registered account."
        };

        for (String point : points) {
            Paragraph paragraph = new Paragraph(
                    "• " + point,
                    font(FontFactory.HELVETICA, 8, DARK_TEXT));
            paragraph.setSpacingAfter(2);
            cell.addElement(paragraph);
        }

        box.addCell(cell);
        document.add(box);
    }

    private void addFooter(Document document, Booking booking) throws Exception {
        PdfPTable footer = new PdfPTable(3);
        footer.setWidthPercentage(100);
        footer.setSpacingBefore(8);
        footer.setWidths(new float[] { 2.3f, 2.3f, 2.3f });

        footer.addCell(footerCell("Invoice Number", "SR-" + shortId(booking)));
        footer.addCell(footerCell("Platform", "SouthRail Reservation"));
        footer.addCell(footerCell("Generated", LocalDateTime.now().format(DATE_TIME_FORMAT)));

        footer.addCell(footerCell("PNR", safe(booking.getPnr())));
        footer.addCell(footerCell("Supplier", "SouthRail Digital Services"));
        footer.addCell(footerCell("Support", "Use in-app support ticket"));

        document.add(footer);

        Paragraph note = new Paragraph(
                "This is a system generated SouthRail Electronic Reservation Slip. No physical signature is required.",
                font(FontFactory.HELVETICA_BOLD, 8, MUTED_TEXT));
        note.setAlignment(Element.ALIGN_CENTER);
        note.setSpacingBefore(6);
        document.add(note);
    }

    private PdfPCell footerCell(String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(6);
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(SOFT_BORDER);
        cell.setBackgroundColor(WHITE);

        Paragraph paragraph = new Paragraph();
        paragraph.add(new Phrase(label + "\n", font(FontFactory.HELVETICA_BOLD, 7, MUTED_TEXT)));
        paragraph.add(new Phrase(value, font(FontFactory.HELVETICA, 8, DARK_TEXT)));
        cell.addElement(paragraph);

        return cell;
    }

    private void addSectionTitle(Document document, String text, Color color) throws Exception {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);
        table.setSpacingBefore(8);

        PdfPCell cell = new PdfPCell(new Phrase(text, font(FontFactory.HELVETICA_BOLD, 10, WHITE)));
        cell.setBackgroundColor(color);
        cell.setPadding(7);
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(BORDER_COLOR);

        table.addCell(cell);
        document.add(table);
    }

    private void addTableHeader(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font(FontFactory.HELVETICA_BOLD, 8, BLACK)));
        cell.setBackgroundColor(SOUTHRAIL_LIGHT_BLUE);
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(BORDER_COLOR);
        cell.setPadding(5);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, int align, boolean bold) {
        PdfPCell cell = new PdfPCell(new Phrase(
                safe(text),
                font(bold ? FontFactory.HELVETICA_BOLD : FontFactory.HELVETICA, 8, DARK_TEXT)));
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(SOFT_BORDER);
        cell.setPadding(5);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private void addThinLine(Document document, Color color, float height, float spacingAfter) throws Exception {
        PdfPTable line = new PdfPTable(1);
        line.setWidthPercentage(100);

        PdfPCell cell = new PdfPCell(new Phrase(""));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setBackgroundColor(color);
        cell.setFixedHeight(height);

        line.addCell(cell);
        line.setSpacingAfter(spacingAfter);
        document.add(line);
    }

    private PdfPCell noBorderCell(String text, float padding) {
        PdfPCell cell = new PdfPCell(new Phrase(text));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(padding);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }

    private Font font(String family, float size, Color color) {
        return FontFactory.getFont(family, size, color);
    }

    private Color statusColor(Booking booking) {
        String status = safeEnum(booking.getStatus());

        if (status.contains("CONFIRMED")) {
            return SOUTHRAIL_GREEN;
        }

        if (status.contains("CANCELLED")) {
            return SOUTHRAIL_RED;
        }

        if (status.contains("WAIT") || status.contains("WL") || status.contains("RAC")) {
            return SOUTHRAIL_ORANGE;
        }

        return SOUTHRAIL_BLUE;
    }

    private String trainNoName(Booking booking) {
        if (booking.getTrain() == null) {
            return "-";
        }

        return safe(booking.getTrain().getNumber())
                + " / "
                + safe(booking.getTrain().getName());
    }

    private String stationCode(Station station) {
        return station == null ? "-" : safe(station.getCode());
    }

    private String stationName(Station station) {
        return station == null ? "-" : safe(station.getName());
    }

    private String formatStation(Station station) {
        if (station == null) {
            return "-";
        }

        return safe(station.getCode())
                + " - "
                + safe(station.getName())
                + ", "
                + safe(station.getCity());
    }

    private String formatJourneyDate(Booking booking) {
        if (booking.getJourneyDate() == null) {
            return "-";
        }

        return booking.getJourneyDate().format(JOURNEY_DATE_FORMAT);
    }

    private String formatInstant(Instant instant) {
        if (instant == null) {
            return "-";
        }

        return BOOKING_TIME_FORMAT.format(instant);
    }

    private String formatFare(BigDecimal fare) {
        if (fare == null) {
            return "-";
        }

        return "Rs. " + fare;
    }

    private String formatAllotment(Booking booking) {
        String label = safe(booking.getReservationLabel());

        if (booking.getQueuePosition() != null) {
            return label + " / " + booking.getQueuePosition();
        }

        return label;
    }

    private String passengerAllotment(Booking booking, Passenger passenger) {
        String allotment = formatAllotment(booking);

        if (booking != null
                && booking.getStatus() == BookingStatus.CONFIRMED
                && passenger != null
                && passenger.getBerthPreference() != null
                && !passenger.getBerthPreference().isBlank()) {
            return allotment + " / " + passenger.getBerthPreference();
        }

        return allotment;
    }

    private String transactionRef(Booking booking) {
        return "SR"
                + safe(booking.getPnr())
                + shortId(booking);
    }

    private String shortId(Booking booking) {
        if (booking == null || booking.getId() == null) {
            return "000000";
        }

        String id = booking.getId().toString().replace("-", "").toUpperCase();
        return id.substring(0, Math.min(10, id.length()));
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String safeEnum(Enum<?> value) {
        return value == null ? "-" : value.name();
    }
}