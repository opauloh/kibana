/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogsDataSourceProfileProvider } from '../profile';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { createGetDefaultAppState } from '../accessors';
import { HOST_NAME_COLUMN, LOG_LEVEL_COLUMN, MESSAGE_COLUMN } from '../consts';
import { createResolve } from './create_resolve';

export const createSystemLogsDataSourceProfileProvider = (
  logsDataSourceProfileProvider: LogsDataSourceProfileProvider
): LogsDataSourceProfileProvider =>
  extendProfileProvider(logsDataSourceProfileProvider, {
    profileId: 'observability-system-logs-data-source-profile',
    profile: {
      getDefaultAppState: createGetDefaultAppState({
        defaultColumns: [
          LOG_LEVEL_COLUMN,
          { name: 'process.name', width: 150 },
          HOST_NAME_COLUMN,
          MESSAGE_COLUMN,
        ],
      }),
    },
    resolve: createResolve('logs-system'),
  });
