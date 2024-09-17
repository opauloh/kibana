/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { epmRouteService, type GetInfoResponse, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../../common/constants';
import { useKibana } from '../hooks/use_kibana';

/**
 * This hook will find our cis integration and return its PackageInfo
 * */
export const useCisKubernetesIntegration = () => {
  const { http } = useKibana().services;

  return useQuery<GetInfoResponse, Error>(
    ['integrations'],
    () =>
      http.get<GetInfoResponse>(epmRouteService.getInfoPath(CLOUD_SECURITY_POSTURE_PACKAGE_NAME), {
        version: API_VERSIONS.public.v1,
      }),
    {
      retry: (failureCount, error) => {
        // Disabling retries on forbidden and not found requests
        if (String(error) === 'Error: Forbidden' || String(error) === 'Error: Not Found') {
          return false;
        }
        return failureCount < 3;
      },
    }
  );
};
