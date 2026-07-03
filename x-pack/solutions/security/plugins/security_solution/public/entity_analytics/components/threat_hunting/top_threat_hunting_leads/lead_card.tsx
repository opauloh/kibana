/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { HuntingLead } from './types';
import { LeadRiskBadge, renderTextWithEntities } from './shared_lead_components';
import type { LeadRiskScore } from './utils';

interface LeadCardProps {
  lead: HuntingLead;
  risk?: LeadRiskScore;
  onClick: (lead: HuntingLead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, risk, onClick }) => {
  const handleClick = useCallback(() => onClick(lead), [onClick, lead]);
  const renderedByline = useMemo(
    () => renderTextWithEntities(lead.byline, lead.entities),
    [lead.byline, lead.entities]
  );

  return (
    <EuiCard
      title={
        <EuiToolTip content={lead.title} anchorClassName="eui-textTruncate" display="block">
          <span>{lead.title}</span>
        </EuiToolTip>
      }
      titleElement="h5"
      titleSize="xs"
      textAlign="left"
      hasBorder={false}
      description={
        <EuiFlexGroup direction="column" gutterSize="xs">
          {risk && (
            <EuiFlexItem grow={false}>
              <LeadRiskBadge risk={risk} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiText
              size="xs"
              color="subdued"
              css={{
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {renderedByline}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="l"
      onClick={handleClick}
      data-test-subj={`leadCard-${lead.id}`}
      css={{
        minWidth: 0,
        maxWidth: 480,
        '.euiCard__titleButton': { maxWidth: '100%' },
      }}
    />
  );
};
