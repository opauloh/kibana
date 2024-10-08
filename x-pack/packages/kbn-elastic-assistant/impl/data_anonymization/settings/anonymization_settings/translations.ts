/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.dataAnonymization.settings.anonymizationSettings.settingsTitle',
  {
    defaultMessage: 'Anonymization',
  }
);
export const SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.dataAnonymization.settings.anonymizationSettings.settingsDescription',
  {
    defaultMessage:
      'Define privacy settings for event data sent to third-party LLM providers. You can choose which fields to include, and which to anonymize by replacing their values with random strings. Helpful defaults are provided below.',
  }
);
