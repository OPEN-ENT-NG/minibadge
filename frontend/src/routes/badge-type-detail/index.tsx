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
import { getPictoSrc } from '~/utils/picto';
import { stripHtmlTags } from '~/utils/stripHtml';

const displayUserName = (user: MinibadgeUser): string =>
  user.displayName ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

/**
 * Badge type detail screen: image/label/categories, description, and (only
 * when the current user can receive this badge) the list of people who
 * assigned it to them.
 *
 * `descriptionShort`/`description` may contain HTML markup, so they're run
 * through `stripHtmlTags` rather than rendered with `dangerouslySetInnerHTML`
 * — this is admin-authored content, not fixed app copy.
 */
export const BadgeTypeDetail = () => {
  const { t } = useTranslation('minibadge');
  const navigate = useNavigate();
  const { typeId: typeIdParam } = useParams<{ typeId: string }>();
  const typeId = Number(typeIdParam);
  const { canAssign, canReceive } = useMinibadgeAccessContext();
  const queryClient = useQueryClient();

  const { badgeType, query: badgeTypeQuery } = useBadgeType(typeId);
  // Always called (hooks can't be conditional) — only the result is gated
  // behind `canReceive` below.
  const { assigners, query: assignersQuery } = useBadgeTypeAssigners(typeId, 0);

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAssignMyselfOpen, setIsAssignMyselfOpen] = useState(false);

  // `useAssignBadge`'s own invalidation (`['assigned']`/`['badges']`/
  // `['badgeTypes']`, plural) doesn't cover the singular `['badgeType',
  // typeId]`/`['badgeTypeAssigners', typeId]` queries, so this screen
  // invalidates those itself.
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
  // of use below, instead of needing a non-null assertion.
  const assignersAll = assigners?.all;
  const imageSrc = getPictoSrc(badgeType.pictureId) ?? commonPlaceholder;
  const descriptionShort = badgeType.descriptionShort ? stripHtmlTags(badgeType.descriptionShort) : undefined;
  const description = badgeType.description ? stripHtmlTags(badgeType.description) : undefined;

  return (
    <div>
      {/* Sticky header row — back button + title on the left, action buttons
          on the right. */}
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

      {/* Two-column body on desktop (`flex-md-row`) — image on the left,
          categories/description on the right; stacked image-then-text on
          mobile (`direction="column"` is the base/mobile-first value)
          instead of squeezing the fixed 240px image and the description
          onto one unwrapping row. */}
      <Flex direction="column" gap="24" wrap="nowrap" className="mb-16 flex-md-row">
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
