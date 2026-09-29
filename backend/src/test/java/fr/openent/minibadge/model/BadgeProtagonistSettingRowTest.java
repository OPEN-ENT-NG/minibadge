package fr.openent.minibadge.model;

import fr.openent.minibadge.helper.ModelHelper;
import fr.wseduc.webutils.Either;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.unit.Async;
import io.vertx.ext.unit.TestContext;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.List;

/**
 * Task 1 validation: raw badge_protagonist_setting row mapping (snake_case SQL columns
 * in, the row's own camelCase accessors out) - the row shape produced by
 * DefaultBadgeProtagonistSettingRepository and consumed by DefaultBadgeProtagonistSettingService.
 */
@RunWith(VertxUnitRunner.class)
public class BadgeProtagonistSettingRowTest {

    @Test
    public void testSetMapsSnakeCaseSqlColumns() {
        BadgeProtagonistSettingRow row = new BadgeProtagonistSettingRow(new JsonObject()
                .put("id", 1L)
                .put("protagonist_type_id", "Teacher")
                .put("protagonist_type", "SENDER_PROFILE"));

        org.junit.Assert.assertEquals(Long.valueOf(1L), row.id());
        org.junit.Assert.assertEquals("Teacher", row.protagonistTypeId());
        org.junit.Assert.assertEquals("SENDER_PROFILE", row.protagonistType());
    }

    @Test
    public void testSqlResultToModelMapsMultipleRows(TestContext ctx) {
        Async async = ctx.async();
        Promise<List<BadgeProtagonistSettingRow>> promise = Promise.promise();

        promise.future().onSuccess(rows -> {
            ctx.assertEquals(2, rows.size());
            ctx.assertEquals("Student", rows.get(0).protagonistTypeId());
            ctx.assertEquals("TARGET_PROFILE", rows.get(0).protagonistType());
            ctx.assertEquals("Teacher", rows.get(1).protagonistTypeId());
            ctx.assertEquals("SENDER_PROFILE", rows.get(1).protagonistType());
            async.complete();
        });

        final Handler<Either<String, JsonArray>> handler =
                ModelHelper.sqlResultToModel(promise, BadgeProtagonistSettingRow.class);
        handler.handle(new Either.Right<>(new JsonArray(
                "[{\"id\":1,\"protagonist_type_id\":\"Student\",\"protagonist_type\":\"TARGET_PROFILE\"}," +
                "{\"id\":2,\"protagonist_type_id\":\"Teacher\",\"protagonist_type\":\"SENDER_PROFILE\"}]")));

        async.awaitSuccess(1000);
    }
}
