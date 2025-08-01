/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart, CoreTheme } from '@kbn/core/public';
import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import type { History } from 'history';
import React from 'react';
import type { Observable } from 'rxjs';
import type { AIAssistantAppService } from '@kbn/ai-assistant';
import type { ObservabilityAIAssistantAppPluginStartDependencies } from './types';
import { SharedProviders } from './utils/shared_providers';
import { observabilityAIAssistantRouter } from './routes/config';

// This is the Conversation application.

export function Application({
  coreStart,
  history,
  pluginsStart,
  service,
  theme$,
}: {
  coreStart: CoreStart;
  history: History;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
  service: AIAssistantAppService;
  theme$: Observable<CoreTheme>;
}) {
  return (
    <SharedProviders
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      service={service}
      theme$={theme$}
    >
      {/* @ts-expect-error upgrade typescript v5.4.5 */}
      <RouterProvider history={history} router={observabilityAIAssistantRouter}>
        <RouteRenderer />
      </RouterProvider>
    </SharedProviders>
  );
}
