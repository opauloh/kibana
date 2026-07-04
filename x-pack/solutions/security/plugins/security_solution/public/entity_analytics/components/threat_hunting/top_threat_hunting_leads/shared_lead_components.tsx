/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { RiskScoreCell } from '../../home/entities_table/risk_score_cell';
import { EntityType } from '../../../../../common/entity_analytics/types';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../flyout/entity_details/shared/constants';
import { getOpenEntityFlyoutLabel, getRiskLevelTooltip, TAGS_SECTION } from './translations';
import { getEntityIcon, MAX_VISIBLE_TAGS, type LeadRiskScore } from './utils';

export const LeadRiskBadge: React.FC<{ risk: LeadRiskScore }> = ({ risk }) => (
  <EuiToolTip content={getRiskLevelTooltip(risk.level)}>
    <RiskScoreCell riskScore={risk.score} data-test-subj="leadRiskBadge" />
  </EuiToolTip>
);

const isKnownEntityType = (type: string): type is EntityType =>
  (Object.values(EntityType) as string[]).includes(type);

interface EntityBadgeProps {
  entity: { type: string; name: string; id?: string };
  scopeId: string;
}

/**
 * Renders an entity's name/type as a badge. When the entity type maps to a
 * known entity flyout panel, clicking the badge opens that entity's flyout
 * instead of triggering the surrounding card's click handler (e.g. opening
 * the Agent Builder chat).
 */
export const EntityBadge: React.FC<EntityBadgeProps> = ({ entity, scopeId }) => {
  const { openFlyout } = useExpandableFlyoutApi();
  const { euiTheme } = useEuiTheme();

  const badgeContent = (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} component="span">
      <EuiIcon type={getEntityIcon(entity.type)} size="s" aria-hidden={true} />
      <span
        css={css`
          color: ${euiTheme.colors.textPrimary};
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {entity.name}
      </span>
    </EuiFlexGroup>
  );

  if (!isKnownEntityType(entity.type)) {
    return <EuiBadge color="hollow">{badgeContent}</EuiBadge>;
  }

  const panelKey = EntityPanelKeyByType[entity.type];
  const panelParam = EntityPanelParamByType[entity.type];

  if (!panelKey || !panelParam) {
    return <EuiBadge color="hollow">{badgeContent}</EuiBadge>;
  }

  // Prefer the real Entity Store EUID (e.g. `host:8c67cb16-...`) so the
  // flyout resolves the entity directly by id. Older leads persisted before
  // this field existed fall back to `type:name`, which is only correct when
  // the display name happens to be the entity's raw id (e.g. hosts without a
  // friendly name) — best-effort, but strictly better than a name-only match.
  const entityId = entity.id ?? `${entity.type}:${entity.name}`;

  const openEntityFlyout = () => {
    openFlyout({
      right: {
        id: panelKey,
        params: {
          [panelParam]: entity.name,
          entityId,
          contextID: scopeId,
          scopeId,
        },
      },
    });
  };

  // Rendered as a `span[role=button]` (rather than passing `onClick` to
  // `EuiBadge`, which would render a nested `<button>`) since these badges
  // sit inside other clickable elements (cards/panels) that are themselves
  // rendered as `<button>`, and nested buttons are invalid HTML.
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={getOpenEntityFlyoutLabel(entity.name)}
      data-test-subj={`leadEntityBadge-${entity.name}`}
      onClick={(e) => {
        e.stopPropagation();
        openEntityFlyout();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          openEntityFlyout();
        }
      }}
    >
      <EuiBadge color="hollow">{badgeContent}</EuiBadge>
    </span>
  );
};

export const renderTextWithEntities = (
  text: string,
  entities: Array<{ type: string; name: string; id?: string }>,
  scopeId: string
): React.ReactNode => {
  if (!entities.length) return text;

  interface Match {
    start: number;
    end: number;
    entity: { type: string; name: string; id?: string };
  }
  const matches: Match[] = [];

  for (const entity of entities) {
    const typeLabel = entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
    const withPrefix = `${typeLabel} ${entity.name}`;
    let idx = text.indexOf(withPrefix);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + withPrefix.length, entity });
    } else {
      idx = text.indexOf(entity.name);
      if (idx !== -1) {
        matches.push({ start: idx, end: idx + entity.name.length, entity });
      }
    }
  }

  if (!matches.length) return text;

  matches.sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const match of matches) {
    if (match.start >= lastEnd) {
      if (match.start > lastEnd) {
        parts.push(text.slice(lastEnd, match.start));
      }
      parts.push(
        <EntityBadge entity={match.entity} scopeId={scopeId} key={`entity-${match.start}`} />
      );
      lastEnd = match.end;
    }
  }

  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return <>{parts}</>;
};

export const TagsPopover: React.FC<{ tags: string[] }> = ({ tags }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const open = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setIsOpen(true);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setIsOpen(false), 100);
  }, []);

  const hiddenTags = tags.slice(MAX_VISIBLE_TAGS);

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      ownFocus={false}
      aria-label={TAGS_SECTION}
      button={
        <span
          role="button"
          tabIndex={0}
          onMouseEnter={open}
          onMouseLeave={scheduleClose}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen((prev) => !prev);
            }
          }}
        >
          <EuiBadge color="hollow">{`+${hiddenTags.length}`}</EuiBadge>
        </span>
      }
    >
      <div onMouseEnter={open} onMouseLeave={scheduleClose} style={{ maxWidth: 320 }}>
        <EuiText size="xs">
          <strong>{TAGS_SECTION}</strong>
        </EuiText>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
          {hiddenTags.map((tag) => (
            <EuiFlexItem grow={false} key={tag}>
              <EuiBadge color="hollow">{tag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
