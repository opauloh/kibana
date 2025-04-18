/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  DataView,
  DataViewLazy,
  DataViewsContract,
  FieldSpec,
} from '@kbn/data-views-plugin/common';
import { LogSourcesService } from '@kbn/logs-data-access-plugin/common/services/log_sources_service/types';
import { TIEBREAKER_FIELD, TIMESTAMP_FIELD } from '../constants';
import { defaultLogViewsStaticConfig } from './defaults';
import { ResolveLogViewError } from './errors';
import { LogViewAttributes, LogViewColumnConfiguration, LogViewsStaticConfig } from './types';

export type ResolvedLogViewField = FieldSpec;

export interface ResolvedLogView<DataViewReference = DataViewLazy> {
  name: string;
  description: string;
  indices: string;
  timestampField: string;
  tiebreakerField: string;
  messageField: string[];
  runtimeMappings: estypes.MappingRuntimeFields;
  columns: LogViewColumnConfiguration[];
  dataViewReference: DataViewReference;
}

export const resolveLogView = (
  logViewId: string,
  logViewAttributes: LogViewAttributes,
  dataViewsService: DataViewsContract,
  logSourcesService: LogSourcesService,
  config: LogViewsStaticConfig
): Promise<ResolvedLogView> => {
  if (logViewAttributes.logIndices.type === 'index_name') {
    return resolveLegacyReference(logViewId, logViewAttributes, dataViewsService, config);
  } else if (logViewAttributes.logIndices.type === 'data_view') {
    return resolveDataViewReference(logViewAttributes, dataViewsService);
  } else {
    return resolveKibanaAdvancedSettingReference(
      logViewId,
      logViewAttributes,
      dataViewsService,
      logSourcesService
    );
  }
};

const resolveLegacyReference = async (
  logViewId: string,
  logViewAttributes: LogViewAttributes,
  dataViewsService: DataViewsContract,
  config: LogViewsStaticConfig
): Promise<ResolvedLogView> => {
  if (logViewAttributes.logIndices.type !== 'index_name') {
    throw new Error('This function can only resolve legacy references');
  }

  const indices = logViewAttributes.logIndices.indexName;
  const dataViewReference = await dataViewsService
    .createDataViewLazy({
      id: `log-view-${logViewId}`,
      name: logViewAttributes.name,
      title: indices,
      timeFieldName: TIMESTAMP_FIELD,
      allowNoIndex: true,
    })
    .catch((error) => {
      throw new ResolveLogViewError(`Failed to create Data View reference: ${error}`, error);
    });

  return {
    indices,
    timestampField: TIMESTAMP_FIELD,
    tiebreakerField: TIEBREAKER_FIELD,
    messageField: config.messageFields ?? defaultLogViewsStaticConfig.messageFields,
    runtimeMappings: {},
    columns: logViewAttributes.logColumns,
    name: logViewAttributes.name,
    description: logViewAttributes.description,
    dataViewReference,
  };
};

const resolveDataViewReference = async (
  logViewAttributes: LogViewAttributes,
  dataViewsService: DataViewsContract
): Promise<ResolvedLogView> => {
  if (logViewAttributes.logIndices.type !== 'data_view') {
    throw new Error('This function can only resolve Kibana data view references');
  }

  const { dataViewId } = logViewAttributes.logIndices;

  const dataViewLazy = await dataViewsService.getDataViewLazy(dataViewId).catch((error) => {
    throw new ResolveLogViewError(`Failed to fetch data view "${dataViewId}": ${error}`, error);
  });

  return {
    indices: dataViewLazy.getIndexPattern(),
    timestampField: dataViewLazy.timeFieldName ?? TIMESTAMP_FIELD,
    tiebreakerField: TIEBREAKER_FIELD,
    messageField: ['message'],
    runtimeMappings: resolveRuntimeMappings(dataViewLazy),
    columns: logViewAttributes.logColumns,
    name: logViewAttributes.name,
    description: logViewAttributes.description,
    dataViewReference: dataViewLazy,
  };
};

const resolveKibanaAdvancedSettingReference = async (
  logViewId: string,
  logViewAttributes: LogViewAttributes,
  dataViewsService: DataViewsContract,
  logSourcesService: LogSourcesService
): Promise<ResolvedLogView> => {
  if (logViewAttributes.logIndices.type !== 'kibana_advanced_setting') {
    throw new Error(
      'This function can only resolve references to the Log Sources Kibana advanced setting'
    );
  }

  const indices = (await logSourcesService.getLogSources())
    .map((logSource) => logSource.indexPattern)
    .join(',');
  const dataViewReference = await dataViewsService
    .createDataViewLazy({
      id: `log-view-${logViewId}`,
      name: logViewAttributes.name,
      title: indices,
      timeFieldName: TIMESTAMP_FIELD,
      allowNoIndex: true,
    })
    .catch((error) => {
      throw new ResolveLogViewError(`Failed to create Data View reference: ${error}`, error);
    });

  return {
    indices,
    timestampField: TIMESTAMP_FIELD,
    tiebreakerField: TIEBREAKER_FIELD,
    messageField: ['message'],
    runtimeMappings: {},
    columns: logViewAttributes.logColumns,
    name: logViewAttributes.name,
    description: logViewAttributes.description,
    dataViewReference,
  };
};

// this might take other sources of runtime fields into account in the future
const resolveRuntimeMappings = (
  dataViewLazy: DataView | DataViewLazy
): estypes.MappingRuntimeFields => {
  return dataViewLazy.getRuntimeMappings();
};
