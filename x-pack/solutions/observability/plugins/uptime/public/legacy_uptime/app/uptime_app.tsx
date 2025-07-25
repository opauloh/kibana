/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { Router } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';
import { I18nStart, ChromeBreadcrumb, CoreStart, AppMountParameters } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';
import { UMUpdateBadge } from '../lib/lib';
import {
  UptimeRefreshContextProvider,
  UptimeSettingsContextProvider,
  UptimeStartupPluginsContextProvider,
} from '../contexts';
import { CommonlyUsedRange } from '../components/common/uptime_date_picker';
import { setBasePath } from '../state/actions';
import { PageRouter } from '../routes';
import { UptimeAlertsFlyoutWrapper } from '../components/overview';
import { store, storage } from '../state';
import { kibanaService } from '../state/kibana_service';
import { ActionMenu } from '../components/common/header/action_menu';
import { UptimeDataViewContextProvider } from '../contexts/uptime_data_view_context';

export interface UptimeAppProps {
  basePath: string;
  canSave: boolean;
  core: CoreStart;
  darkMode: boolean;
  i18n: I18nStart;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  plugins: ClientPluginsSetup;
  startPlugins: ClientPluginsStart;
  setBadge: UMUpdateBadge;
  renderGlobalHelpControls(): void;
  commonlyUsedRanges: CommonlyUsedRange[];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  appMountParameters: AppMountParameters;
  isDev: boolean;
}

const Application = (props: UptimeAppProps) => {
  const {
    basePath,
    canSave,
    core,
    darkMode,
    plugins,
    renderGlobalHelpControls,
    setBadge,
    startPlugins,
    appMountParameters,
  } = props;

  useEffect(() => {
    renderGlobalHelpControls();
    setBadge(
      !canSave
        ? {
            text: i18n.translate('xpack.uptime.badge.readOnly.text', {
              defaultMessage: 'Read only',
            }),
            tooltip: i18n.translate('xpack.uptime.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to save',
            }),
            iconType: 'glasses',
          }
        : undefined
    );
  }, [canSave, renderGlobalHelpControls, setBadge]);

  kibanaService.core = core;
  kibanaService.theme = props.appMountParameters.theme$;

  store.dispatch(setBasePath(basePath));

  return (
    <KibanaRenderContextProvider {...core}>
      <KibanaThemeProvider
        theme={core.theme}
        modify={{
          breakpoint: {
            xxl: 1600,
            xxxl: 2000,
          },
        }}
      >
        <ReduxProvider store={store}>
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
              storage,
              data: startPlugins.data,
              unifiedSearch: startPlugins.unifiedSearch,
              fleet: startPlugins.fleet,
              inspector: startPlugins.inspector,
              triggersActionsUi: startPlugins.triggersActionsUi,
              observability: startPlugins.observability,
              observabilityShared: startPlugins.observabilityShared,
              exploratoryView: startPlugins.exploratoryView,
            }}
          >
            <Router history={appMountParameters.history}>
              <EuiThemeProvider darkMode={darkMode}>
                <UptimeRefreshContextProvider>
                  <UptimeSettingsContextProvider {...props}>
                    <UptimeStartupPluginsContextProvider {...startPlugins}>
                      <UptimeDataViewContextProvider dataViews={startPlugins.dataViews}>
                        <PerformanceContextProvider>
                          <div className={APP_WRAPPER_CLASS} data-test-subj="uptimeApp">
                            <RedirectAppLinks
                              coreStart={{
                                application: core.application,
                              }}
                            >
                              <InspectorContextProvider>
                                <UptimeAlertsFlyoutWrapper />
                                <PageRouter />
                                <ActionMenu appMountParameters={appMountParameters} />
                              </InspectorContextProvider>
                            </RedirectAppLinks>
                          </div>
                        </PerformanceContextProvider>
                      </UptimeDataViewContextProvider>
                    </UptimeStartupPluginsContextProvider>
                  </UptimeSettingsContextProvider>
                </UptimeRefreshContextProvider>
              </EuiThemeProvider>
            </Router>
          </KibanaContextProvider>
        </ReduxProvider>
      </KibanaThemeProvider>
    </KibanaRenderContextProvider>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
