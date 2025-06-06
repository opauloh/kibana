/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EmptyPage } from './empty_page';
import { StoryProvidersComponent } from '../../mocks/story_providers';

export default {
  component: BasicEmptyPage,
  title: 'EmptyPage',
};

export function BasicEmptyPage() {
  const kibana = {
    http: {
      basePath: {
        get: () => '',
      },
    },
    docLinks: {
      links: {
        securitySolution: {
          threatIntelInt: 'https://google.com',
        },
      },
    },
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <StoryProvidersComponent kibana={kibana as any}>
      <EmptyPage />
    </StoryProvidersComponent>
  );
}
