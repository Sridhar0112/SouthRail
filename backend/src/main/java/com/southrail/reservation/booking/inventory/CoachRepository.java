package com.southrail.reservation.booking.inventory;

import com.southrail.reservation.booking.inventory.Coach;
import com.southrail.reservation.train.Train;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CoachRepository extends JpaRepository<Coach, UUID> {
  @Query("select c\n" +
                "from Coach c\n" +
                "where c.train = :train and upper(c.travelClass) = upper(:travelClass)\n" +
                "order by c.coachCode asc\n")
  List<Coach> findByTrainAndTravelClassOrderByCoachCode(
      @Param("train") Train train,
      @Param("travelClass") String travelClass);

  @Query("select coalesce(sum(c.capacity), 0)\n" +
                "from Coach c\n" +
                "where c.train.id = :trainId and upper(c.travelClass) = upper(:travelClass)\n")
  int totalCapacity(@Param("trainId") UUID trainId, @Param("travelClass") String travelClass);
}
