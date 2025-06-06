/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

export const useOnboardingStyles = () => {
  const { euiTheme } = useEuiTheme();

  return css`
    .onboardingSection {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;
};
