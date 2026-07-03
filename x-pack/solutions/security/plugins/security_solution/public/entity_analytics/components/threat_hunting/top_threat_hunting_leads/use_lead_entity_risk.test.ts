/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { useLeadEntityRiskScores } from './use_lead_entity_risk';
import { useEntitiesListQuery } from '../../entity_store/hooks/use_entities_list_query';
import type { HuntingLead, Observation } from './types';

jest.mock('../../entity_store/hooks/use_entities_list_query');

const mockUseEntitiesListQuery = useEntitiesListQuery as jest.Mock;

const createObservation = (entityId: string): Observation => ({
  entityId,
  moduleId: 'risk_analysis',
  type: 'high_risk_score',
  score: 80,
  severity: 'high',
  confidence: 0.9,
  description: 'obs',
  metadata: {},
});

const createLead = (id: string, entityIds: string[]): HuntingLead => ({
  id,
  title: 'Lead',
  byline: 'byline',
  description: 'description',
  entities: [{ type: 'host', name: 'server-01' }],
  tags: [],
  priority: 5,
  chatRecommendations: [],
  timestamp: '2026-03-01T00:00:00.000Z',
  staleness: 'fresh',
  status: 'active',
  observations: entityIds.map(createObservation),
  sourceType: 'adhoc',
});

describe('useLeadEntityRiskScores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntitiesListQuery.mockReturnValue({ data: undefined, isFetching: false });
  });

  it('skips the query when there are no leads', () => {
    renderHook(() => useLeadEntityRiskScores([]));

    expect(mockUseEntitiesListQuery).toHaveBeenCalledWith(expect.objectContaining({ skip: true }));
  });

  it('queries the unique entity ids of all leads with a terms filter', () => {
    renderHook(() =>
      useLeadEntityRiskScores([
        createLead('lead-1', ['host:a', 'host:a']),
        createLead('lead-2', ['user:b']),
      ])
    );

    const params = mockUseEntitiesListQuery.mock.calls[0][0];
    expect(params.skip).toBe(false);
    expect(JSON.parse(params.filterQuery)).toEqual({
      bool: { filter: [{ terms: { 'entity.id': ['host:a', 'user:b'] } }] },
    });
  });

  it('maps returned entity records to a risk map keyed by EUID', () => {
    mockUseEntitiesListQuery.mockReturnValue({
      data: {
        records: [
          {
            entity: {
              id: 'host:a',
              risk: { calculated_score_norm: 55.5, calculated_level: 'Moderate' },
            },
          },
          {
            entity: {
              id: 'user:b',
              risk: { calculated_score_norm: 91, calculated_level: 'Critical' },
            },
          },
          { entity: { id: 'host:c' } },
        ],
      },
      isFetching: false,
    });

    const { result } = renderHook(() =>
      useLeadEntityRiskScores([createLead('lead-1', ['host:a', 'user:b', 'host:c'])])
    );

    expect(result.current.riskByEntityId.get('host:a')).toEqual({ score: 55.5, level: 'Moderate' });
    expect(result.current.riskByEntityId.get('user:b')).toEqual({ score: 91, level: 'Critical' });
    expect(result.current.riskByEntityId.has('host:c')).toBe(false);
  });
});
