/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EUI_MODAL_CONFIRM_BUTTON, EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';

import { ScriptedFieldItem } from '../../types';

interface DeleteScritpedFieldConfirmationModalProps {
  field: ScriptedFieldItem;
  hideDeleteConfirmationModal: (
    event?: React.KeyboardEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>
  ) => void;
  deleteField: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const DeleteScritpedFieldConfirmationModal = ({
  field,
  hideDeleteConfirmationModal,
  deleteField,
}: DeleteScritpedFieldConfirmationModalProps) => {
  const modalTitleId = useGeneratedHtmlId();

  const title = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteFieldLabel',
    {
      defaultMessage: "Delete scripted field ''{fieldName}''?",
      values: { fieldName: field.name },
    }
  );
  const cancelButtonText = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteField.cancelButton',
    { defaultMessage: 'Cancel' }
  );
  const confirmButtonText = i18n.translate(
    'indexPatternManagement.editIndexPattern.scripted.deleteField.deleteButton',
    { defaultMessage: 'Delete' }
  );

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={title}
      titleProps={{ id: modalTitleId }}
      onCancel={hideDeleteConfirmationModal}
      onConfirm={deleteField}
      cancelButtonText={cancelButtonText}
      confirmButtonText={confirmButtonText}
      defaultFocusedButton={EUI_MODAL_CONFIRM_BUTTON}
    />
  );
};
