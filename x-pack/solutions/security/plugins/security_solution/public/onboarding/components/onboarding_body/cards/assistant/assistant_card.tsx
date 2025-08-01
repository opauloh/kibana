/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  useAssistantContext,
  type Conversation,
  useAssistantLastConversation,
} from '@kbn/elastic-assistant';
import { useCurrentConversation } from '@kbn/elastic-assistant/impl/assistant/use_current_conversation';
import { useDataStreamApis } from '@kbn/elastic-assistant/impl/assistant/use_data_stream_apis';
import { getDefaultConnector } from '@kbn/elastic-assistant/impl/assistant/helpers';
import {
  getGenAiConfig,
  isElasticManagedLlmConnector,
} from '@kbn/elastic-assistant/impl/connectorland/helpers';
import { useConversation } from '@kbn/elastic-assistant/impl/assistant/use_conversation';

import { CenteredLoadingSpinner } from '../../../../../common/components/centered_loading_spinner';
import type { OnboardingCardComponent } from '../../../../types';
import * as i18n from './translations';
import { ConnectorsMissingPrivilegesCallOut } from '../common/connectors/missing_privileges';
import { useStoredAssistantConnectorId } from '../../../hooks/use_stored_state';
import { useOnboardingContext } from '../../../onboarding_context';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { ConnectorCards } from '../common/connectors/connector_cards';
import { CardSubduedText } from '../common/card_subdued_text';
import type { AIConnector } from '../common/connectors/types';
import type { AssistantCardMetadata } from './types';
import { ElasticAIFeatureMessage } from './ai_feature_message';

export const AssistantCard: OnboardingCardComponent<AssistantCardMetadata> = ({
  isCardComplete,
  setExpandedCardId,
  checkCompleteMetadata,
  checkComplete,
  isCardAvailable,
}) => {
  const { spaceId } = useOnboardingContext();
  const { connectors, canExecuteConnectors, canCreateConnectors } = checkCompleteMetadata ?? {};

  const [selectedConnectorId, setSelectedConnectorId] = useStoredAssistantConnectorId(spaceId);

  const defaultConnector = useMemo(() => getDefaultConnector(connectors), [connectors]);

  const { setApiConfig } = useConversation();

  const {
    http,
    assistantAvailability: { isAssistantEnabled },
  } = useAssistantContext();
  const { getLastConversation, setLastConversation } = useAssistantLastConversation({ spaceId });
  const {
    allSystemPrompts,
    conversations,
    isFetchedCurrentUserConversations,
    isFetchedPrompts,
    refetchCurrentUserConversations,
  } = useDataStreamApis({ http, isAssistantEnabled });

  const { currentConversation, handleOnConversationSelected } = useCurrentConversation({
    allSystemPrompts,
    conversations,
    defaultConnector,
    spaceId,
    refetchCurrentUserConversations,
    lastConversation: getLastConversation(),
    mayUpdateConversations:
      isFetchedCurrentUserConversations &&
      isFetchedPrompts &&
      Object.keys(conversations).length > 0,
    setLastConversation,
  });

  const onConversationChange = useCallback(
    (updatedConversation: Conversation) => {
      handleOnConversationSelected({
        cId: updatedConversation.id,
        cTitle: updatedConversation.title,
      });
    },
    [handleOnConversationSelected]
  );

  const onConnectorSelected = useCallback(
    async (connector: AIConnector) => {
      const connectorId = connector.id;

      const config = getGenAiConfig(connector);
      const apiProvider = config?.apiProvider;
      const model = config?.defaultModel;
      if (currentConversation != null) {
        const conversation = await setApiConfig({
          conversation: currentConversation,
          apiConfig: {
            ...currentConversation.apiConfig,
            actionTypeId: connector.actionTypeId,
            connectorId,
            // With the inline component, prefer config args to handle 'new connector' case
            provider: apiProvider,
            model,
          },
        }).catch(() => {
          // If the conversation is not found, it means the connector was deleted
          // and return null to avoid setting the conversation
          return null;
        });

        if (conversation && onConversationChange != null) {
          onConversationChange(conversation);
        }
      }

      if (connector) {
        setSelectedConnectorId(connectorId);
      }
    },
    [currentConversation, setApiConfig, onConversationChange, setSelectedConnectorId]
  );

  const isEISConnectorAvailable = useMemo(
    () => connectors?.some((c) => isElasticManagedLlmConnector(c)) ?? false,
    [connectors]
  );

  if (!checkCompleteMetadata) {
    return (
      <OnboardingCardContentPanel>
        <CenteredLoadingSpinner />
      </OnboardingCardContentPanel>
    );
  }

  const onNewConnectorSaved = (connectorId: string) => {
    checkComplete();
    setSelectedConnectorId(connectorId);
  };

  return (
    <OnboardingCardContentPanel>
      {canExecuteConnectors ? (
        <EuiFlexGroup direction="column">
          <EuiFlexItem grow={false}>
            <CardSubduedText size="s">
              {isEISConnectorAvailable ? (
                <ElasticAIFeatureMessage />
              ) : (
                i18n.ASSISTANT_CARD_DESCRIPTION
              )}
            </CardSubduedText>
          </EuiFlexItem>
          <EuiFlexItem>
            <ConnectorCards
              canCreateConnectors={canCreateConnectors}
              connectors={connectors}
              onNewConnectorSaved={onNewConnectorSaved}
              selectedConnectorId={selectedConnectorId}
              onConnectorSelected={onConnectorSelected}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <ConnectorsMissingPrivilegesCallOut level="read" />
      )}
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AssistantCard;
