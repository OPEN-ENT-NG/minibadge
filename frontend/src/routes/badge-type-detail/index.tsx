import commonPlaceholder from '@edifice.io/bootstrap/dist/images/common/image-placeholder.png';
import { Alert, Button, Flex, Heading, IconButton, Image, LoadingScreen } from '@edifice.io/react';
import { IconArrowLeft } from '@edifice.io/react/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { AssignBadgeLightbox } from '~/components/AssignBadgeLightbox';
import { AssignMyselfModal } from '~/components/AssignMyselfModal';
import { CategoryChip } from '~/components/CategoryChip';
import { MinibadgeUser } from '~/models/user';
import { useMinibadgeAccessContext } from '~/routes/root/CharterGate/context';
import { useBadgeType, useBadgeTypeAssigners } from '~/services/queries/badgeTypes';
import { stripHtmlTags } from '~/utils/stripHtml';

const displayUserName = (user: MinibadgeUser): string =>
  user.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

/**
 * Mirrors `badge-type.html` + `badge-type.controller.ts` — the badge type
 * detail screen: fiche (image/label/categories) + description + the list of
 * people who assigned ME this badge (only if `canReceive()`), plus the two
 * action buttons ("Me décerner" / "Décerner").
 *
 * Layout inspired by how communities displays a community
 * (`features/communities-tabs/CommunityTabs.tsx`'s `community-header`): a
 * sticky top bar with a back button + title on the left and the action
 * buttons on the right (moved here from their own separate row), then a
 * two-column body — a large image on the left, categories/description on
 * the right. Not a literal copy (that file's own body is a community-
 * specific 3-column members/announcements layout with no image+text split
 * to mirror), but the same header idiom, adapted to what this screen
 * actually shows.
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
 * `descriptionShort`/`description` (`description-type.html:5-6`) — real
 * content can contain HTML markup. This still never uses
 * `dangerouslySetInnerHTML` for admin-authored content (`CharterGate`'s own
 * doc comment reserves that API for the app's own fixed i18n bundle text),
 * so `stripHtmlTags` (see its own doc comment, already used by `BadgeCard`)
 * shows the text without the literal tags.
 *
 * Back button: always navigates to `/badge-types` (mirrors communities'
 * `backToList`'s `navigate("/")`, an explicit route rather than browser
 * history) — this screen is only ever reached by clicking a card in that
 * catalogue (`routes/badge-types`), so there is no other "back" target.
 */
export const BadgeTypeDetail = () => {
  const { t } = useTranslation('minibadge');
  const navigate = useNavigate();
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
  const imageSrc = badgeType.pictureId ? `/minibadge/public/img/${badgeType.pictureId}` : commonPlaceholder;
  const descriptionShort = badgeType.descriptionShort ? stripHtmlTags(badgeType.descriptionShort) : undefined;
  const description = badgeType.description ? stripHtmlTags(badgeType.description) : undefined;

  return (
    <div>
      {/* Top bar — mirrors communities' `community-header`: back button +
          title on the left, action buttons on the right, in one sticky row. */}
      <Flex
        align="center"
        justify="between"
        wrap="wrap"
        gap="16"
        className="position-sticky top-0 z-1 bg-white p-16 mx-n16 mb-16"
      >
        <Flex align="center" gap="16" className="flex-fill" style={{ minWidth: 0 }}>
          <IconButton
            aria-label={t('minibadge.back')}
            color="tertiary"
            variant="filled"
            icon={<IconArrowLeft />}
            onClick={() => navigate('/badge-types')}
          />
          <Heading level="h2" headingStyle="h3" className="text-truncate mb-0">
            {badgeType.label}
          </Heading>
        </Flex>
        <Flex wrap="wrap" gap="8">
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
        </Flex>
      </Flex>

      {/* Body — large image on the left, categories/description on the
          right (communities-inspired two-column "fiche" layout). */}
      <Flex gap="24" wrap="nowrap" className="mb-16">
        <div
          className="bg-gray-200 d-flex align-items-center justify-content-center"
          style={{ width: 240, flexShrink: 0 }}
        >
          <Image src={imageSrc} imgPlaceholder={commonPlaceholder} alt="" ratio="1" objectFit="contain" />
        </div>
        <div className="flex-fill" style={{ minWidth: 0 }}>
          {badgeType.categories.length > 0 ? (
            <Flex wrap="wrap" gap="8" className="mb-16">
              {badgeType.categories.map((category) => (
                <CategoryChip key={category.id} category={category} />
              ))}
            </Flex>
          ) : null}

          <section>
            <h3>{t('minibadge.description')}</h3>
            {descriptionShort ? <p>{descriptionShort}</p> : null}
            {description ? <p>{description}</p> : null}
          </section>
        </div>
      </Flex>

      {assignersQuery.isError && canReceive ? (
        <Alert type="danger">{t('minibadge.error.get.badge.type')}</Alert>
      ) : null}

      {canReceive && assignersAll && assignersAll.length > 0 ? (
        <section className="mb-16">
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
