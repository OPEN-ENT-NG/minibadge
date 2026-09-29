package fr.openent.minibadge.controller;

import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.junit.Assert.*;

/** Epic D, Task 1: GET /config must not hand the PDF service token to the admins who can read it. */
@RunWith(VertxUnitRunner.class)
public class ConfigControllerTest {

    @Test
    public void testThePdfServiceTokenIsMaskedAndTheConfigurationLeftUntouched() {
        JsonObject config = new JsonObject()
                .put("db-schema", "minibadge")
                .put("node-pdf-generator", new JsonObject()
                        .put("pdf-connector-id", "exportpdf")
                        .put("auth", "s3cr3t")
                        .put("url", "http://pdf:3000"));

        JsonObject safe = ConfigController.safeConfig(config);

        assertEquals(ConfigController.MASK, safe.getJsonObject("node-pdf-generator").getString("auth"));
        assertEquals("http://pdf:3000", safe.getJsonObject("node-pdf-generator").getString("url"));
        assertEquals("minibadge", safe.getString("db-schema"));
        assertFalse(safe.encode().contains("s3cr3t"));
        // The running configuration keeps its token (the PDF client still needs it).
        assertEquals("s3cr3t", config.getJsonObject("node-pdf-generator").getString("auth"));
    }

    @Test
    public void testAConfigurationWithoutPdfServiceIsReturnedAsIs() {
        JsonObject config = new JsonObject().put("db-schema", "minibadge");

        assertEquals(config, ConfigController.safeConfig(config));

        JsonObject noAuth = new JsonObject().put("node-pdf-generator", new JsonObject().put("url", "http://pdf:3000"));
        assertFalse(ConfigController.safeConfig(noAuth).getJsonObject("node-pdf-generator").containsKey("auth"));
    }

    @Test
    public void testAPdfServiceValueThatIsNotAnObjectIsMaskedAsAWhole() {
        JsonObject config = new JsonObject()
                .put("db-schema", "minibadge")
                .put("node-pdf-generator", "{\"auth\":\"s3cr3t\",\"url\":\"http://pdf:3000\"}");

        JsonObject safe = ConfigController.safeConfig(config);

        assertEquals(ConfigController.MASK, safe.getValue("node-pdf-generator"));
        assertFalse(safe.encode().contains("s3cr3t"));
        assertEquals("minibadge", safe.getString("db-schema"));
        assertTrue(config.getString("node-pdf-generator").contains("s3cr3t"));

        JsonObject array = new JsonObject().put("node-pdf-generator", new io.vertx.core.json.JsonArray().add("s3cr3t"));
        assertEquals(ConfigController.MASK, ConfigController.safeConfig(array).getValue("node-pdf-generator"));
    }
}
