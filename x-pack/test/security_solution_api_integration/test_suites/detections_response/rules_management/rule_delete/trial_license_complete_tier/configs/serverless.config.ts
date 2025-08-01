/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createCompleteTierTestConfig } from '../../../configs/serverless/rules_management.complete.config';

export default createCompleteTierTestConfig({
  testFiles: [require.resolve('..')],
  junit: {
    reportName:
      'Rules Management - Rule Deletion Integration Tests - Serverless Env - Complete License',
  },
});
