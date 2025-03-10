/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { Observable } from 'rxjs';
import type { IKibanaSearchRequest } from '@kbn/search-types';
import { useObservableState } from '../../hooks/use_observable';
import type { ParsedDataSearchResponseDescriptor } from './types';

export const useDataSearchResponseState = <
  Request extends IKibanaSearchRequest,
  Response,
  InitialResponse
>(
  response$: Observable<ParsedDataSearchResponseDescriptor<Request, Response | InitialResponse>>
) => {
  const { latestValue } = useObservableState(response$, undefined);

  const cancelRequest = useCallback(() => {
    latestValue?.abortController.abort();
  }, [latestValue]);

  return {
    cancelRequest,
    isRequestRunning: latestValue?.response.isRunning ?? false,
    isResponsePartial: latestValue?.response.isPartial ?? false,
    latestResponseData: latestValue?.response.data,
    latestResponseErrors: latestValue?.response.errors,
    loaded: latestValue?.response.loaded,
    total: latestValue?.response.total,
  };
};
