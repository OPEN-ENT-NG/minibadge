package fr.cgi.minibadge.service;

import fr.cgi.minibadge.model.Statistics;
import io.vertx.core.Future;

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
     * @param  structureIds List of structure From which we want to aggregate statistics
     * @return Future containing current global statistics
     */
    Future<Statistics> getGlobalStatistics(List<String> structureIds);

    /**
     * Get specific statistics
     *
     * @return Future containing current some specific structures statistics
     */
    Future<Statistics> getSpecificStructuresStatistics();

    /**
     * Get specific statistics
     *
     * @param  structureIds List of structure From which we want to aggregate statistics
     * @return Future containing current some specific structures statistics
     */
    Future<Statistics> getSpecificStructuresStatistics(List<String> structureIds);
}
