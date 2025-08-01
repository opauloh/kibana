/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTestConfig } from '../common/config';

export default createTestConfig('basic', {
  disabledPlugins: [],
  license: 'basic',
  ssl: true,
  enableActionsProxy: false,
  useDedicatedTaskRunner: true,
  enabledRuleTypes: ['test.gold.noop', 'test.noop'],
});
