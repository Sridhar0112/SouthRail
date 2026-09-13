package com.southrail.reservation.train;

import com.southrail.reservation.train.Train;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainRepository extends JpaRepository<Train, UUID> {
  Optional<Train> findByNumber(String number);
  Page<Train> findByNumberContainingIgnoreCaseOrNameContainingIgnoreCase(String number, String name, Pageable pageable);
}
