package org.chaveamento.repository;

import org.chaveamento.model.time.Time;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeRepository extends JpaRepository<Time, Long> {
}
