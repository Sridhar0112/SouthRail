package com.southrail.reservation.controller;

import com.southrail.reservation.dto.TrainDtos;
import com.southrail.reservation.entity.Train;
import com.southrail.reservation.service.TrainService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/trains")
public class TrainController {
  private final TrainService trainService;

  public TrainController(TrainService trainService) {
    this.trainService = trainService;
  }

  @PostMapping("/search")
  List<TrainDtos.TrainSearchResult> search(@Valid @RequestBody TrainDtos.SearchRequest request) {
    return trainService.search(request);
  }

  @GetMapping
  Page<Train> keyword(@RequestParam(defaultValue = "") String q, Pageable pageable) {
    return trainService.keyword(q, pageable);
  }

  @GetMapping("/{trainId}")
  TrainDtos.TrainDetail detail(@PathVariable UUID trainId) {
    return trainService.detail(trainId);
  }

  @GetMapping("/stations")
  Page<TrainDtos.StationOption> stationSuggestions(@RequestParam(defaultValue = "") String q, Pageable pageable) {
    return trainService.stationSuggestions(q, pageable);
  }
}
