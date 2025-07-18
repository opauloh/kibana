/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { registerCloudDeploymentMetadataAnalyticsContext } from './register_cloud_deployment_id_analytics_context';

describe('registerCloudDeploymentIdAnalyticsContext', () => {
  let analytics: { registerContextProvider: jest.Mock };
  beforeEach(() => {
    analytics = {
      registerContextProvider: jest.fn(),
    };
  });

  test('it does not register the context provider if cloudId not provided', () => {
    registerCloudDeploymentMetadataAnalyticsContext(analytics, {});
    expect(analytics.registerContextProvider).not.toHaveBeenCalled();
  });

  test('it registers the context provider and emits the cloudId', async () => {
    registerCloudDeploymentMetadataAnalyticsContext(analytics, { id: 'cloud_id' });
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(1);
    const [{ context$ }] = analytics.registerContextProvider.mock.calls[0];
    await expect(firstValueFrom(context$)).resolves.toEqual({
      cloudId: 'cloud_id',
    });
  });

  test('it registers the context provider and emits the cloudId and deploymentId', async () => {
    registerCloudDeploymentMetadataAnalyticsContext(analytics, {
      id: 'cloud_id',
      deployment_url: 'deployments/uuid-of-my-deployment',
    });
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(1);
    const [{ context$ }] = analytics.registerContextProvider.mock.calls[0];
    await expect(firstValueFrom(context$)).resolves.toEqual({
      cloudId: 'cloud_id',
      deploymentId: 'uuid-of-my-deployment',
    });
  });

  test('it registers the context provider and emits the cloudId, projectId, project type, and product tier', async () => {
    registerCloudDeploymentMetadataAnalyticsContext(analytics, {
      id: 'cloud_id',
      serverless: {
        project_id: 'a-project-id',
        project_type: 'security',
        product_tier: 'complete',
      },
    });
    expect(analytics.registerContextProvider).toHaveBeenCalledTimes(1);
    const [{ context$ }] = analytics.registerContextProvider.mock.calls[0];
    await expect(firstValueFrom(context$)).resolves.toEqual({
      cloudId: 'cloud_id',
      projectId: 'a-project-id',
      projectType: 'security',
      productTier: 'complete',
    });
  });
});
