package com.southrail.reservation.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.southrail.reservation.entity.Booking;
import com.southrail.reservation.entity.RoleName;
import com.southrail.reservation.entity.User;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.BookingRepository;
import com.southrail.reservation.repository.UserRepository;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.southrail.reservation.entity.Passenger;
import com.southrail.reservation.repository.PassengerRepository;
import java.util.Comparator;
import java.util.List;

@Service
public class TicketPdfService {

    private static final DateTimeFormatter DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final PassengerRepository passengerRepository;

    public TicketPdfService(BookingRepository bookingRepository, UserRepository userRepository, AuditLogService auditLogService, PassengerRepository passengerRepository) {
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
                .sorted(Comparator.comparing(Passenger::getCreatedAt))
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

    private byte[] buildPdf(Booking booking, List<Passenger> passengers)  {
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Document document = new Document(PageSize.A4, 36, 36, 32, 32);
            PdfWriter.getInstance(document, outputStream);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(25, 118, 210));
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.DARK_GRAY);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE);

            Paragraph title = new Paragraph("SouthRail", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4);
            document.add(title);

            Paragraph subtitle = new Paragraph("Railway Reservation Ticket", subtitleFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(12);
            document.add(subtitle);

            Paragraph generatedAt = new Paragraph(
                    "Generated on: " + LocalDateTime.now().format(DATE_TIME_FORMAT),
                    normalFont);
            generatedAt.setAlignment(Element.ALIGN_RIGHT);
            generatedAt.setSpacingAfter(14);
            document.add(generatedAt);

            addSectionHeader(document, "Booking Details", sectionFont);
            PdfPTable bookingTable = twoColumnTable();
            addRow(bookingTable, "PNR", safe(booking.getPnr()), boldFont, normalFont);
            addRow(bookingTable, "Booking Status", safeEnum(booking.getStatus()), boldFont, normalFont);
            addRow(bookingTable, "Reservation Label", safe(booking.getReservationLabel()), boldFont, normalFont);
            addRow(bookingTable, "Queue Position", booking.getQueuePosition() == null ? "-" : String.valueOf(booking.getQueuePosition()), boldFont, normalFont);
            addRow(bookingTable, "Journey Date", booking.getJourneyDate() == null ? "-" : booking.getJourneyDate().toString(), boldFont, normalFont);
            addRow(bookingTable, "Travel Class", safe(booking.getTravelClass()), boldFont, normalFont);
            addRow(bookingTable, "Quota", safe(booking.getQuota()), boldFont, normalFont);
            addRow(bookingTable, "Total Fare", booking.getTotalFare() == null ? "-" : "Rs. " + booking.getTotalFare(), boldFont, normalFont);
            document.add(bookingTable);

            addGap(document);

            addSectionHeader(document, "Train Details", sectionFont);
            PdfPTable trainTable = twoColumnTable();
            addRow(trainTable, "Train Number", booking.getTrain() == null ? "-" : safe(booking.getTrain().getNumber()), boldFont, normalFont);
            addRow(trainTable, "Train Name", booking.getTrain() == null ? "-" : safe(booking.getTrain().getName()), boldFont, normalFont);
            addRow(trainTable, "Category", booking.getTrain() == null ? "-" : safe(booking.getTrain().getCategory()), boldFont, normalFont);
            addRow(trainTable, "From", formatStation(booking.getSourceStation()), boldFont, normalFont);
            addRow(trainTable, "To", formatStation(booking.getDestinationStation()), boldFont, normalFont);
            document.add(trainTable);

            addGap(document);

            addSectionHeader(document, "Passenger Details", sectionFont);
            PdfPTable passengerTable = new PdfPTable(4);
            passengerTable.setWidthPercentage(100);
            passengerTable.setWidths(new float[] { 3f, 2f, 2f, 3f });

            addHeaderCell(passengerTable, "Passenger", boldFont);
            addHeaderCell(passengerTable, "Status", boldFont);
            addHeaderCell(passengerTable, "Class", boldFont);
            addHeaderCell(passengerTable, "Allotment", boldFont);

            if (passengers == null || passengers.isEmpty()) {
                addCell(passengerTable, "-", normalFont);
                addCell(passengerTable, safeEnum(booking.getStatus()), normalFont);
                addCell(passengerTable, safe(booking.getTravelClass()), normalFont);
                addCell(passengerTable, formatAllotment(booking), normalFont);
            } else {
                for (Passenger passenger : passengers) {
                    addCell(passengerTable, safe(passenger.getFullName()), normalFont);
                    addCell(passengerTable, safeEnum(passenger.getStatus()), normalFont);
                    addCell(passengerTable, safe(booking.getTravelClass()), normalFont);
                    addCell(passengerTable, formatAllotment(booking), normalFont);
                }
            }
            document.add(passengerTable);

            addGap(document);

            Paragraph note = new Paragraph(
                    "This is a system generated SouthRail ticket. Please carry a valid ID proof during travel. "
                            + "Cancellation and refund are subject to SouthRail rules.",
                    normalFont);
            note.setAlignment(Element.ALIGN_CENTER);
            note.setSpacingBefore(18);
            document.add(note);

            document.close();
            return outputStream.toByteArray();

        } catch (Exception ex) {
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to generate ticket PDF");
        }
    }

    private PdfPTable twoColumnTable() {
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingBefore(6);
        return table;
    }

    private void addSectionHeader(Document document, String text, Font font) throws Exception {
        PdfPTable table = new PdfPTable(1);
        table.setWidthPercentage(100);

        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(25, 118, 210));
        cell.setPadding(8);
        cell.setBorder(Rectangle.NO_BORDER);

        table.addCell(cell);
        document.add(table);
    }

    private void addRow(
            PdfPTable table,
            String label,
            String value,
            Font labelFont,
            Font valueFont) {

        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setPadding(7);
        labelCell.setBackgroundColor(new Color(245, 247, 250));

        PdfPCell valueCell = new PdfPCell(new Phrase(value, valueFont));
        valueCell.setPadding(7);

        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(7);
        cell.setBackgroundColor(new Color(230, 240, 255));
        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(7);
        table.addCell(cell);
    }

    private void addGap(Document document) throws Exception {
        Paragraph gap = new Paragraph(" ");
        gap.setSpacingAfter(6);
        document.add(gap);
    }

    private String formatStation(com.southrail.reservation.entity.Station station) {
        if (station == null) {
            return "-";
        }

        return safe(station.getCode())
                + " - "
                + safe(station.getName())
                + ", "
                + safe(station.getCity());
    }

    private String formatAllotment(Booking booking) {
        String label = safe(booking.getReservationLabel());

        if (booking.getQueuePosition() != null) {
            return label + " " + booking.getQueuePosition();
        }

        return label;
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private String safeEnum(Enum<?> value) {
        return value == null ? "-" : value.name();
    }
}