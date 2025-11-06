package fr.openent.minibadge.model;

import io.vertx.core.json.JsonObject;

import java.time.LocalDateTime;
import java.util.Optional;

import static fr.openent.minibadge.core.constants.Field.*;

public class UserMinibadge implements Model<UserMinibadge>  {
    private String id;
    private String displayName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime revokedAt;

    public UserMinibadge(JsonObject userMinibadgeJson) {
        set(userMinibadgeJson);
    }

    @Override
    public UserMinibadge model(JsonObject userMinibadgeJson) {
        return new UserMinibadge(userMinibadgeJson);
    }

    @Override
    public UserMinibadge set(JsonObject userMinibadgeJson) {
        this.id = userMinibadgeJson.getString(ID, "");
        this.displayName = userMinibadgeJson.getString(DISPLAY_NAME, "");
        this.createdAt = LocalDateTime.parse(userMinibadgeJson.getString(CREATED_AT));
        this.updatedAt = LocalDateTime.parse(userMinibadgeJson.getString(UPDATED_AT));
        this.revokedAt = Optional.ofNullable(userMinibadgeJson.getString(REVOKED_AT, null))
                .filter(s -> !s.isEmpty())
                .map(LocalDateTime::parse)
                .orElse(null);
        return this;
    }

    // Getter and Setter

    public String getId() {
        return id;
    }

    public UserMinibadge setId(String id) {
        this.id = id;
        return this;
    }

    public String getDisplayName() {
        return displayName;
    }

    public UserMinibadge setDisplayName(String displayName) {
        this.displayName = displayName;
        return this;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public UserMinibadge setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public UserMinibadge setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
        return this;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public UserMinibadge setRevokedAt(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
        return this;
    }

    @Override
    public JsonObject toJson() {
        return new JsonObject()
                .put(ID, this.id)
                .put(DISPLAYNAME, this.displayName)
                .put(CREATEDAT, this.createdAt)
                .put(UPDATEDAT, this.updatedAt)
                .put(REVOKEDAT, this.revokedAt);
    }
}
