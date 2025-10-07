package fr.openent.minibadge.model.entity;

import java.time.LocalDateTime;

import fr.openent.minibadge.core.enums.BadgeCategoryIcon;
import fr.openent.minibadge.model.Model;
import io.vertx.core.json.JsonObject;

import static fr.openent.minibadge.core.constants.Field.*;

public class BadgeCategory implements Model<BadgeCategory> {
    private Long id;
    private String name;
    private String slug;
    private BadgeCategoryIcon icon;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public BadgeCategory(JsonObject badgeCategoryJson) {
        this.set(badgeCategoryJson);
    }

    @Override
    public BadgeCategory model(JsonObject badgeCategoryJson) {
        return new BadgeCategory(badgeCategoryJson);
    }

    @Override
    public BadgeCategory set(JsonObject badgeCategoryJson) {
        this.id = badgeCategoryJson.getLong(ID, 0L);
        this.name = badgeCategoryJson.getString(NAME, "");
        this.slug = badgeCategoryJson.getString(SLUG, "");
        this.icon = BadgeCategoryIcon.fromName(badgeCategoryJson.getString(ICON_NAME, ""));
        this.createdAt = LocalDateTime.parse(badgeCategoryJson.getString(CREATED_AT));
        this.updatedAt = LocalDateTime.parse(badgeCategoryJson.getString(UPDATED_AT));
        return this;
    }

    // Getters & Setters

    public Long getId() {
        return id;
    }

    public BadgeCategory setId(Long id) {
        this.id = id;
        return this;
    }

    public String getName() {
        return name;
    }

    public BadgeCategory setName(String name) {
        this.name = name;
        return this;
    }

    public String getSlug() {
        return slug;
    }

    public BadgeCategory setSlug(String slug) {
        this.slug = slug;
        return this;
    }

    public BadgeCategoryIcon getIcon() {
        return icon;
    }

    public BadgeCategory setIcon(BadgeCategoryIcon icon) {
        this.icon = icon;
        return this;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public BadgeCategory setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
        return this;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public BadgeCategory setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
        return this;
    }

    // Functions

    @Override
    public JsonObject toJson() {
        JsonObject json = new JsonObject();
        json.put(ID, this.id);
        json.put(NAME, this.name);
        json.put(SLUG, this.slug);
        json.put(ICONNAME, this.icon.getName());
        json.put(ICONCSSCLASS, this.icon.getCssClass());
        return json;
    }
}
