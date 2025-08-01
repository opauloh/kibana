/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MsearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { SyntheticsEsClient } from './lib';
import { savedObjectsClientMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

describe('SyntheticsEsClient', () => {
  let syntheticsEsClient: SyntheticsEsClient;
  const savedObjectsClient = savedObjectsClientMock.create();
  const esClient = elasticsearchClientMock.createClusterClient().asInternalUser;

  beforeEach(() => {
    syntheticsEsClient = new SyntheticsEsClient(savedObjectsClient, esClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('msearch', () => {
    it('should call baseESClient.msearch with correct parameters', async () => {
      esClient.msearch.mockResolvedValueOnce({
        body: {
          responses: [
            { aggregations: { aggName: { value: 'str' } } },
            { aggregations: { aggName: { value: 'str' } } },
          ],
        },
      } as unknown as MsearchResponse);

      const mockSearchParams = [
        {
          query: {
            match_all: {},
          },
        },
        {
          query: {
            match_all: {},
          },
        },
      ];

      const result = await syntheticsEsClient.msearch(mockSearchParams);

      expect(esClient.msearch).toHaveBeenCalledWith(
        {
          searches: [
            {
              index: 'synthetics-*',
              ignore_unavailable: true,
            },
            mockSearchParams[0],
            {
              index: 'synthetics-*',
              ignore_unavailable: true,
            },
            mockSearchParams[1],
          ],
        },
        { meta: true }
      );

      expect(result).toMatchInlineSnapshot(`
        Object {
          "responses": Array [
            Object {
              "aggregations": Object {
                "aggName": Object {
                  "value": "str",
                },
              },
            },
            Object {
              "aggregations": Object {
                "aggName": Object {
                  "value": "str",
                },
              },
            },
          ],
        }
      `);
    });
  });

  describe('search', () => {
    it('should call baseESClient.search with correct parameters', async () => {
      const mockSearchParams = {
        ignore_unavailable: true,
        query: {
          match_all: {},
        },
      };

      const result = await syntheticsEsClient.search({
        query: {
          match_all: {},
        },
      });

      expect(esClient.search).toHaveBeenCalledWith(
        {
          index: 'synthetics-*',
          ...mockSearchParams,
        },
        { meta: true, context: { loggingOptions: { loggerName: 'synthetics' } } }
      );
      expect(result).toEqual({
        body: {},
        headers: {
          'x-elastic-product': 'Elasticsearch',
        },
        meta: {},
        statusCode: 200,
        warnings: [],
      });
    });

    it('should throw an error if baseESClient.search throws an error', async () => {
      const mockSearchParams = {
        ignore_unavailable: true,
        query: {
          match_all: {},
        },
      };
      const mockError = new Error('Search error');
      esClient.search.mockRejectedValueOnce(mockError);

      await expect(syntheticsEsClient.search(mockSearchParams)).rejects.toThrow(mockError);
      expect(esClient.search).toHaveBeenCalledWith(
        {
          index: 'synthetics-*',
          ...mockSearchParams,
        },
        { meta: true, context: { loggingOptions: { loggerName: 'synthetics' } } }
      );
    });
  });

  describe('count', () => {
    it('should call baseESClient.count with correct parameters', async () => {
      const mockCountParams = {
        index: 'example',
        ignore_unavailable: true,
      };

      const result = await syntheticsEsClient.count(mockCountParams);

      expect(esClient.count).toHaveBeenCalledWith(mockCountParams, {
        meta: true,
        context: { loggingOptions: { loggerName: 'synthetics' } },
      });
      expect(result).toEqual({
        indices: 'synthetics-*',
        result: {
          body: {},
          headers: {
            'x-elastic-product': 'Elasticsearch',
          },
          meta: {},
          statusCode: 200,
          warnings: [],
        },
      });
    });

    it('should throw an error if baseESClient.count throws an error', async () => {
      const mockCountParams = {
        ignore_unavailable: true,
        index: 'example',
      };
      const mockError = new Error('Count error');
      esClient.count.mockRejectedValueOnce(mockError);

      await expect(syntheticsEsClient.count(mockCountParams)).rejects.toThrow(mockError);
      expect(esClient.count).toHaveBeenCalledWith(mockCountParams, {
        meta: true,
        context: { loggingOptions: { loggerName: 'synthetics' } },
      });
    });
  });

  describe('getInspectEnabled', () => {
    it('should return false if uiSettings is not available', async () => {
      const result = await syntheticsEsClient.getInspectEnabled();

      expect(result).toBe(false);
    });

    it('should return the value from uiSettings if available', async () => {
      const mockUiSettings = uiSettingsServiceMock.createClient();
      syntheticsEsClient.uiSettings = {
        client: mockUiSettings,
      } as any;

      // @ts-expect-error
      mockUiSettings.get.mockReturnValue(true);

      await syntheticsEsClient.getInspectEnabled();

      expect(syntheticsEsClient.isInspectorEnabled).toBe(true);
      expect(mockUiSettings.get).toHaveBeenCalledWith('observability:enableInspectEsQueries');
    });
  });
});
