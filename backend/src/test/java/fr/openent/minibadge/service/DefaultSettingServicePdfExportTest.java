package fr.openent.minibadge.service;

import fr.openent.minibadge.Minibadge;
import fr.openent.minibadge.model.Config;
import fr.openent.minibadge.model.GlobalSettings;
import fr.openent.minibadge.service.impl.DefaultSettingService;
import fr.openent.minibadge.test.FakeSqlReply;
import io.vertx.core.Future;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.sql.Sql;
import org.entcore.common.user.UserInfos;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.powermock.reflect.Whitebox;

import static org.junit.Assert.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Epic D, Task 6: GET /global-settings carries the startup decision of the PDF export. */
@RunWith(VertxUnitRunner.class)
public class DefaultSettingServicePdfExportTest {

    private PdfExportService pdfExportService;
    private SettingService service;
    private UserInfos user;

    @Before
    public void setUp() {
        Minibadge.minibadgeConfig = new Config();
        pdfExportService = mock(PdfExportService.class);
        ServiceRegistry.registerService(PdfExportService.class, pdfExportService);
        service = DefaultSettingService.getInstance();
        Sql sql = mock(Sql.class);
        FakeSqlReply.answer(sql, query -> FakeSqlReply.rows(new JsonObject().put("day", 1)));
        Whitebox.setInternalState(service, "sql", sql);
        Whitebox.setInternalState(service, "pdfExportService", pdfExportService);
        user = new UserInfos();
        user.setUserId("user1");
    }

    @Test
    public void testPdfExportEnabledFollowsTheExportService() {
        when(pdfExportService.isEnabled()).thenReturn(true);
        Future<GlobalSettings> enabled = service.getGlobalSettings(user);
        assertTrue(enabled.succeeded());
        assertTrue(enabled.result().toJson().getBoolean("pdfExportEnabled"));

        when(pdfExportService.isEnabled()).thenReturn(false);
        Future<GlobalSettings> disabled = service.getGlobalSettings(user);
        assertFalse(disabled.result().toJson().getBoolean("pdfExportEnabled"));
    }
}
