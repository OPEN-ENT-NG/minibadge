package fr.openent.minibadge.helper;

import io.vertx.core.Future;
import io.vertx.core.Vertx;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.file.FileSystem;
import io.vertx.ext.unit.junit.VertxUnitRunner;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.Base64;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Epic D, Task 3: a {@code pictureId} is any string on creation, so it only becomes a path once it is
 * a bare lowercase .svg name AND the file exists; anything else renders no image, without error and
 * without touching the file system.
 */
@RunWith(VertxUnitRunner.class)
public class BadgePictureHelperTest {

    private static final String DIR = "/module/public/img";
    private static final String SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\"/>";

    private Vertx vertx;
    private FileSystem fileSystem;
    private BadgePictureHelper helper;

    @Before
    public void setUp() {
        vertx = mock(Vertx.class);
        fileSystem = mock(FileSystem.class);
        when(vertx.fileSystem()).thenReturn(fileSystem);
        when(fileSystem.exists(anyString())).thenReturn(Future.succeededFuture(false));
        when(fileSystem.exists(DIR + "/animation.svg")).thenReturn(Future.succeededFuture(true));
        when(fileSystem.readFile(DIR + "/animation.svg")).thenReturn(Future.succeededFuture(Buffer.buffer(SVG)));
        helper = new BadgePictureHelper(vertx, DIR);
    }

    @Test
    public void testTheAllowList() {
        assertTrue(BadgePictureHelper.isAllowedPictureId("animation.svg"));
        assertTrue(BadgePictureHelper.isAllowedPictureId("uni-minibadge.svg"));
        assertTrue(BadgePictureHelper.isAllowedPictureId("as-numerique2.svg"));

        assertFalse(BadgePictureHelper.isAllowedPictureId(null));
        assertFalse(BadgePictureHelper.isAllowedPictureId(""));
        assertFalse(BadgePictureHelper.isAllowedPictureId("../etc/passwd"));
        assertFalse(BadgePictureHelper.isAllowedPictureId("../../conf.json.svg"));
        assertFalse(BadgePictureHelper.isAllowedPictureId("/etc/passwd.svg"));
        assertFalse(BadgePictureHelper.isAllowedPictureId("sub/animation.svg"));
        assertFalse(BadgePictureHelper.isAllowedPictureId("..svg"));
        assertFalse(BadgePictureHelper.isAllowedPictureId("x.png"));
        assertFalse(BadgePictureHelper.isAllowedPictureId("Animation.SVG"));
        assertFalse(BadgePictureHelper.isAllowedPictureId("animation.svg\n"));
        assertFalse(BadgePictureHelper.isAllowedPictureId("https://evil.example/x.svg"));
    }

    @Test
    public void testAnAllowedExistingPictureBecomesADataUri() {
        Future<String> result = helper.toDataUri("animation.svg");

        assertTrue(result.succeeded());
        assertEquals("data:image/svg+xml;base64," + Base64.getEncoder().encodeToString(SVG.getBytes()), result.result());
    }

    @Test
    public void testADataUriIsReadOnce() {
        helper.toDataUri("animation.svg");
        helper.toDataUri("animation.svg");

        verify(fileSystem, times(1)).readFile(DIR + "/animation.svg");
    }

    @Test
    public void testATraversalAttemptRendersNoImageWithoutTouchingTheFileSystem() {
        Future<String> result = helper.toDataUri("../etc/passwd");

        assertTrue(result.succeeded());
        assertNull(result.result());
        verifyZeroInteractions(fileSystem);
    }

    @Test
    public void testANonSvgRendersNoImageWithoutTouchingTheFileSystem() {
        Future<String> result = helper.toDataUri("x.png");

        assertTrue(result.succeeded());
        assertNull(result.result());
        verifyZeroInteractions(fileSystem);
    }

    @Test
    public void testAMissingPictureRendersNoImage() {
        Future<String> result = helper.toDataUri("absent.svg");

        assertTrue(result.succeeded());
        assertNull(result.result());
        verify(fileSystem).exists(DIR + "/absent.svg");
        verify(fileSystem, never()).readFile(anyString());
    }

    @Test
    public void testAnUnreadablePictureRendersNoImage() {
        when(fileSystem.exists(DIR + "/broken.svg")).thenReturn(Future.succeededFuture(true));
        when(fileSystem.readFile(DIR + "/broken.svg")).thenReturn(Future.failedFuture("EACCES"));

        Future<String> result = helper.toDataUri("broken.svg");

        assertTrue(result.succeeded());
        assertNull(result.result());
    }

    @Test
    public void testTheShippedPictosAllPassTheAllowList() {
        java.io.File[] pictos = new java.io.File("src/main/resources/public/img").listFiles();
        assertNotNull(pictos);
        assertTrue(pictos.length > 0);
        for (java.io.File picto : pictos) {
            assertTrue(picto.getName(), BadgePictureHelper.isAllowedPictureId(picto.getName()));
        }
    }
}
