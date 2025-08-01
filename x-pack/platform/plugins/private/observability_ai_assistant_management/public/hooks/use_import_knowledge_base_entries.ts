/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { REACT_QUERY_KEYS } from '../constants';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useImportKnowledgeBaseEntries() {
  const {
    observabilityAIAssistant,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();
  const observabilityAIAssistantApi = observabilityAIAssistant.service.callApi;

  return useMutation<
    void,
    ServerError,
    {
      entries: Array<
        Omit<KnowledgeBaseEntry, '@timestamp' | 'public' | 'labels'> & { title: string }
      >;
    }
  >(
    [REACT_QUERY_KEYS.IMPORT_KB_ENTRIES],
    ({ entries }) => {
      return observabilityAIAssistantApi(
        'POST /internal/observability_ai_assistant/kb/entries/import',
        {
          signal: null,
          params: {
            body: {
              entries,
            },
          },
        }
      );
    },
    {
      networkMode: 'always',
      onSuccess: (_data, { entries }) => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.importEntries.successNotification',
            {
              defaultMessage: 'Successfully imported {number} items',
              values: { number: entries.length },
            }
          )
        );

        queryClient.invalidateQueries({
          queryKey: [REACT_QUERY_KEYS.GET_KB_ENTRIES],
          refetchType: 'all',
        });
      },
      onError: (error) => {
        toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.kb.importEntries.errorNotification',
            {
              defaultMessage: 'Something went wrong while importing items',
            }
          ),
        });
      },
    }
  );
}
