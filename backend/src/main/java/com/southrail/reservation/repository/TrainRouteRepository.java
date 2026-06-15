package com.southrail.reservation.repository;

import com.southrail.reservation.entity.TrainRoute;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainRouteRepository extends JpaRepository<TrainRoute, UUID> {}
