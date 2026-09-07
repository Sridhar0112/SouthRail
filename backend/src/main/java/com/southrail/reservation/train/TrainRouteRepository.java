package com.southrail.reservation.train;

import com.southrail.reservation.train.TrainRoute;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainRouteRepository extends JpaRepository<TrainRoute, UUID> {}
