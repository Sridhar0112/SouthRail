package com.southrail.reservation.train;

import com.southrail.reservation.booking.inventory.SeatAllocationService;
import com.southrail.reservation.booking.FareCalculationService;

import com.southrail.reservation.train.dto.TrainDtos;
import com.southrail.reservation.train.RouteStop;
import com.southrail.reservation.train.Train;
import com.southrail.reservation.shared.web.error.ApiException;
import com.southrail.reservation.train.RouteStopRepository;
import com.southrail.reservation.train.StationRepository;
import com.southrail.reservation.train.TrainRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrainService {
  private final TrainRepository trains;
  private final RouteStopRepository routeStops;
  private final StationRepository stations;
  private final SeatAllocationService seatAllocationService;
  private final FareCalculationService fareCalculationService;

  public TrainService(TrainRepository trains, RouteStopRepository routeStops, StationRepository stations,
      SeatAllocationService seatAllocationService, FareCalculationService fareCalculationService) {
    this.trains = trains;
    this.routeStops = routeStops;
    this.stations = stations;
    this.seatAllocationService = seatAllocationService;
    this.fareCalculationService = fareCalculationService;
  }

  @Transactional(readOnly = true)
  public List<TrainDtos.TrainSearchResult> search(TrainDtos.SearchRequest request) {
    return routeStops.searchRoutes(request.getSource(), request.getDestination()).stream()
            .map(row -> toSearchResult((RouteStop) row[0], (RouteStop) row[1], request.getTravelClass(), request.getJourneyDate()))
            .collect(Collectors.toList());
  }

  public Page<Train> keyword(String query, Pageable pageable) {
    return trains.findByNumberContainingIgnoreCaseOrNameContainingIgnoreCase(query, query, pageable);
  }

  public Page<TrainDtos.StationOption> stationSuggestions(String query, Pageable pageable) {
    return stations.findByCodeContainingIgnoreCaseOrNameContainingIgnoreCaseOrCityContainingIgnoreCase(query, query, query, pageable)
        .map(station -> new TrainDtos.StationOption(station.getCode(), station.getName(), station.getCity(), station.getState()));
  }

  @Cacheable(value = "trainDetails", key = "#trainId.toString()")
  @Transactional(readOnly = true)
  public TrainDtos.TrainDetail detail(UUID trainId) {
    Train train = trains.findById(trainId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Train not found"));

    List<TrainDtos.RouteStopView> route = routeStops.findByTrainOrderByStopOrderAsc(train).stream()
            .map(stop -> new TrainDtos.RouteStopView(
                    stop.getStation().getCode(),
                    stop.getStation().getName(),
                    stop.getStopOrder(),
                    stop.getArrivalTime(),
                    stop.getDepartureTime(),
                    stop.getDistanceKm(),
                    stop.getPlatform()))
            .collect(Collectors.toList());

    return new TrainDtos.TrainDetail(
            train.getId().toString(),
            train.getNumber(),
            train.getName(),
            train.getCategory(),
            route);
  }

  private TrainDtos.TrainSearchResult toSearchResult(RouteStop source, RouteStop destination, String travelClass, LocalDate journeyDate) {
    Train train = source.getTrain();
    long minutes = calculateDurationMinutes(source, destination);
    BigDecimal fare = calculateFare(source, destination, travelClass);
    int availableSeats = calculateAvailableSeats(train, journeyDate, travelClass);

    return new TrainDtos.TrainSearchResult(
        train.getId().toString(),
        train.getNumber(),
        train.getName(),
        source.getStation().getCode(),
        destination.getStation().getCode(),
        source.getDepartureTime(),
        destination.getArrivalTime(),
        (int) minutes,
        availableSeats,
        fare,
        availabilityLabel(availableSeats));
  }

  private long calculateDurationMinutes(RouteStop source, RouteStop destination) {
    java.time.LocalDate serviceDate = java.time.LocalDate.of(2000, 1, 1);
    java.time.LocalDateTime departure = serviceDate.plusDays(source.getDayOffset())
        .atTime(source.getDepartureTime());
    java.time.LocalDateTime arrival = serviceDate.plusDays(destination.getDayOffset())
        .atTime(destination.getArrivalTime());
    return Duration.between(departure, arrival).toMinutes();
  }

  private BigDecimal calculateFare(RouteStop source, RouteStop destination, String travelClass) {
    int distance = Math.max(1, destination.getDistanceKm() - source.getDistanceKm());
    return fareCalculationService.quote(distance, travelClass, 1).total();
  }

  private int calculateAvailableSeats(Train train, LocalDate journeyDate, String travelClass) {
    return seatAllocationService.getAvailableSeatCount(train, journeyDate, travelClass);
  }

  private String availabilityLabel(int availableSeats) {
    if (availableSeats == 0) {
      return "Sold out";
    }
    if (availableSeats < 10) {
      return "Limited seats";
    }
    return "Available";
  }

}
