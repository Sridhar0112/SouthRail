package com.southrail.reservation.service;

import com.southrail.reservation.dto.TrainDtos;
import com.southrail.reservation.entity.RouteStop;
import com.southrail.reservation.entity.Train;
import com.southrail.reservation.exception.ApiException;
import com.southrail.reservation.repository.RouteStopRepository;
import com.southrail.reservation.repository.StationRepository;
import com.southrail.reservation.repository.TrainRepository;
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

  public TrainService(TrainRepository trains, RouteStopRepository routeStops, StationRepository stations,
      SeatAllocationService seatAllocationService) {
    this.trains = trains;
    this.routeStops = routeStops;
    this.stations = stations;
    this.seatAllocationService = seatAllocationService;
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
    int availableSeats = calculateAvailableSeats(train.getId(), journeyDate, travelClass);

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
    long minutes = Duration.between(source.getDepartureTime(), destination.getArrivalTime()).toMinutes();
    if (minutes < 0) {
      minutes += 24 * 60L;
    }
    return minutes;
  }

  private BigDecimal calculateFare(RouteStop source, RouteStop destination, String travelClass) {
    int distance = Math.max(1, destination.getDistanceKm() - source.getDistanceKm());
    return BigDecimal.valueOf(distance).multiply(classRate(travelClass));
  }

  private int calculateAvailableSeats(UUID trainId, LocalDate journeyDate, String travelClass) {
    Train train = trains.findById(trainId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Train not found"));
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

  private BigDecimal classRate(String travelClass) {
    switch (travelClass.toUpperCase()) {
      case "1A":
        return BigDecimal.valueOf(4.20);
      case "2A":
        return BigDecimal.valueOf(2.80);
      case "3A":
        return BigDecimal.valueOf(2.00);
      case "CC":
        return BigDecimal.valueOf(1.70);
      case "SL":
        return BigDecimal.valueOf(0.75);
      default:
        return BigDecimal.valueOf(0.45);
    }
  }
}
