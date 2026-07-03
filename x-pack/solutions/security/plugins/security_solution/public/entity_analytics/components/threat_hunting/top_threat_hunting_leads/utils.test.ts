/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coerceRiskLevel, getLeadEntityIds, resolveLeadRiskScore } from './utils';
import type { LeadRiskScore } from './utils';
import type { HuntingLead, Observation } from './types';

const createObservation = (overrides: Partial<Observation> = {}): Observation => ({
  entityId: 'host:entity-1',
  moduleId: 'risk_analysis',
  type: 'high_risk_score',
  score: 80,
  severity: 'high',
  confidence: 0.9,
  description: 'Risk score above threshold',
  metadata: {},
  ...overrides,
});

const createLead = (observations: Observation[]): HuntingLead => ({
  id: 'lead-1',
  title: 'Test Lead',
  byline: 'Test byline',
  description: 'Test description',
  entities: [{ type: 'host', name: 'server-01' }],
  tags: [],
  priority: 8,
  chatRecommendations: [],
  timestamp: '2026-03-01T00:00:00.000Z',
  staleness: 'fresh',
  status: 'active',
  observations,
  sourceType: 'adhoc',
});

describe('coerceRiskLevel', () => {
  it('passes through known levels', () => {
    expect(coerceRiskLevel('Critical')).toBe('Critical');
    expect(coerceRiskLevel('Moderate')).toBe('Moderate');
  });

  it('falls back to Unknown for invalid or missing values', () => {
    expect(coerceRiskLevel('Bogus')).toBe('Unknown');
    expect(coerceRiskLevel(undefined)).toBe('Unknown');
    expect(coerceRiskLevel(null)).toBe('Unknown');
  });
});

describe('getLeadEntityIds', () => {
  it('returns the unique entity EUIDs referenced by a lead', () => {
    const lead = createLead([
      createObservation({ entityId: 'host:a' }),
      createObservation({ entityId: 'host:a' }),
      createObservation({ entityId: 'user:b' }),
    ]);

    expect(getLeadEntityIds(lead)).toEqual(['host:a', 'user:b']);
  });

  it('returns an empty array when there are no observations', () => {
    expect(getLeadEntityIds(createLead([]))).toEqual([]);
  });
});

describe('resolveLeadRiskScore', () => {
  const riskByEntityId = new Map<string, LeadRiskScore>([
    ['host:a', { score: 55, level: 'Moderate' }],
    ['user:b', { score: 90, level: 'Critical' }],
  ]);

  it('resolves the risk for a lead from the map', () => {
    const lead = createLead([createObservation({ entityId: 'host:a' })]);

    expect(resolveLeadRiskScore(lead, riskByEntityId)).toEqual({ score: 55, level: 'Moderate' });
  });

  it('picks the highest score when a lead references multiple entities', () => {
    const lead = createLead([
      createObservation({ entityId: 'host:a' }),
      createObservation({ entityId: 'user:b' }),
    ]);

    expect(resolveLeadRiskScore(lead, riskByEntityId)).toEqual({ score: 90, level: 'Critical' });
  });

  it('returns undefined when none of the lead entities are in the map', () => {
    const lead = createLead([createObservation({ entityId: 'host:missing' })]);

    expect(resolveLeadRiskScore(lead, riskByEntityId)).toBeUndefined();
  });
});
