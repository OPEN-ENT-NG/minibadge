package fr.openent.minibadge.repository;

import fr.openent.minibadge.core.enums.SqlTable;
import fr.openent.minibadge.repository.impl.DefaultBadgeTypeSettingRepository;
import io.vertx.core.Handler;
import io.vertx.core.json.JsonArray;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.entcore.common.sql.Sql;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.powermock.reflect.Whitebox;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Epic A's version of this query was {@code SELECT * FROM badge_type_setting WHERE badge_type_id = ?}
 * with no structure filter whatsoever, fed straight into {@code validUniqueResultHandler}. That was
 * only ever correct while a badge type could have at most one setting row; as soon as a structure
 * creates its own badge types — or configures a centralized one — the "unique" contract breaks.
 * These tests pin the structure scoping and the single-row narrowing.
 */
@RunWith(VertxUnitRunner.class)
public class DefaultBadgeTypeSettingRepositoryTest {

    @Mock
    private Sql sql;

    private DefaultBadgeTypeSettingRepository repository;

    @Before
    @SuppressWarnings("unchecked")
    public void setUp() {
        MockitoAnnotations.initMocks(this);
        repository = new DefaultBadgeTypeSettingRepository();
        Whitebox.setInternalState(repository, "sql", sql);
        doNothing().when(sql).prepared(any(), any(), any(Handler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testFindByBadgeTypeIdPrefersStructureRowOverCentralizedOne() {
        String expectedQuery = "SELECT *, (valid_until IS NOT NULL AND valid_until < CURRENT_DATE) AS is_expired" +
                " FROM " + SqlTable.BADGE_TYPE_SETTING.getName() + " " +
                "WHERE badge_type_id = ? AND (structure_id IN (?) OR structure_id IS NULL) " +
                "ORDER BY structure_id NULLS LAST, id LIMIT 1";
        JsonArray expectedParams = new JsonArray().add(7L).add("structure1");

        repository.findByBadgeTypeId(7L, Collections.singletonList("structure1"));

        verify(sql).prepared(eq(expectedQuery), eq(expectedParams), any(Handler.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    public void testFindByBadgeTypeIdFallsBackToCentralizedRowWhenUserHasNoStructure() {
        String expectedQuery = "SELECT *, (valid_until IS NOT NULL AND valid_until < CURRENT_DATE) AS is_expired" +
                " FROM " + SqlTable.BADGE_TYPE_SETTING.getName() + " " +
                "WHERE badge_type_id = ? AND (  structure_id IS NULL) " +
                "ORDER BY structure_id NULLS LAST, id LIMIT 1";
        JsonArray expectedParams = new JsonArray().add(7L);

        repository.findByBadgeTypeId(7L, Collections.emptyList());

        verify(sql).prepared(eq(expectedQuery), eq(expectedParams), any(Handler.class));
    }
}
