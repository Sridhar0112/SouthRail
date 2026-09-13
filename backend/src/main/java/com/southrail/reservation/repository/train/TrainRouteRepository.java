package com.southrail.reservation.repository.train;

import com.southrail.reservation.entity.train.TrainRoute;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainRouteRepository extends JpaRepository<TrainRoute, UUID> {}
