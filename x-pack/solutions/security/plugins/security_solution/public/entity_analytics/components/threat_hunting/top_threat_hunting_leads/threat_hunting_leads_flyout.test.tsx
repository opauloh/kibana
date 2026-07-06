/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ThreatHuntingLeadsFlyout } from './threat_hunting_leads_flyout';
import type { HuntingLead } from './types';
import type { LeadRiskScore } from './utils';

jest.mock('@kbn/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: jest.fn(),
}));

jest.mock('./use_lead_entity_risk', () => ({
  useLeadEntityRiskScores: jest.fn(),
}));

const mockOpenFlyout = jest.fn();
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({
    openFlyout: mockOpenFlyout,
  }),
}));

const mockGetRedirectUrl = jest.fn().mockResolvedValue('https://kibana.test/app/discover#/');
const mockLocatorsGet = jest.fn().mockReturnValue({ getRedirectUrl: mockGetRedirectUrl });
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      share: {
        url: {
          locators: {
            get: mockLocatorsGet,
          },
        },
      },
    },
  }),
}));

const mockUseQuery = jest.requireMock('@kbn/react-query').useQuery as jest.Mock;
const mockUseEntityAnalyticsRoutes = jest.requireMock('../../../api/api')
  .useEntityAnalyticsRoutes as jest.Mock;
const mockUseLeadEntityRiskScores = jest.requireMock('./use_lead_entity_risk')
  .useLeadEntityRiskScores as jest.Mock;

const setRiskScores = (entries: Array<[string, LeadRiskScore]> = []) => {
  mockUseLeadEntityRiskScores.mockReturnValue({
    riskByEntityId: new Map<string, LeadRiskScore>(entries),
    isLoading: false,
  });
};

const createMockLead = (overrides: Partial<HuntingLead> = {}): HuntingLead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'Test byline',
  description: 'Test description',
  entities: [{ type: 'user', name: 'jsmith' }],
  tags: ['tag1'],
  priority: 8,
  chatRecommendations: ['Check logs'],
  timestamp: '2026-03-01T00:00:00.000Z',
  staleness: 'fresh' as const,
  status: 'active' as const,
  observations: [],
  sourceType: 'adhoc' as const,
  ...overrides,
});

const createApiLead = (overrides: Partial<HuntingLead> = {}) => {
  const lead = createMockLead(overrides);
  return {
    ...lead,
    executionUuid: 'exec-uuid-1',
  };
};

const defaultProps = {
  onClose: jest.fn(),
  onSelectLead: jest.fn(),
};

