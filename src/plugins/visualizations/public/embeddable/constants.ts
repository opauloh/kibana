/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { VISUALIZE_EMBEDDABLE_TYPE } from '../../common/constants';

export const COMMON_VISUALIZATION_GROUPING = [
  {
    id: 'visualizations',
    getDisplayName: () => 'Visualizations',
    getIconType: () => {
      return 'visGauge';
    },
    order: 1000,
  },
];
