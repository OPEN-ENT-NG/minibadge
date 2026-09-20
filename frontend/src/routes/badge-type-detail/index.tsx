import { Alert, Button, LoadingScreen } from '@edifice.io/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { AssignBadgeLightbox } from '~/components/AssignBadgeLightbox';
import { AssignMyselfModal } from '~/components/AssignMyselfModal';
import { CategoryChip } from '~/components/CategoryChip';
import { MinibadgeUser } from '~/models/user';
import { useMinibadgeAccessContext } from '~/routes/root/CharterGate/context';
import { useBadgeType, useBadgeTypeAssigners } from '~/services/queries/badgeTypes';

const displayUserName = (user: MinibadgeUser): string =>
  user.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

/**
 * Mirrors `badge-type.html` + `badge-type.controller.ts` — the badge type
 * detail screen: fiche (image/label/categories) + description + the list of
 * people who assigned ME this badge (only if `canReceive()`), plus the two
 * action buttons ("Me décerner" / "Décerner"), both opening the same two
 * modals the badge-types library screen uses.
 *
 * NOT PORTED (deliberately, matching the plan's stated scope for this
 * screen — "fiche du type (image/label/catégories), description, liste
 * 'assigners'"): `id-type.html`'s extra metadata (owner/creation date,
 * `displayAssignors()`/`displayReceivers()`, the "N personnes ont obtenu ce
 * badge sur la plateforme" stat) and the receivers list/pagination. The
 * receivers list is fetched by the real controller
 * (`getBadgeTypeReceivers`) but never actually rendered anywhere in
 * `badge-type.html` either (only its `receiversTotal` count feeds that
 * unported stat line) — so nothing is silently dropped that the real UI
 * shows. Assigners pagination beyond page 0 is left as a fixed first page:
 * the plan's own testing strategy for this screen doesn't exercise paging,
 * and the real pager (`minibadge-paging`) has no already-shipped i18n copy
 * to reuse faithfully (`grep` found none), so inventing labels for it would
 * violate the plan's explicit "no new i18n key" constraint.
 *
 * Description rendering: the real template uses `bind-html` for
 * `descriptionShort`/`description` (`description-type.html:5-6`), but this
 * renders them as plain text instead, consistent with how `BadgeCard`
 * (Phase 1/2) already renders `descriptionShort` — plain `<Card.Text>`, no
 * `dangerouslySetInnerHTML` — and with `CharterGate`'s own doc comment
 * reserving that API for the app's own fixed i18n bundle text, not
 * admin-authored content. A deliberate, documented deviation for defense in
 * depth, not a plan requirement missed.
 */
export const BadgeTypeDetail = () => {
  const { t } = useTranslation('minibadge');
  const { typeId: typeIdParam } = useParams<{ typeId: string }>();
  const typeId = Number(typeIdParam);
  const { canAssign, canReceive } = useMinibadgeAccessContext();
  const queryClient = useQueryClient();

  const { badgeType, query: badgeTypeQuery } = useBadgeType(typeId);
  // Always called (React hooks can't be conditional) — the same established
  // compromise as `routes/my-badges` (Phase 2): the query fires regardless,
  // only its RESULT is gated behind `canReceive` below, mirroring
  // `getBadgeTypeAssigners`'s real-source guard
  // (`if (this.badgeType && this.$scope.setting.userPermissions.canReceive())`).
  const { assigners, query: assignersQuery } = useBadgeTypeAssigners(typeId, 0);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssignMyselfOpen, setIsAssignMyselfOpen] = useState(false);

  // Mirrors `refreshBadgeTypeData()` — `useAssignBadge`'s own invalidation
  // (`['assigned']`/`['badges']`/`['badgeTypes']`, plural) does not cover the
  // singular `['badgeType', typeId]` detail query nor `['badgeTypeAssigners',
  // typeId]`, so this screen invalidates those two itself on top.
  const handleAssigned = () => {
    queryClient.invalidateQueries({ queryKey: ['badgeType', typeId] });
    queryClient.invalidateQueries({ queryKey: ['badgeTypeAssigners', typeId] });
  };

  if (badgeTypeQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (badgeTypeQuery.isError || !badgeType) {
    return <Alert type="danger">{t('minibadge.error.get.badge.type')}</Alert>;
  }

  const showAssignMyself = canAssign && badgeType.setting.isSelfAssignable;
  const showAssign = canAssign;
  // Extracted so TypeScript can narrow `assignersAll` directly at the point
  // of use below (a plain boolean like the old `showAssigners` can't carry
  // that narrowing, which is what previously forced a `assigners!.all` `!`).
  const assignersAll = assigners?.all;

  return (
    <div>
      <div>
        {showAssignMyself ? (
          <Button color="secondary" variant="outline" onClick={() => setIsAssignMyselfOpen(true)}>
            {t('minibadge.badge.assign.myself.button')}
          </Button>
        ) : null}
        {showAssign ? (
          <Button color="primary" variant="filled" onClick={() => setIsAssignOpen(true)}>
            {t('minibadge.badge.assign')}
          </Button>
        ) : null}
      </div>

      <h2>{badgeType.label}</h2>
      {badgeType.pictureId ? (
        <img src={`/minibadge/public/img/${badgeType.pictureId}`} alt="" />
      ) : null}
      {badgeType.categories.length > 0 ? (
        <div>
          {badgeType.categories.map((category) => (
            <CategoryChip key={category.id} category={category} />
          ))}
        </div>
      ) : null}

      <section>
        <h3>{t('minibadge.description')}</h3>
        {badgeType.descriptionShort ? <p>{badgeType.descriptionShort}</p> : null}
        {badgeType.description ? <p>{badgeType.description}</p> : null}
      </section>

      {assignersQuery.isError && canReceive ? (
        <Alert type="danger">{t('minibadge.error.get.badge.type')}</Alert>
      ) : null}

      {canReceive && assignersAll && assignersAll.length > 0 ? (
        <section>
          <h3>
            {t('minibadge.badges.received.from.users')}
            {assigners?.userAssignersTotal ? ` (${assigners.userAssignersTotal})` : ''}
          </h3>
          <h4>{t('minibadge.badges.assigned.by')}&nbsp;:</h4>
          <ul>
            {assignersAll.map((assigner) => (
              <li key={assigner.id}>
                {assigner.profile ? <strong>{t(`minibadge.profile.${assigner.profile}`)}</strong> : null}
                <span>{displayUserName(assigner)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AssignBadgeLightbox
        badgeType={badgeType}
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onAssigned={handleAssigned}
      />
      <AssignMyselfModal
        badgeType={badgeType}
        isOpen={isAssignMyselfOpen}
        onClose={() => setIsAssignMyselfOpen(false)}
        onAssigned={handleAssigned}
      />
    </div>
  );
};
