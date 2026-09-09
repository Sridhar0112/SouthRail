package com.southrail.reservation.train;

import com.southrail.reservation.train.Train;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrainRepository extends JpaRepository<Train, UUID> {
  Optional<Train> findByNumber(String number);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from Train t where t.id = :id")
  Optional<Train> findByIdForUpdate(@Param("id") UUID id);
  Page<Train> findByNumberContainingIgnoreCaseOrNameContainingIgnoreCase(String number, String name, Pageable pageable);
}
