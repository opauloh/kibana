/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ALL_ENTITY_TYPES } from '@kbn/entity-store/public';
import { useEntitiesListQuery } from '../../entity_store/hooks/use_entities_list_query';
import { getEntityRecordRiskForListDisplay } from '../../entity_store/helpers';
import type { HuntingLead } from './types';
import { coerceRiskLevel, getLeadEntityIds, type LeadRiskScore } from './utils';

const MAX_ENTITIES = 10000;

export interface UseLeadEntityRiskScoresResult {
  riskByEntityId: Map<string, LeadRiskScore>;
  isLoading: boolean;
}

/**
 * Batch-fetches the current risk score/level for every entity referenced by the
 * given leads in a single Entity Store query (`terms` on `entity.id`), then maps
 * the results back by EUID. Reading the live entity record means the badge works
 * for entities of any risk level (including Low/Unknown), which the lead's own
 * risk observations do not cover.
 */
export const useLeadEntityRiskScores = (leads: HuntingLead[]): UseLeadEntityRiskScoresResult => {
  const entityIds = useMemo(() => {
    const ids = new Set<string>();
    for (const lead of leads) {
      for (const id of getLeadEntityIds(lead)) {
        ids.add(id);
      }
    }
    return [...ids];
  }, [leads]);

  const { data, isFetching } = useEntitiesListQuery({
    skip: entityIds.length === 0,
    entityTypes: ALL_ENTITY_TYPES,
    page: 1,
    perPage: Math.min(Math.max(entityIds.length, 1), MAX_ENTITIES),
    filterQuery: JSON.stringify({
      bool: { filter: [{ terms: { 'entity.id': entityIds } }] },
    }),
  });

  const riskByEntityId = useMemo(() => {
    const map = new Map<string, LeadRiskScore>();
    for (const record of data?.records ?? []) {
      const id = record.entity?.id;
      const risk = getEntityRecordRiskForListDisplay(record);
      if (id && risk?.calculated_score_norm != null) {
        map.set(id, {
          score: risk.calculated_score_norm,
          level: coerceRiskLevel(risk.calculated_level),
        });
      }
    }
    return map;
  }, [data?.records]);

  return { riskByEntityId, isLoading: isFetching };
};
