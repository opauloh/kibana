/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiHorizontalRule,
  EuiPanel,
  EuiSkeletonRectangle,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { LEADS_INDEX_PATTERN } from '../../../../../common/entity_analytics/lead_generation/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import type { HuntingLead } from './types';
import { fromApiLead } from './types';
import * as i18n from './translations';
import { LeadRiskBadge, renderTextWithEntities } from './shared_lead_components';
import { useLeadEntityRiskScores } from './use_lead_entity_risk';
import { resolveLeadRiskScore, THREAT_HUNTING_LEADS_SCOPE_ID, type LeadRiskScore } from './utils';

interface ThreatHuntingLeadsFlyoutProps {
  onClose: () => void;
  onSelectLead: (lead: HuntingLead) => void;
  lastRunTimestamp?: string | null;
}

export const ThreatHuntingLeadsFlyout: React.FC<ThreatHuntingLeadsFlyoutProps> = ({
  onClose,
  onSelectLead,
  lastRunTimestamp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { fetchLeads } = useEntityAnalyticsRoutes();
  const { share } = useKibana().services;

  const handleViewLeadsArchiveIndex = useCallback(async () => {
    const discoverLocator = share?.url.locators.get('DISCOVER_APP_LOCATOR');
    if (!discoverLocator) return;

    const url = await discoverLocator.getRedirectUrl({
      dataViewSpec: {
        id: 'entity-analytics-threat-hunting-leads-archive',
        title: LEADS_INDEX_PATTERN,
        allowHidden: true,
      },
    });

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [share]);

  const { data, isLoading } = useQuery({
    queryKey: ['hunting-leads-flyout'],
    queryFn: ({ signal }) =>
      fetchLeads({
        signal,
        params: {
          page: 1,
          perPage: 10,
          sortField: 'priority',
          sortOrder: 'desc',
        },
      }),
  });

  const leads: HuntingLead[] = useMemo(() => data?.leads?.map(fromApiLead) ?? [], [data?.leads]);

  const { riskByEntityId, isLoading: isRiskLoading } = useLeadEntityRiskScores(leads);

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.title.toLowerCase().includes(query) ||
        lead.byline.toLowerCase().includes(query) ||
        lead.entities.some((e) => e.name.toLowerCase().includes(query))
    );
  }, [leads, searchQuery]);

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      size="m"
      ownFocus
      aria-label={i18n.ALL_HUNTING_LEADS_TITLE}
      data-test-subj="threatHuntingLeadsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.ALL_HUNTING_LEADS_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {i18n.ALL_HUNTING_LEADS_DESCRIPTION}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          {lastRunTimestamp && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="leadsFlyoutGeneratedTimestamp">
                {i18n.getGeneratedOnLabel(lastRunTimestamp)}
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="discoverApp"
              flush="left"
              onClick={handleViewLeadsArchiveIndex}
              data-test-subj="viewLeadsArchiveIndexButton"
            >
              {i18n.VIEW_LEADS_ARCHIVE_INDEX}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFieldSearch
          placeholder={i18n.SEARCH_LEADS_PLACEHOLDER}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          data-test-subj="leadSearchField"
        />
        <EuiSpacer size="m" />

        {isLoading ? (
          <EuiFlexGroup
            direction="column"
            gutterSize="s"
            data-test-subj="leadsFlyoutLoadingSkeleton"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <EuiFlexItem key={index}>
                <EuiPanel hasBorder paddingSize="s">
                  <EuiSkeletonTitle size="xs" />
                  <EuiSpacer size="s" />
                  <EuiSkeletonRectangle width={48} height={20} borderRadius="m" />
                  <EuiSpacer size="s" />
                  <EuiSkeletonText lines={2} size="s" />
                </EuiPanel>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        ) : (
          <>
            <EuiFlexGroup direction="column" gutterSize="s">
              {filteredLeads.map((lead) => (
                <EuiFlexItem key={lead.id}>
                  <LeadListItem
                    lead={lead}
                    risk={resolveLeadRiskScore(lead, riskByEntityId)}
                    isRiskLoading={isRiskLoading}
                    onClick={onSelectLead}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};

interface LeadListItemProps {
  lead: HuntingLead;
  risk?: LeadRiskScore;
  isRiskLoading?: boolean;
  onClick: (lead: HuntingLead) => void;
}

const LeadListItem: React.FC<LeadListItemProps> = ({ lead, risk, isRiskLoading, onClick }) => {
  const handleClick = useCallback(() => onClick(lead), [onClick, lead]);
  const renderedByline = useMemo(
    () => renderTextWithEntities(lead.byline, lead.entities, THREAT_HUNTING_LEADS_SCOPE_ID),
    [lead.byline, lead.entities]
  );
  return (
    <EuiPanel
      hasBorder
      paddingSize="s"
      onClick={handleClick}
      data-test-subj={`leadListItem-${lead.id}`}
    >
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{lead.title}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {risk ? (
          <EuiFlexItem grow={false}>
            <LeadRiskBadge risk={risk} />
          </EuiFlexItem>
        ) : (
          isRiskLoading && (
            <EuiFlexItem grow={false}>
              <EuiSkeletonRectangle
                width={48}
                height={20}
                borderRadius="m"
                data-test-subj="leadRiskBadgeSkeleton"
              />
            </EuiFlexItem>
          )
        )}

        {(risk || isRiskLoading) && <EuiHorizontalRule margin="s" />}

        <EuiFlexItem grow={false}>
          <EuiText size="xs">{renderedByline}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
