UPDATE minibadge.badge_type AS bt
SET label = updates.label FROM(VALUES ('MAITRE_LETTRES', 'Maître des Lettres')) as updates(slug, label)
where updates.slug = bt.slug;
