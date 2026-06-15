package com.southrail.reservation.repository;

import com.southrail.reservation.entity.RouteStop;
import com.southrail.reservation.entity.Station;
import com.southrail.reservation.entity.Train;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RouteStopRepository extends JpaRepository<RouteStop, UUID> {
  List<RouteStop> findByTrainOrderByStopOrderAsc(Train train);

  Optional<RouteStop> findFirstByTrainAndStationOrderByStopOrderAsc(Train train, Station station);

  @Query("""
      select source, dest from RouteStop source
      join RouteStop dest on dest.train = source.train
      where upper(source.station.code) = upper(:source)
        and upper(dest.station.code) = upper(:destination)
        and source.stopOrder < dest.stopOrder
        and source.train.active = true
      order by source.departureTime asc
      """)
  List<Object[]> searchRoutes(@Param("source") String source, @Param("destination") String destination);
}
