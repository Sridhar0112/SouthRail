package com.southrail.reservation.repository;

import com.southrail.reservation.entity.Coach;
import com.southrail.reservation.entity.Train;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CoachRepository extends JpaRepository<Coach, UUID> {
  @Query("""
      select c
      from Coach c
      where c.train = :train and upper(c.travelClass) = upper(:travelClass)
      order by c.coachCode asc
      """)
  List<Coach> findByTrainAndTravelClassOrderByCoachCode(
      @Param("train") Train train,
      @Param("travelClass") String travelClass);

  @Query("""
      select coalesce(sum(c.capacity), 0)
      from Coach c
      where c.train.id = :trainId and upper(c.travelClass) = upper(:travelClass)
      """)
  int totalCapacity(@Param("trainId") UUID trainId, @Param("travelClass") String travelClass);
}
