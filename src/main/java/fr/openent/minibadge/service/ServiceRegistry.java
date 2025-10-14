package fr.openent.minibadge.service;

import fr.openent.minibadge.service.impl.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public final class ServiceRegistry {

    private static final Map<Class<?>, Object> SERVICES = new ConcurrentHashMap<>();

    private static boolean initialized = false;

    /**
     * Initialise tous les services dans l'ordre des dépendances.
     */
    public static synchronized void initServices() {
        if (initialized) return;

        SERVICES.put(UserService.class, DefaultUserService.getInstance());
        SERVICES.put(SettingService.class, DefaultSettingService.getInstance());
        SERVICES.put(BadgeService.class, DefaultBadgeService.getInstance());
        SERVICES.put(BadgeAssignedStructureService.class, DefaultBadgeAssignedStructureService.getInstance());
        SERVICES.put(BadgeAssignedService.class, DefaultBadgeAssignedService.getInstance());
        SERVICES.put(BadgeCategoryService.class, DefaultBadgeCategoryService.getInstance());
        SERVICES.put(BadgeTypeSettingService.class, DefaultBadgeTypeSettingService.getInstance());
        SERVICES.put(BadgeTypeService.class, DefaultBadgeTypeService.getInstance());
        SERVICES.put(StructureService.class, DefaultStructureService.getInstance());
        SERVICES.put(StatisticService.class, DefaultStatisticService.getInstance());
        SERVICES.put(NotifyService.class, DefaultNotifyService.getInstance());

        initialized = true;
    }


    // Private constructor to prevent instantiation
    private ServiceRegistry() {}

    /**
     * Récupère le service singleton pour l'interface ou classe donnée.
     * Exemple : UserService userService = ServiceRegistry.getService(UserService.class);
     */
    @SuppressWarnings("unchecked")
    public static <T> T getService(Class<T> clazz) {
        Object service = SERVICES.get(clazz);
        if (service == null) {
            throw new IllegalArgumentException("Service not found for class: " + clazz.getName());
        }
        return (T) service;
    }

    /**
     * Enregistre un service singleton pour l'interface ou classe donnée.
     * Utile pour les tests ou la configuration personnalisée.
     * Exemple : ServiceRegistry.registerService(UserService.class, myUserServiceInstance);
     */
    public static <T> void registerService(Class<T> clazz, T instance) {
        SERVICES.put(clazz, instance);
    }

}