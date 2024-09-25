/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters, pkgKeyFromPackageInfo } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import type { CloudSecurityPolicyTemplate } from '../../../common/types_old';
import { useCisKubernetesIntegration } from '../api/use_cis_kubernetes_integration';
import { useKibana } from '../hooks/use_kibana';

const parseIntegrationResponseError = (error: Error) => {
  if (String(error) === 'Error: Forbidden') {
    return i18n.translate('xpack.cloudSecurityPosture.cisKubernetesIntegration.forbiddenError', {
      defaultMessage: 'You do not have Kibana integrations privileges',
    });
  }

  return String(error);
};

export const useCspIntegrationLink = (policyTemplate: CloudSecurityPolicyTemplate) => {
  const { http } = useKibana().services;
  const cisIntegration = useCisKubernetesIntegration();

  if (cisIntegration.isError) {
    return {
      isError: true,
      error: parseIntegrationResponseError(cisIntegration.error),
    };
  }

  if (!cisIntegration.data) {
    return;
  }

  const path = pagePathGetters
    .add_integration_to_policy({
      integration: policyTemplate,
      pkgkey: pkgKeyFromPackageInfo({
        name: cisIntegration.data.item.name,
        version: cisIntegration.data.item.version,
      }),
    })
    .join('');

  return {
    link: http.basePath.prepend(path),
    isError: false,
  };
};