describe('ThreatHuntingLeadsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRiskScores();
    mockUseEntityAnalyticsRoutes.mockReturnValue({ fetchLeads: jest.fn() });
    mockUseQuery.mockReturnValue({
      data: { leads: [createApiLead()], total: 1 },
      isLoading: false,
    });
  });

  it('renders the flyout with title "All Hunting Leads"', () => {
    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByTestId('threatHuntingLeadsFlyout')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Threat hunting leads' })).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const onClose = jest.fn();
    render(<ThreatHuntingLeadsFlyout {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByTestId('euiFlyoutCloseButton');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a lead item calls onSelectLead', () => {
    const onSelectLead = jest.fn();
    mockUseQuery.mockReturnValue({
      data: { leads: [createApiLead({ id: 'lead-42', title: 'Clicked Lead' })], total: 1 },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} onSelectLead={onSelectLead} />);

    fireEvent.click(screen.getByTestId('leadListItem-lead-42'));

    expect(onSelectLead).toHaveBeenCalledTimes(1);
    expect(onSelectLead).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-42', title: 'Clicked Lead' })
    );
  });

  it('clicking an entity badge in a list item opens the entity flyout and does not trigger onSelectLead', () => {
    const onSelectLead = jest.fn();
    mockUseQuery.mockReturnValue({
      data: {
        leads: [
          createApiLead({
            id: 'lead-badge',
            byline: 'User jsmith on host server-01',
            entities: [{ type: 'user', name: 'jsmith' }],
          }),
        ],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} onSelectLead={onSelectLead} />);

    fireEvent.click(screen.getByTestId('leadEntityBadge-jsmith'));

    expect(mockOpenFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'user-panel',
        params: {
          userName: 'jsmith',
          // No real entity id on this lead, so it falls back to `type:name`.
          entityId: 'user:jsmith',
          contextID: 'entity-analytics-threat-hunting-leads',
          scopeId: 'entity-analytics-threat-hunting-leads',
        },
      },
    });
    expect(onSelectLead).not.toHaveBeenCalled();
  });

  it('opens the entity flyout using the real entity id (EUID) when the lead entity carries one', () => {
    const onSelectLead = jest.fn();
    mockUseQuery.mockReturnValue({
      data: {
        leads: [
          createApiLead({
            id: 'lead-euid',
            byline: 'Host 8c67cb16-b7f2-4052-82f9-6edb87bb63ef triggered an alert',
            entities: [
              {
                type: 'host',
                name: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
                id: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
              },
            ],
          }),
        ],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} onSelectLead={onSelectLead} />);

    fireEvent.click(screen.getByTestId('leadEntityBadge-8c67cb16-b7f2-4052-82f9-6edb87bb63ef'));

    expect(mockOpenFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenFlyout).toHaveBeenCalledWith({
      right: {
        id: 'host-panel',
        params: {
          hostName: '8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          entityId: 'host:8c67cb16-b7f2-4052-82f9-6edb87bb63ef',
          contextID: 'entity-analytics-threat-hunting-leads',
          scopeId: 'entity-analytics-threat-hunting-leads',
        },
      },
    });
    expect(onSelectLead).not.toHaveBeenCalled();
  });

  it('renders lead byline in list items', () => {
    mockUseQuery.mockReturnValue({
      data: {
        leads: [createApiLead({ id: 'lead-byline', byline: 'Host server-01 with risk score 80' })],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByText('Host server-01 with risk score 80')).toBeInTheDocument();
  });

  it('does not render tag badges in list items', () => {
    mockUseQuery.mockReturnValue({
      data: {
        leads: [createApiLead({ id: 'lead-tags', tags: ['malware', 'lateral-movement'] })],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.queryByText('malware')).not.toBeInTheDocument();
    expect(screen.queryByText('lateral-movement')).not.toBeInTheDocument();
  });

  it('does not render timestamps on lead list items', () => {
    mockUseQuery.mockReturnValue({
      data: {
        leads: [createApiLead({ id: 'lead-no-time' })],
        total: 1,
      },
      isLoading: false,
    });

    const { container } = render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(container.textContent).not.toContain('just now');
    expect(container.textContent).not.toContain('ago');
  });

  it('renders the risk badge in list items using the entity store score', () => {
    setRiskScores([['host:entity-1', { score: 82, level: 'High' }]]);
    mockUseQuery.mockReturnValue({
      data: {
        leads: [
          createApiLead({
            id: 'lead-risk',
            observations: [
              {
                entityId: 'host:entity-1',
                moduleId: 'risk_analysis',
                type: 'high_risk_score',
                score: 82,
                severity: 'high',
                confidence: 0.9,
                description: 'High risk score',
                metadata: {},
              },
            ],
          }),
        ],
        total: 1,
      },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByTestId('leadRiskBadge')).toHaveTextContent('82.00');
  });

  it('does not render the risk badge when the entity has no risk score in the store', () => {
    setRiskScores();
    mockUseQuery.mockReturnValue({
      data: { leads: [createApiLead({ id: 'lead-no-risk', observations: [] })], total: 1 },
      isLoading: false,
    });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.queryByTestId('leadRiskBadge')).not.toBeInTheDocument();
  });

  it('renders a skeleton while leads are loading', () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.getByTestId('leadsFlyoutLoadingSkeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('leadListItem-lead-1')).not.toBeInTheDocument();
  });

  it('displays the generation timestamp when lastRunTimestamp is provided', () => {
    render(
      <ThreatHuntingLeadsFlyout {...defaultProps} lastRunTimestamp="2026-03-13T14:30:00.000Z" />
    );

    expect(screen.getByTestId('leadsFlyoutGeneratedTimestamp')).toBeInTheDocument();
  });

  it('does not display the generation timestamp when lastRunTimestamp is absent', () => {
    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    expect(screen.queryByTestId('leadsFlyoutGeneratedTimestamp')).not.toBeInTheDocument();
  });

  it('opens the leads archive index in Discover when the link is clicked', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation();

    render(<ThreatHuntingLeadsFlyout {...defaultProps} />);

    fireEvent.click(screen.getByTestId('viewLeadsArchiveIndexButton'));

    expect(mockLocatorsGet).toHaveBeenCalledWith('DISCOVER_APP_LOCATOR');
    await waitFor(() => expect(mockGetRedirectUrl).toHaveBeenCalled());
    expect(mockGetRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        dataViewSpec: expect.objectContaining({
          title: '.entity_analytics.entity-leads-*',
          allowHidden: true,
        }),
      })
    );
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        'https://kibana.test/app/discover#/',
        '_blank',
        'noopener,noreferrer'
      )
    );

    openSpy.mockRestore();
  });
});
