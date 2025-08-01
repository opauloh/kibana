/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { CoreStart, HttpStart, I18nStart, IUiSettingsClient } from '@kbn/core/public';
import { CoreSetup } from '@kbn/core/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ISessionsClient, SearchUsageCollector } from '../../..';
import { SEARCH_SESSIONS_MANAGEMENT_ID, BACKGROUND_SEARCH_ENABLED } from '../constants';
import type { SearchSessionsMgmtAPI } from './lib/api';
import type { AsyncSearchIntroDocumentation } from './lib/documentation';
import type { SearchSessionsConfigSchema } from '../../../../server/config';

// We want to expose the table from the start contract so we can use it in some other places
export { SearchSessionsMgmtTable } from './components/table';

export interface IManagementSectionsPluginsSetup {
  management: ManagementSetup;
  searchUsageCollector: SearchUsageCollector;
  sessionsClient: ISessionsClient;
}

export interface IManagementSectionsPluginsStart {
  share: SharePluginStart;
}

export interface AppDependencies {
  share: SharePluginStart;
  uiSettings: IUiSettingsClient;
  documentation: AsyncSearchIntroDocumentation;
  core: CoreStart; // for RedirectAppLinks
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  i18n: I18nStart;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  searchUsageCollector: SearchUsageCollector;
}

export const APP = {
  id: SEARCH_SESSIONS_MANAGEMENT_ID,
  getI18nName: (): string =>
    BACKGROUND_SEARCH_ENABLED
      ? i18n.translate('data.mgmt.backgroundSearch.appTitle', {
          defaultMessage: 'Background Search',
        })
      : i18n.translate('data.mgmt.searchSessions.appTitle', {
          defaultMessage: 'Search Sessions',
        }),
};

export function registerSearchSessionsMgmt(
  coreSetup: CoreSetup<IManagementSectionsPluginsStart>,
  deps: IManagementSectionsPluginsSetup,
  config: SearchSessionsConfigSchema,
  kibanaVersion: string
) {
  deps.management.sections.section.kibana.registerApp({
    id: APP.id,
    title: APP.getI18nName(),
    order: 1.75,
    mount: async (params) => {
      const { SearchSessionsMgmtApp: MgmtApp } = await import('./application');
      const mgmtApp = new MgmtApp(coreSetup, deps, config, kibanaVersion, params);
      return mgmtApp.mountManagementSection();
    },
  });
}
