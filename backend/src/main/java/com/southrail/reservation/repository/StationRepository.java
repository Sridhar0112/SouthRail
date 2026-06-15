package com.southrail.reservation.repository;

import com.southrail.reservation.entity.Station;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StationRepository extends JpaRepository<Station, UUID> {
  Optional<Station> findByCodeIgnoreCase(String code);
  Page<Station> findByCodeContainingIgnoreCaseOrNameContainingIgnoreCaseOrCityContainingIgnoreCase(String code, String name, String city, Pageable pageable);
}
