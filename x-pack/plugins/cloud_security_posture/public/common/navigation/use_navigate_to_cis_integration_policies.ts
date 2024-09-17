/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters, pkgKeyFromPackageInfo } from '@kbn/fleet-plugin/public';
import { useCisKubernetesIntegration } from '../api/use_cis_kubernetes_integration';
import { useKibana } from '../hooks/use_kibana';
import { useCspBenchmarkIntegrationsV1 } from '../../pages/benchmarks/use_csp_benchmark_integrations';
import { PostureTypes } from '../../../common/types_old';

export const useCISIntegrationPoliciesLink = ({ postureType }: { postureType: PostureTypes }) => {
  const { http } = useKibana().services;

  const cisIntegration = useCisKubernetesIntegration();

  const cspBenchmarkIntegrations = useCspBenchmarkIntegrationsV1({
    name: '',
    page: 1,
    perPage: 100,
    sortField: 'package_policy.name',
    sortOrder: 'asc',
  });

  if (cisIntegration.isError) {
    return {
      isError: true,
      error: String(cisIntegration.error),
    };
  }
  if (cspBenchmarkIntegrations.isError) {
    return {
      isError: true,
      error: String(cspBenchmarkIntegrations.error),
    };
  }

  if (!cisIntegration.data || !cspBenchmarkIntegrations.data) {
    return undefined;
  }

  const integrations = cspBenchmarkIntegrations.data?.items;

  const matchedIntegration = integrations?.find(
    (integration) =>
      integration?.package_policy?.inputs?.find((input) => input?.enabled)?.policy_template ===
      postureType
  );
  const addAgentToPolicyId = matchedIntegration?.agent_policy.id || '';
  const integration = matchedIntegration?.package_policy.id || '';

  const path = pagePathGetters
    .integration_details_policies({
      addAgentToPolicyId,
      integration,
      pkgkey: pkgKeyFromPackageInfo({
        name: cisIntegration.data.item.name,
        version: cisIntegration.data.item.version,
      }),
    })
    .join('');

  return {
    isError: false,
    link: http.basePath.prepend(path),
  };
};
