/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';

import { COMBINED_JOB_STATE } from '../model_snapshots_table';

interface Props {
  combinedJobState: COMBINED_JOB_STATE;
  hideCloseJobModalVisible(): void;
  forceCloseJob(): void;
}
export const CloseJobConfirm: FC<Props> = ({
  combinedJobState,
  hideCloseJobModalVisible,
  forceCloseJob,
}) => {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={modalTitleId}
      title={
        combinedJobState === COMBINED_JOB_STATE.OPEN_AND_RUNNING
          ? i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.stopAndClose.title', {
              defaultMessage: 'Stop datafeed and close job?',
            })
          : i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.close.title', {
              defaultMessage: 'Close job?',
            })
      }
      titleProps={{ id: modalTitleId }}
      onCancel={hideCloseJobModalVisible}
      onConfirm={forceCloseJob}
      cancelButtonText={i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.cancelButton', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={
        combinedJobState === COMBINED_JOB_STATE.OPEN_AND_RUNNING
          ? i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.stopAndClose.button', {
              defaultMessage: 'Stop and close',
            })
          : i18n.translate('xpack.ml.modelSnapshotTable.closeJobConfirm.close.button', {
              defaultMessage: 'Close',
            })
      }
      defaultFocusedButton="confirm"
    >
      <p>
        {combinedJobState === COMBINED_JOB_STATE.OPEN_AND_RUNNING && (
          <FormattedMessage
            id="xpack.ml.modelSnapshotTable.closeJobConfirm.contentOpenAndRunning"
            defaultMessage="Job is currently open and running."
          />
        )}
        {combinedJobState === COMBINED_JOB_STATE.OPEN_AND_STOPPED && (
          <FormattedMessage
            id="xpack.ml.modelSnapshotTable.closeJobConfirm.contentOpen"
            defaultMessage="Job is currently open."
          />
        )}
        <br />
        <FormattedMessage
          id="xpack.ml.modelSnapshotTable.closeJobConfirm.content"
          defaultMessage="Snapshot revert can only happen on jobs which are closed."
        />
      </p>
    </EuiConfirmModal>
  );
};
