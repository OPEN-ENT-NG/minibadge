package fr.openent.minibadge.model;

import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.*;

/** Epic D, Task 6: GET /global-settings tells the client whether to show the certificate button. */
@RunWith(VertxUnitRunner.class)
public class GlobalSettingsTest {

    @Test
    public void testPdfExportEnabledIsExposed() {
        GlobalSettings settings = new GlobalSettings(new JsonObject().put("pageSize", 20));

        assertFalse(settings.toJson().getBoolean("pdfExportEnabled"));
        assertTrue(settings.setPdfExportEnabled(true).toJson().getBoolean("pdfExportEnabled"));
        assertEquals(20, (int) settings.toJson().getInteger("pageSize"));
    }
}
