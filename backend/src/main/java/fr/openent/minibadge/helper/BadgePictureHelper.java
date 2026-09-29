package fr.openent.minibadge.helper;

import io.vertx.core.Future;
import io.vertx.core.Vertx;

import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Epic D: turns a badge type's {@code pictureId} into an inline SVG data URI for the PDF certificate
 * (nothing proves the PDF service can reach {@code /minibadge/public/img/}, so the image travels inside
 * the template, as {@code form} does).
 * <p>
 * {@code pictureId} is ANY string on creation ({@code jsonschema/badgeTypeCreate.json}): it is only
 * turned into a path once it is a bare lowercase {@code .svg} file name — no separator, no dot segment —
 * and that file exists in the picto folder. Anything else simply renders no image.
 */
public class BadgePictureHelper {

    public static final Pattern ALLOWED_PICTURE_ID = Pattern.compile("^[a-z0-9-]+\\.svg$");
    private static final String DATA_URI_PREFIX = "data:image/svg+xml;base64,";

    private final Vertx vertx;
    private final String pictureDirectory;
    /** The picto folder ships with the module: a data URI, once read, never changes. */
    private final Map<String, String> cache = new ConcurrentHashMap<>();

    /**
     * @param vertx            vertx instance (file system access)
     * @param pictureDirectory absolute path of the picto folder, with or without a trailing separator
     */
    public BadgePictureHelper(Vertx vertx, String pictureDirectory) {
        this.vertx = vertx;
        this.pictureDirectory = pictureDirectory.endsWith("/") ? pictureDirectory : pictureDirectory + "/";
    }

    public static boolean isAllowedPictureId(String pictureId) {
        return pictureId != null && ALLOWED_PICTURE_ID.matcher(pictureId).matches();
    }

    /**
     * @return the data URI of the picture, or null (never a failed future) when the id is not allowed,
     * the file does not exist or cannot be read
     */
    public Future<String> toDataUri(String pictureId) {
        if (!isAllowedPictureId(pictureId)) {
            return Future.succeededFuture(null);
        }
        String cached = cache.get(pictureId);
        if (cached != null) {
            return Future.succeededFuture(cached);
        }
        String path = pictureDirectory + pictureId;
        try {
            return vertx.fileSystem().exists(path)
                    .compose(exists -> Boolean.TRUE.equals(exists)
                            ? vertx.fileSystem().readFile(path)
                            .map(buffer -> {
                                String dataUri = DATA_URI_PREFIX + Base64.getEncoder().encodeToString(buffer.getBytes());
                                cache.put(pictureId, dataUri);
                                return dataUri;
                            })
                            : Future.succeededFuture((String) null))
                    .recover(err -> {
                        LoggerHelper.logError(this, "toDataUri", "Fail to read picture " + pictureId, err.getMessage());
                        return Future.succeededFuture(null);
                    });
        } catch (Exception e) {
            LoggerHelper.logError(this, "toDataUri", "Fail to read picture " + pictureId, e.getMessage());
            return Future.succeededFuture(null);
        }
    }
}
