/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../../..',
  roots: [
    '<rootDir>/x-pack/platform/plugins/shared/streams_app/public',
    '<rootDir>/x-pack/platform/plugins/shared/streams_app/common',
    '<rootDir>/x-pack/platform/plugins/shared/streams_app/server',
  ],
  setupFiles: ['<rootDir>/x-pack/platform/plugins/shared/streams_app/.storybook/jest_setup.js'],
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/x-pack/platform/plugins/shared/streams_app/{public,common,server}/**/*.{js,ts,tsx}',
  ],

  coverageReporters: ['html'],
};
