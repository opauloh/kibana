/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../utils/kibana_react';

export const useSourceNotifier = () => {
  const {
    services: { notifications },
  } = useKibana();

  const updateFailure = (message?: string) => {
    notifications.toasts.addDanger({
      toastLifeTimeMs: 3000,
      title: i18n.translate(
        'xpack.observability.customThreshold.rule.sourceConfiguration.updateFailureTitle',
        {
          defaultMessage: 'Configuration update failed',
        }
      ),
      text: [
        i18n.translate(
          'xpack.observability.customThreshold.rule.sourceConfiguration.updateFailureBody',
          {
            defaultMessage:
              "We couldn't apply the changes to the Metrics configuration. Try again later.",
          }
        ),
        message,
      ]
        .filter(Boolean)
        .join(' '),
    });
  };

  const updateSuccess = () => {
    notifications.toasts.addSuccess({
      toastLifeTimeMs: 3000,
      title: i18n.translate(
        'xpack.observability.customThreshold.rule.sourceConfiguration.updateSuccessTitle',
        {
          defaultMessage: 'Metrics settings successfully updated',
        }
      ),
    });
  };

  return {
    updateFailure,
    updateSuccess,
  };
};
