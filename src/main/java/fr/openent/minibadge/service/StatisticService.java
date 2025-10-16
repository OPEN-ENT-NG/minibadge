package fr.openent.minibadge.service;

import fr.openent.minibadge.model.Statistics;
import io.vertx.core.Future;

import java.time.LocalDate;
import java.util.List;

public interface StatisticService {

    /**
     * Get global statistics
     *
     * @return Future containing current global statistics
     */
    Future<Statistics> getGlobalStatistics();

    /**
     * Get global statistics
     *
     * @param structureIds List of structure From which we want to aggregate statistics
     * @param minDate Filter statistics from this date
     * @return Future containing current global statistics
     */
    Future<Statistics> getGlobalStatistics(List<String> structureIds, LocalDate minDate);

    /**
     * Get specific statistics
     *
     * @return Future containing current some specific structures statistics
     */
    Future<Statistics> getSpecificStructuresStatistics();

    /**
     * Get specific statistics
     *
     * @param structureIds List of structure From which we want to aggregate statistics
     * @param minDate Filter statistics from this date
     * @return Future containing current some specific structures statistics
     */
    Future<Statistics> getSpecificStructuresStatistics(List<String> structureIds, LocalDate minDate);
}
