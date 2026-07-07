/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_VISIBLE_TAGS = 1;

/**
 * Upper bound on how many recent leads are fetched and surfaced anywhere in
 * the UI (main panel count, "See recent leads" label, and the flyout list).
 *
 * Set to 20 to reflect the actual ceiling under normal generation: each
 * run is capped at 10 leads (`DEFAULT_ENGINE_CONFIG.maxLeads`) and persistence
 * replaces prior leads in the index via a `deleteByQuery` keyed on the new
 * `execution_uuid`, so leads don't accumulate indefinitely, so its only possible
 * to have at most 20 recent leads at a time.
 */
export const MAX_RECENT_LEADS = 20;

/**
 * Scope/context id used when opening an entity flyout from a hunting lead
 * badge, so the flyout's own state doesn't collide with other entity flyout
 * consumers on the page (e.g. the entities table).
 */
export const THREAT_HUNTING_LEADS_SCOPE_ID = 'entity-analytics-threat-hunting-leads';

export const getEntityIcon = (entityType: string): string => {
  switch (entityType) {
    case 'user':
      return 'user';
    case 'host':
      return 'storage';
    case 'service':
      return 'node';
    case 'generic':
    default:
      return 'globe';
  }
};
