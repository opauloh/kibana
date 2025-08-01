/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { ErrorCode } from '../../../../../../common/types/error_codes';

import { Actions } from '../../../../shared/api_logic/create_api_logic';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../shared/kibana';
import {
  AddConnectorApiLogic,
  AddConnectorApiLogicArgs,
  AddConnectorApiLogicResponse,
} from '../../../api/connector/add_connector_api_logic';
import { CONNECTOR_DETAIL_TAB_PATH } from '../../../routes';
import { SearchIndexTabId } from '../../search_index/search_index';

type AddConnectorActions = Pick<
  Actions<AddConnectorApiLogicArgs, AddConnectorApiLogicResponse>,
  'apiError' | 'apiSuccess' | 'makeRequest' | 'apiReset'
> & {
  setIsModalVisible: (isModalVisible: boolean) => { isModalVisible: boolean };
};

export interface AddConnectorValues {
  isModalVisible: boolean;
}

export const AddConnectorLogic = kea<MakeLogicType<AddConnectorValues, AddConnectorActions>>({
  actions: {
    setIsModalVisible: (isModalVisible: boolean) => ({ isModalVisible }),
  },
  connect: {
    actions: [AddConnectorApiLogic, ['apiError', 'apiSuccess', 'makeRequest', 'apiReset']],
  },
  listeners: {
    apiSuccess: async ({ id }) => {
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(CONNECTOR_DETAIL_TAB_PATH, {
          connectorId: id,
          tabId: SearchIndexTabId.CONFIGURATION,
        })
      );
    },
  },
  path: ['enterprise_search', 'content', 'add_connector'],
  reducers: {
    isModalVisible: [
      false,
      {
        apiError: (_, error) =>
          error.body?.attributes?.error_code === ErrorCode.CONNECTOR_DOCUMENT_ALREADY_EXISTS,
        apiSuccess: () => false,
        setIsModalVisible: (_, { isModalVisible }) => isModalVisible,
      },
    ],
  },
});
