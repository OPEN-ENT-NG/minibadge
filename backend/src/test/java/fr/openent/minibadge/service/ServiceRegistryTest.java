package fr.openent.minibadge.service;

import org.junit.Test;

import java.util.Arrays;
import java.util.List;

import static org.junit.Assert.assertNotNull;

/**
 * Services resolve their collaborators through ServiceRegistry when their singleton is built, so a
 * service registered after one of its consumers makes the module fail to deploy
 * (ExceptionInInitializerError: "Service not found for class ..."). The other service tests register
 * mocks by hand and never exercise the real registration order, hence this test.
 */
public class ServiceRegistryTest {

    @Test
    public void initServices_registersEveryServiceWithoutOrderingError() {
        ServiceRegistry.initServices();

        List<Class<?>> services = Arrays.asList(
                PdfExportService.class,
                BadgeProtagonistSettingService.class,
                UserService.class,
                SettingService.class,
                BadgeService.class,
                BadgeAssignedStructureService.class,
                BadgeAssignedService.class,
                BadgeCategoryService.class,
                BadgeTypeSettingService.class,
                BadgeTypeService.class,
                StructureService.class,
                StatisticService.class,
                NotifyService.class
        );
        for (Class<?> service : services) {
            assertNotNull(service.getSimpleName(), ServiceRegistry.getService(service));
        }
    }
}
