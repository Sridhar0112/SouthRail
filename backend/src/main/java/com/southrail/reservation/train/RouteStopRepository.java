package com.southrail.reservation.train;

import com.southrail.reservation.train.RouteStop;
import com.southrail.reservation.train.Station;
import com.southrail.reservation.train.Train;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RouteStopRepository extends JpaRepository<RouteStop, UUID> {
  List<RouteStop> findByTrainOrderByStopOrderAsc(Train train);

  Optional<RouteStop> findFirstByTrainAndStationOrderByStopOrderAsc(Train train, Station station);

  @Query("select source, dest from RouteStop source\n" +
                "join RouteStop dest on dest.train = source.train\n" +
                "where upper(source.station.code) = upper(:source)\n" +
                "  and upper(dest.station.code) = upper(:destination)\n" +
                "  and source.stopOrder < dest.stopOrder\n" +
                "  and source.train.active = true\n" +
                "order by source.departureTime asc\n")
  List<Object[]> searchRoutes(@Param("source") String source, @Param("destination") String destination);
}
