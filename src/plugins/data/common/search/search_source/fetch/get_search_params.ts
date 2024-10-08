/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { UI_SETTINGS } from '../../../constants';
import { GetConfigFn } from '../../../types';
import type { SearchRequest } from './types';

const sessionId = Date.now();

export function getSearchParams(getConfig: GetConfigFn) {
  return {
    preference: getPreference(getConfig),
  };
}

export function getPreference(getConfig: GetConfigFn) {
  const setRequestPreference = getConfig(UI_SETTINGS.COURIER_SET_REQUEST_PREFERENCE);
  if (setRequestPreference === 'sessionId') return sessionId;
  return setRequestPreference === 'custom'
    ? getConfig(UI_SETTINGS.COURIER_CUSTOM_REQUEST_PREFERENCE)
    : undefined;
}

/** @public */
// TODO: Could provide this on runtime contract with dependencies
// already wired up.
export function getSearchParamsFromRequest(
  searchRequest: SearchRequest,
  dependencies: { getConfig: GetConfigFn }
): ISearchRequestParams {
  const { getConfig } = dependencies;
  const searchParams = getSearchParams(getConfig);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { track_total_hits, ...body } = searchRequest.body;
  const dataView = typeof searchRequest.index !== 'string' ? searchRequest.index : undefined;
  const index = dataView?.title ?? `${searchRequest.index}`;

  return {
    index,
    body,
    // @ts-ignore
    track_total_hits,
    ...(dataView?.getAllowHidden() && { expand_wildcards: 'all' }),
    ...searchParams,
  };
}
