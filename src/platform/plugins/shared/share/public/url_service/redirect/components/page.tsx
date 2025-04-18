/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import useObservable from 'react-use/lib/useObservable';

import { EuiPageTemplate, EuiDelayRender } from '@elastic/eui';
import type { CustomBrandingSetup } from '@kbn/core-custom-branding-browser';
import type { ChromeDocTitle, ThemeServiceSetup } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import type { UserProfileService } from '@kbn/core-user-profile-browser';

import type { RedirectManager } from '../redirect_manager';
import { RedirectEmptyPrompt } from './empty_prompt';
import { Spinner } from './spinner';

export interface PageProps {
  homeHref: string;
  docTitle: ChromeDocTitle;
  customBranding: CustomBrandingSetup;
  manager: Pick<RedirectManager, 'error$'>;
  theme: ThemeServiceSetup;
  userProfile: UserProfileService;
}

export const Page: React.FC<PageProps> = ({
  manager,
  homeHref,
  customBranding,
  docTitle,
  ...startServices
}) => {
  const error = useObservable(manager.error$);
  const hasCustomBranding = useObservable(customBranding.hasCustomBranding$);

  if (error) {
    return (
      <KibanaThemeProvider {...startServices}>
        <EuiPageTemplate minHeight={0} offset={0}>
          <RedirectEmptyPrompt docTitle={docTitle} error={error} homeHref={homeHref} />
        </EuiPageTemplate>
      </KibanaThemeProvider>
    );
  }

  return (
    <KibanaThemeProvider {...startServices}>
      <EuiDelayRender>
        <EuiPageTemplate minHeight={0} offset={0}>
          <Spinner showPlainSpinner={Boolean(hasCustomBranding)} />
        </EuiPageTemplate>
      </EuiDelayRender>
    </KibanaThemeProvider>
  );
};
