/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  GetInfraMetricsRequestBodyPayloadClient,
  GetInfraMetricsResponsePayload,
} from '@kbn/infra-plugin/common/http_api/infra';
import type { SupertestWithRoleScopeType } from '../../../services';
import { DATES } from '../utils/constants';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

const ENDPOINT = '/api/metrics/infra/host';

const normalizeNewLine = (text: string) => {
  return text.replaceAll(/(\s{2,}|\\n\\s)/g, ' ');
};
export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const roleScopedSupertest = getService('roleScopedSupertest');

  const basePayload: GetInfraMetricsRequestBodyPayloadClient = {
    limit: 10,
    metrics: [
      'cpu',
      'cpuV2',
      'diskSpaceUsage',
      'memory',
      'memoryFree',
      'normalizedLoad1m',
      'rx',
      'tx',
    ],
    from: new Date(DATES['8.0.0'].logs_and_metrics.min).toISOString(),
    to: new Date(DATES['8.0.0'].logs_and_metrics.max).toISOString(),
    query: { bool: { must_not: [], filter: [], should: [], must: [] } },
  };

  describe('Hosts', () => {
    let supertestWithAdminScope: SupertestWithRoleScopeType;

    const makeRequest = async ({
      body,
      invalidBody,
      expectedHTTPCode,
    }: {
      body?: GetInfraMetricsRequestBodyPayloadClient;
      invalidBody?: any;
      expectedHTTPCode: number;
    }) => {
      return supertestWithAdminScope
        .post(ENDPOINT)
        .send(body ?? invalidBody)
        .expect(expectedHTTPCode);
    };

    before(async () => {
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
      });
    });
    after(async () => {
      await supertestWithAdminScope.destroy();
    });

    describe('Fetch hosts', () => {
      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
        );
      });
      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/observability/test/fixtures/es_archives/infra/8.0.0/logs_and_metrics'
        );
      });

      it('should return metrics for a host', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 1 };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        expect(response.body.nodes).length(1);
        expect(response.body.nodes).eql([
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [
              { name: 'cpu', value: 0.44708333333333333 },
              { name: 'cpuV2', value: null },
              { name: 'diskSpaceUsage', value: null },
              { name: 'memory', value: 0.4563333333333333 },
              { name: 'memoryFree', value: 8573890560 },
              { name: 'normalizedLoad1m', value: 0.7375000000000002 },
              { name: 'rx', value: null },
              { name: 'tx', value: null },
            ],
            hasSystemMetrics: true,
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          },
        ]);
      });

      it('should return all hosts if query params is not sent', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['memory'],
          query: undefined,
        };

        const response = await makeRequest({ body, expectedHTTPCode: 200 });
        expect(response.body.nodes).eql([
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [{ name: 'memory', value: 0.4563333333333333 }],
            hasSystemMetrics: true,
            name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
          },
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [{ name: 'memory', value: 0.32066666666666666 }],
            hasSystemMetrics: true,
            name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
          },
          {
            metadata: [
              { name: 'host.os.name', value: 'CentOS Linux' },
              { name: 'cloud.provider', value: 'gcp' },
              { name: 'host.ip', value: null },
            ],
            metrics: [{ name: 'memory', value: 0.2346666666666667 }],
            hasSystemMetrics: true,
            name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
          },
        ]);
      });

      it('should return 3 hosts when filtered by "host.os.name=CentOS Linux"', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['cpuV2'],
          query: { bool: { filter: [{ term: { 'host.os.name': 'CentOS Linux' } }] } },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).eql([
          'gke-observability-8--observability-8--bc1afd95-f0zc',
          'gke-observability-8--observability-8--bc1afd95-ngmh',
          'gke-observability-8--observability-8--bc1afd95-nhhw',
        ]);
      });

      it('should return 0 hosts when filtered by "host.os.name=Ubuntu"', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['cpuV2'],
          query: { bool: { filter: [{ term: { 'host.os.name': 'Ubuntu' } }] } },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).eql([]);
      });

      it('should return 0 hosts when filtered by not "host.name=gke-observability-8--observability-8--bc1afd95-nhhw"', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = {
          ...basePayload,
          metrics: ['cpuV2'],
          query: {
            bool: {
              must_not: [
                { term: { 'host.name': 'gke-observability-8--observability-8--bc1afd95-nhhw' } },
              ],
            },
          },
        };
        const response = await makeRequest({ body, expectedHTTPCode: 200 });

        const names = (response.body as GetInfraMetricsResponsePayload).nodes.map((p) => p.name);
        expect(names).eql([
          'gke-observability-8--observability-8--bc1afd95-f0zc',
          'gke-observability-8--observability-8--bc1afd95-ngmh',
        ]);
      });
    });

    describe('Endpoint validations', () => {
      it('should fail when limit is 0', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 0 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: 0 does not match expected type InRange in limit: 0 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when limit is negative', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: -2 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: -2 does not match expected type InRange in limit: -2 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when limit above 500', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 501 };
        const response = await makeRequest({ body, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in limit: 501 does not match expected type InRange in limit: 501 does not match expected type pipe(undefined, BooleanFromString)'
        );
      });

      it('should fail when metric is invalid', async () => {
        const invalidBody = { ...basePayload, metrics: ['any'] };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in metrics/0: "any" does not match expected type "cpu" | "cpuV2" | "normalizedLoad1m" | "diskSpaceUsage" | "memory" | "memoryFree" | "rx" | "tx" | "rxV2" | "txV2"'
        );
      });

      it('should pass when limit is 1', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 1 };
        await makeRequest({ body, expectedHTTPCode: 200 });
      });

      it('should pass when limit is 500', async () => {
        const body: GetInfraMetricsRequestBodyPayloadClient = { ...basePayload, limit: 500 };
        await makeRequest({ body, expectedHTTPCode: 200 });
      });

      it('should fail when from and to are not informed', async () => {
        const invalidBody = { ...basePayload, from: undefined, to: undefined };
        const response = await makeRequest({ invalidBody, expectedHTTPCode: 400 });

        expect(normalizeNewLine(response.body.message)).to.be(
          '[request body]: Failed to validate: in from: undefined does not match expected type isoToEpochRt in to: undefined does not match expected type isoToEpochRt'
        );
      });
    });
  });
}
