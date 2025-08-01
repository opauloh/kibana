/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormFieldset,
  EuiFormHelpText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  euiPaletteCool,
  EuiPanel,
  EuiRange,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CoreStart, OverlayStart } from '@kbn/core/public';
import { css } from '@emotion/react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { dictionaryValidator } from '@kbn/ml-validators';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MODEL_STATE } from '@kbn/ml-trained-models-utils';
import useObservable from 'react-use/lib/useObservable';
import type { NLPSettings } from '../../../common/constants/app';

import {
  isModelDownloadItem,
  isNLPModelItem,
  type TrainedModelDeploymentStatsResponse,
} from '../../../common/types/trained_models';
import { type CloudInfo, getNewJobLimits } from '../services/ml_server_info';
import { DeploymentParamsMapper } from './deployment_params_mapper';

import type { HttpService } from '../services/http_service';
import { ModelStatusIndicator } from './model_status_indicator';
import type { TrainedModelsService } from './trained_models_service';
import { useMlKibana } from '../contexts/kibana';
import type { MlCapabilitiesService } from '../capabilities/check_capabilities';

interface DeploymentSetupProps {
  config: DeploymentParamsUI;
  onConfigChange: (config: DeploymentParamsUI) => void;
  errors: Partial<
    Record<
      keyof DeploymentParamsUI | 'min_number_of_allocations' | 'max_number_of_allocations',
      Record<string, unknown>
    >
  >;
  isUpdate?: boolean;
  deploymentsParams?: Record<string, DeploymentParamsUI>;
  cloudInfo: CloudInfo;
  // Indicates if running in serverless
  showNodeInfo: boolean;
  disableAdaptiveResourcesControl?: boolean;
  deploymentParamsMapper: DeploymentParamsMapper;
}

/**
 * Interface for deployment params in the UI.
 */
export interface DeploymentParamsUI {
  /**
   * Deployment ID
   */
  deploymentId?: string;
  /**
   * Indicates the use case deployment is optimized for.
   * For ingest, use 1 thread
   * For search, use N threads, where N = no. of physical cores of an ML node
   */
  optimized: 'optimizedForIngest' | 'optimizedForSearch';
  /**
   * Adaptive resources
   */
  adaptiveResources: boolean;
  /**
   * Level of vCPU usage.
   * When adaptive resources are enabled, corresponds to the min-max range.
   * When adaptive resources are disabled (and for on-prem deployments), set to a static number of allocations.
   */
  vCPUUsage: 'low' | 'medium' | 'high';
}

const sliderPalette = euiPaletteCool(3);

/**
 * Dict for vCPU levels.
 */
const vCpuLevelMap = {
  low: {
    value: 0.5,
    label: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.lowCpuLabel', {
      defaultMessage: 'Low',
    }),
    color: sliderPalette[0],
  },
  medium: {
    value: 1.5,
    label: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.mediumCpuLabel', {
      defaultMessage: 'Medium',
    }),
    color: sliderPalette[1],
  },
  high: {
    value: 2.5,
    label: i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.highCpuLabel', {
      defaultMessage: 'High',
    }),
    color: sliderPalette[2],
  },
};

/**
 * Form for setting threading params.
 */
export const DeploymentSetup: FC<DeploymentSetupProps> = ({
  config,
  onConfigChange,
  errors,
  isUpdate,
  deploymentsParams,
  disableAdaptiveResourcesControl,
  deploymentParamsMapper,
  cloudInfo,
  showNodeInfo,
}) => {
  const deploymentIdUpdated = useRef(false);

  const defaultDeploymentId = useMemo(() => {
    return config.deploymentId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customTicks = useMemo(
    () =>
      Object.values(vCpuLevelMap).map((v) => {
        return {
          label: v.label,
          value: v.value,
        };
      }),
    []
  );

  const customColorsLevels = useMemo(
    () => [
      {
        min: 0.5,
        max: 1.1,
        color: vCpuLevelMap.low.color,
      },
      {
        min: 1.1,
        max: 1.9,
        color: vCpuLevelMap.medium.color,
      },
      {
        min: 1.9,
        max: 2.5,
        color: vCpuLevelMap.high.color,
      },
    ],
    []
  );

  const optimizedOptions = useMemo(
    () => [
      {
        id: 'optimizedForIngest',
        value: 'optimizedForIngest' as const,
        label: (
          <EuiText size={'s'}>
            <strong>
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForIngestLabel"
                defaultMessage="Ingest"
              />
            </strong>
          </EuiText>
        ),
        description: (
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForIngestDescription"
            defaultMessage="Optimized for higher throughput during ingest"
          />
        ),
        'data-test-subj': `mlModelsStartDeploymentModalOptimizedForIngest`,
      },
      {
        id: 'optimizedForSearch',
        value: 'optimizedForSearch' as const,
        label: (
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForSearchLabel"
            defaultMessage="Search"
          />
        ),
        description: (
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.optimizedForSearchDescription"
            defaultMessage="Optimized for lower latency during search"
          />
        ),
        'data-test-subj': `mlModelsStartDeploymentModalOptimizedForSearch`,
      },
    ],
    []
  );

  const helperText = useMemo<string | undefined>(() => {
    const vcpuRange = deploymentParamsMapper.getVCPURange(config.vCPUUsage);

    if (cloudInfo.isCloud && cloudInfo.isMlAutoscalingEnabled && showNodeInfo) {
      // Running in cloud with ML autoscaling enabled
      if (config.adaptiveResources) {
        // With adaptive resources
        switch (config.vCPUUsage) {
          case 'low':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.cloudAutoscaling.lowCpuAdaptiveHelp',
              {
                defaultMessage:
                  'This level limits resources to the minimum required for the model to run if supported by your Cloud console selection. It may not be sufficient for a production application.',
              }
            );
          case 'medium':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.cloudAutoscaling.mediumCpuAdaptiveHelp',
              {
                defaultMessage:
                  'Your model will scale up to a maximum of {maxVCPUs} vCPUs. Even if the Cloud console provides more, the model will not exceed {maxVCPUs}, leaving additional resources for other models.',
                values: { maxVCPUs: vcpuRange.max },
              }
            );
          case 'high':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.cloudAutoscaling.highCpuAdaptiveHelp',
              {
                defaultMessage:
                  'Your model may scale up to the maximum number of vCPUs available for this deployment from the Cloud console if needed. If the maximum is {minVCPUs} vCPUs or fewer, this level is equivalent to the medium level.',
                // use an upper bound of medium level
                values: { minVCPUs: vcpuRange.min - 1 },
              }
            );
        }
      } else {
        // Without adaptive resources
        switch (config.vCPUUsage) {
          case 'low':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.cloudAutoscaling.lowCpuStaticHelp',
              {
                defaultMessage:
                  'This level sets resources to the minimum required for the model to run if supported by your Cloud console selection. It may not be sufficient for a production application.',
              }
            );
          case 'medium':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.cloudAutoscaling.mediumCpuStaticHelp',
              {
                defaultMessage:
                  'Your model will consume {staticVCPUs} vCPUs, even when not in use, if provided by the Cloud console.',
                values: { staticVCPUs: vcpuRange.static },
              }
            );
          case 'high':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.cloudAutoscaling.highCpuStaticHelp',
              {
                defaultMessage:
                  'Your model will consume {staticVCPUs} vCPUs, even when not in use, if provided by the Cloud console.',
                values: { staticVCPUs: vcpuRange.static },
              }
            );
        }
      }
    } else if (
      (cloudInfo.isCloud && !cloudInfo.isMlAutoscalingEnabled && showNodeInfo) ||
      (!cloudInfo.isCloud && showNodeInfo)
    ) {
      // Running in cloud with autoscaling disabled or on-prem
      if (config.adaptiveResources) {
        // With adaptive resources
        switch (config.vCPUUsage) {
          case 'low':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.hardwareLimits.lowCpuAdaptiveHelp',
              {
                defaultMessage:
                  'This level limits resources to {maxVCPUs, plural, one {vCPU} other {# vCPUs}}, which may be suitable for development, testing, and demos depending on your parameters. It is not recommended for production use.',
                values: { maxVCPUs: vcpuRange.max },
              }
            );
          case 'medium':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.hardwareLimits.mediumCpuAdaptiveHelp',
              {
                defaultMessage:
                  'This level limits resources to {maxVCPUs, plural, one {vCPU} other {# vCPUs}}, which may be suitable for development, testing, and demos depending on your parameters. It is not recommended for production use.',
                values: { maxVCPUs: vcpuRange.max },
              }
            );
          case 'high':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.hardwareLimits.highCpuAdaptiveHelp',
              {
                defaultMessage:
                  'This level may use {maxVCPUs, plural, one {vCPU} other {# vCPUs}} - the maximum number of vCPUs available for this deployment. If the maximum is 2 vCPUs or fewer, this level is equivalent to the medium or low level.',
                values: { maxVCPUs: vcpuRange.max },
              }
            );
        }
      } else {
        // Without adaptive resources
        switch (config.vCPUUsage) {
          case 'low':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.hardwareLimits.lowCpuStaticHelp',
              {
                defaultMessage:
                  'This level sets resources to the minimum required for the model to run. It may not be sufficient for a production application.',
              }
            );
          case 'medium':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.hardwareLimits.mediumCpuStaticHelp',
              {
                defaultMessage:
                  'Your model will consume {staticVCPUs} vCPUs, even when not in use.',
                values: { staticVCPUs: vcpuRange.static },
              }
            );
          case 'high':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.hardwareLimits.highCpuStaticHelp',
              {
                defaultMessage:
                  'Your model will consume {staticVCPUs} vCPUs - the maximum available number.',
                values: { staticVCPUs: vcpuRange.static },
              }
            );
        }
      }
    } else if (!showNodeInfo) {
      // Running in serverless
      const vcuRange = deploymentParamsMapper.getVCURange(config.vCPUUsage);

      if (config.adaptiveResources) {
        // With adaptive resources
        switch (config.vCPUUsage) {
          case 'low':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.serverless.lowCpuAdaptiveHelp',
              {
                defaultMessage:
                  'This level limits resources to {vcus, plural, one {VCU} other {# VCUs}}, which may be suitable for development, testing, and demos depending on your parameters. It is not recommended for production use.',
                values: { vcus: vcuRange.max },
              }
            );
          case 'medium':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.serverless.mediumCpuAdaptiveHelp',
              {
                defaultMessage:
                  'Your model will scale up to a maximum of {vcus, plural, one {VCU} other {# VCUs}} per hour based on your search or ingest load. It will automatically scale down when demand decreases, and you only pay for the resources you use.',
                values: { vcus: vcuRange.max },
              }
            );
          case 'high':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.serverless.highCpuAdaptiveHelp',
              {
                defaultMessage:
                  'Your model will scale up to a maximum of {vcus, plural, one {VCU} other {# VCUs}} per hour based on your search or ingest load. It will automatically scale down when demand decreases, and you only pay for the resources you use.',
                values: { vcus: vcuRange.max },
              }
            );
        }
      } else {
        // Static allocations are allowed for Search projects
        switch (config.vCPUUsage) {
          case 'low':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.serverless.lowCpuStaticHelp',
              {
                defaultMessage:
                  'This level set resources to {staticVCUs, plural, one {VCU} other {# VCUs}}, which may be suitable for development, testing, and demos depending on your parameters. It is not recommended for production use.',
                values: { staticVCUs: vcuRange.static },
              }
            );
          case 'medium':
          case 'high':
            return i18n.translate(
              'xpack.ml.trainedModels.modelsList.startDeployment.serverless.mediumCpuStaticHelp',
              {
                defaultMessage:
                  'Your model will consume {staticVCUs, plural, one {VCU} other {# VCUs}}, even when not in use.',
                values: { staticVCUs: vcuRange.static },
              }
            );
        }
      }
    }
  }, [
    cloudInfo.isCloud,
    cloudInfo.isMlAutoscalingEnabled,
    config.adaptiveResources,
    config.vCPUUsage,
    deploymentParamsMapper,
    showNodeInfo,
  ]);

  return (
    <EuiForm component={'form'} id={'startDeploymentForm'}>
      <EuiFormRow
        fullWidth
        label={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.deploymentIdLabel"
            defaultMessage="Deployment ID"
          />
        }
        hasChildLabel={false}
        isInvalid={!!errors.deploymentId}
        error={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.deploymentIdError"
            defaultMessage="Deployment with this ID already exists."
          />
        }
      >
        {!isUpdate ? (
          <EuiFieldText
            fullWidth
            placeholder={defaultDeploymentId}
            isInvalid={!!errors.deploymentId}
            value={config.deploymentId ?? ''}
            onChange={(e) => {
              deploymentIdUpdated.current = true;
              onConfigChange({ ...config, deploymentId: e.target.value });
            }}
            data-test-subj={'mlModelsStartDeploymentModalDeploymentId'}
          />
        ) : (
          <EuiSelect
            fullWidth
            options={Object.keys(deploymentsParams!).map((v) => {
              return { text: v, value: v };
            })}
            value={config.deploymentId}
            onChange={(e) => {
              const update = e.target.value;
              const targetDeployment = deploymentsParams![update];
              onConfigChange({
                ...targetDeployment,
              });
            }}
            data-test-subj={'mlModelsStartDeploymentModalDeploymentSelectId'}
          />
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow hasChildLabel={true} fullWidth>
        <EuiFormFieldset
          legend={{
            children: (
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.optimizeThreadsPerAllocationLabel"
                defaultMessage="Optimize this model deployment for your use case:"
              />
            ),
          }}
        >
          {optimizedOptions.map((v) => {
            return (
              <Fragment key={v.value}>
                <EuiCheckableCard
                  id={v.value}
                  disabled={isUpdate}
                  label={
                    <EuiText size={'s'}>
                      <EuiFlexGroup alignItems={'baseline'} gutterSize={'s'}>
                        <EuiFlexItem grow={false}>
                          <strong>{v.label}</strong>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>{v.description}</EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiText>
                  }
                  value={v.value}
                  checked={config.optimized === v.value}
                  onChange={() => {
                    onConfigChange({
                      ...config,
                      ...(deploymentIdUpdated.current
                        ? {}
                        : {
                            // rename deployment ID based on the optimized value
                            deploymentId: config.deploymentId?.replace(
                              /_[a-zA-Z]+$/,
                              v.value === 'optimizedForIngest' ? '_ingest' : '_search'
                            ),
                          }),
                      optimized: v.value,
                    });
                  }}
                  data-test-subj={`mlModelsStartDeploymentModalOptimized_${v.value}`}
                />
                <EuiSpacer size="m" />
              </Fragment>
            );
          })}
        </EuiFormFieldset>
      </EuiFormRow>

      <EuiAccordion
        id={'modelDeploymentAdvancedSettings'}
        buttonContent={
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.advancedSettingsLabel"
            defaultMessage="Advanced configurations"
          />
        }
        initialIsOpen={isUpdate}
        data-test-subj={'mlModelsStartDeploymentModalAdvancedConfiguration'}
      >
        <EuiSpacer size={'m'} />

        <EuiPanel hasBorder hasShadow={false}>
          <EuiFormRow
            hasChildLabel={false}
            fullWidth
            label={
              showNodeInfo ? (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.vCpuUsageLabel"
                  defaultMessage="vCPUs usage level"
                />
              ) : (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.vCUUsageLabel"
                  defaultMessage="VCU usage level"
                />
              )
            }
          >
            <EuiRange
              fullWidth
              id={'vCpuLevel'}
              min={0.5}
              max={2.5}
              step={1}
              tickInterval={1}
              value={vCpuLevelMap[config.vCPUUsage].value}
              onChange={(e) => {
                const result = Object.entries(vCpuLevelMap).find(
                  ([, val]) => val.value === Number(e.currentTarget.value)
                );
                onConfigChange({
                  ...config,
                  vCPUUsage: result![0]! as DeploymentParamsUI['vCPUUsage'],
                });
              }}
              showTicks
              ticks={customTicks}
              levels={customColorsLevels}
              aria-label={
                showNodeInfo
                  ? i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.vCpuLevel', {
                      defaultMessage: 'vCPUs level selector',
                    })
                  : i18n.translate('xpack.ml.trainedModels.modelsList.startDeployment.vCULevel', {
                      defaultMessage: 'VCUs level selector',
                    })
              }
              aria-describedby={'vCpuRangeHelp'}
              data-test-subj={'mlModelsStartDeploymentModalVCPULevel'}
            />
          </EuiFormRow>

          <EuiSpacer size={'s'} />

          <EuiFormHelpText id={'vCpuRangeHelp'}>
            <EuiCallOut size="s" data-test-subj="mlModelsStartDeploymentModalVCPUHelperText">
              {helperText}
            </EuiCallOut>
          </EuiFormHelpText>
        </EuiPanel>

        {!disableAdaptiveResourcesControl ? (
          <>
            <EuiSpacer size={'m'} />

            <EuiSwitch
              label={
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveAllocationEnabledLabel"
                  defaultMessage="Adaptive resources (recommended)"
                />
              }
              checked={!!config.adaptiveResources}
              onChange={(event) => {
                onConfigChange({
                  ...config,
                  adaptiveResources: event.target.checked,
                });
              }}
              aria-describedby={'adaptiveResourcesHelp'}
              data-test-subj={'mlModelsStartDeploymentModalAdaptiveResources'}
            />

            <EuiSpacer size={'s'} />

            <EuiFormHelpText
              id={'adaptiveResourcesHelp'}
              data-test-subj={'mlModelsStartDeploymentModalVCPULevelHelpText'}
            >
              <FormattedMessage
                id={'xpack.ml.trainedModels.modelsList.startDeployment.adaptiveResourcesHelp'}
                defaultMessage={
                  'Adjust resources to optimize for load and savings. If disabled, the deployments will not auto-scale.'
                }
              />
            </EuiFormHelpText>

            <EuiSpacer size={'m'} />
          </>
        ) : null}
      </EuiAccordion>
    </EuiForm>
  );
};

interface StartDeploymentModalProps {
  modelId: string;
  startModelDeploymentDocUrl: string;
  onConfigChange: (config: DeploymentParamsUI) => void;
  onClose: () => void;
  initialParams?: DeploymentParamsUI;
  modelAndDeploymentIds?: string[];
  cloudInfo: CloudInfo;
  deploymentParamsMapper: DeploymentParamsMapper;
  showNodeInfo: boolean;
  nlpSettings: NLPSettings;
}

/**
 * Modal window wrapper for {@link DeploymentSetup}
 */
export const StartUpdateDeploymentModal: FC<StartDeploymentModalProps> = ({
  modelId,
  onConfigChange,
  onClose,
  startModelDeploymentDocUrl,
  initialParams,
  modelAndDeploymentIds,
  cloudInfo,
  deploymentParamsMapper,
  showNodeInfo,
  nlpSettings,
}) => {
  const {
    services: {
      mlServices: { trainedModelsService },
    },
  } = useMlKibana();

  const { euiTheme } = useEuiTheme();

  const model = useObservable(
    trainedModelsService.getModel$(modelId),
    trainedModelsService.getModel(modelId)
  );

  const isUpdate = !!initialParams;

  const isModelNotDownloaded = model ? isModelDownloadItem(model) : true;

  const getDefaultParams = useCallback((): DeploymentParamsUI => {
    const defaultVCPUUsage: DeploymentParamsUI['vCPUUsage'] = showNodeInfo ? 'medium' : 'low';

    const defaultParams = {
      deploymentId: `${modelId}_ingest`,
      optimized: 'optimizedForIngest',
      vCPUUsage: defaultVCPUUsage,
      adaptiveResources: true,
    } as const;

    if (isModelNotDownloaded) {
      return defaultParams;
    }

    const uiParams = isNLPModelItem(model)
      ? model?.stats?.deployment_stats.map((v) =>
          deploymentParamsMapper.mapApiToUiDeploymentParams(v)
        )
      : [];

    return uiParams?.some((v) => v.optimized === 'optimizedForIngest')
      ? {
          deploymentId: `${modelId}_search`,
          optimized: 'optimizedForSearch',
          vCPUUsage: defaultVCPUUsage,
          adaptiveResources: true,
        }
      : defaultParams;
  }, [deploymentParamsMapper, isModelNotDownloaded, model, modelId, showNodeInfo]);

  const modalTitleId = useGeneratedHtmlId();

  const [config, setConfig] = useState<DeploymentParamsUI>(initialParams ?? getDefaultParams());

  const deploymentIdValidator = useMemo(() => {
    if (isUpdate || !isNLPModelItem(model)) {
      return () => null;
    }

    const otherModelAndDeploymentIds = [...(modelAndDeploymentIds ?? [])];
    otherModelAndDeploymentIds.splice(otherModelAndDeploymentIds?.indexOf(modelId), 1);

    return dictionaryValidator([
      ...model.deployment_ids,
      ...otherModelAndDeploymentIds,
      // check for deployment with the default ID
      ...(model.deployment_ids.includes(model.model_id) ? [''] : []),
    ]);
  }, [isUpdate, model, modelAndDeploymentIds, modelId]);

  const deploymentIdErrors = deploymentIdValidator(config.deploymentId ?? '');

  const errors: DeploymentSetupProps['errors'] = {
    ...(deploymentIdErrors ? { deploymentId: deploymentIdErrors } : {}),
  };

  const modelStatusIndicatorConfigOverrides = {
    names: {
      downloading: i18n.translate(
        'xpack.ml.trainedModels.modelsList.modelState.downloadingModelName',
        {
          defaultMessage: 'Downloading model',
        }
      ),
    },
    color: euiTheme.colors.textSubdued,
  };

  const showModelStatusIndicator =
    isNLPModelItem(model) &&
    (model?.state === MODEL_STATE.DOWNLOADING || model?.state === MODEL_STATE.DOWNLOADED);

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj="mlModelsStartDeploymentModal"
      maxWidth={640}
    >
      {/* Override padding to allow progress bar to take full width */}
      <EuiModalHeader css={{ paddingInline: `${euiTheme.size.l} 0px` }}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem css={{ paddingInline: `0px ${euiTheme.size.xxl}` }}>
            <EuiModalHeaderTitle id={modalTitleId} size="s">
              {isUpdate ? (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.updateDeployment.modalTitle"
                  defaultMessage="Update {modelId} deployment"
                  values={{ modelId }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.startDeployment.modalTitle"
                  defaultMessage="Start {modelId} deployment"
                  values={{ modelId }}
                />
              )}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem css={{ paddingInline: `0px ${euiTheme.size.l}` }}>
            {showModelStatusIndicator && (
              <ModelStatusIndicator
                modelId={model.model_id}
                configOverrides={modelStatusIndicatorConfigOverrides}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem css={{ paddingInline: `0px ${euiTheme.size.l}` }}>
            <EuiHorizontalRule margin="xs" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiModalBody>
        <DeploymentSetup
          deploymentParamsMapper={deploymentParamsMapper}
          cloudInfo={cloudInfo}
          showNodeInfo={showNodeInfo}
          config={config}
          onConfigChange={setConfig}
          errors={errors}
          isUpdate={isUpdate}
          disableAdaptiveResourcesControl={
            !showNodeInfo || nlpSettings.modelDeployment?.allowStaticAllocations === false
          }
          deploymentsParams={
            isModelNotDownloaded || !isNLPModelItem(model)
              ? {}
              : model.stats?.deployment_stats.reduce<Record<string, DeploymentParamsUI>>(
                  (acc, curr) => {
                    acc[curr.deployment_id] =
                      deploymentParamsMapper.mapApiToUiDeploymentParams(curr);
                    return acc;
                  },
                  {}
                )
          }
        />

        <EuiHorizontalRule margin="m" />

        {cloudInfo.cloudUrl && showNodeInfo ? (
          <>
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.adaptiveResourcesCloudHelp"
              defaultMessage="Autoscaling uses the base vCPU values from Cloud Console when determining the size to meet the usage needs."
            />
            &nbsp;
            <EuiLink href={cloudInfo.cloudUrl} target="_blank" external>
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.startDeployment.cloudConsoleLink"
                defaultMessage="Go to cloud console"
              />
            </EuiLink>
            <EuiHorizontalRule margin="m" />
          </>
        ) : null}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiLink
          href={startModelDeploymentDocUrl}
          external
          target={'_blank'}
          css={css`
            align-self: center;
            margin-right: auto;
          `}
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.docLinkTitle"
            defaultMessage="Learn more"
          />
        </EuiLink>

        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.startDeployment.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          type="submit"
          form={'startDeploymentForm'}
          onClick={onConfigChange.bind(null, config)}
          fill
          disabled={Object.keys(errors).length > 0}
          data-test-subj={'mlModelsStartDeploymentModalStartButton'}
        >
          {isUpdate ? (
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.updateButton"
              defaultMessage="Update"
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.trainedModels.modelsList.startDeployment.startButton"
              defaultMessage="Start"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

/**
 * Returns a callback for requesting user's input for threading params
 * with a form rendered in a modal window.
 *
 * @param overlays
 * @param theme$
 */
export const getUserInputModelDeploymentParamsProvider =
  (
    overlays: OverlayStart,
    startServices: Pick<CoreStart, 'analytics' | 'i18n' | 'theme' | 'userProfile'>,
    startModelDeploymentDocUrl: string,
    cloudInfo: CloudInfo,
    showNodeInfo: boolean,
    nlpSettings: NLPSettings,
    httpService: HttpService,
    trainedModelsService: TrainedModelsService,
    mlCapabilities: MlCapabilitiesService
  ) =>
  (
    modelId: string,
    initialParams?: TrainedModelDeploymentStatsResponse,
    deploymentIds?: string[]
  ): Promise<DeploymentParamsUI | void> => {
    const deploymentParamsMapper = new DeploymentParamsMapper(
      getNewJobLimits(),
      cloudInfo,
      nlpSettings
    );

    const params = initialParams
      ? deploymentParamsMapper.mapApiToUiDeploymentParams(initialParams)
      : undefined;

    return new Promise(async (resolve) => {
      try {
        const modalSession = overlays.openModal(
          toMountPoint(
            <KibanaContextProvider
              services={{ mlServices: { httpService, trainedModelsService, mlCapabilities } }}
            >
              <StartUpdateDeploymentModal
                nlpSettings={nlpSettings}
                showNodeInfo={showNodeInfo}
                deploymentParamsMapper={deploymentParamsMapper}
                cloudInfo={cloudInfo}
                startModelDeploymentDocUrl={startModelDeploymentDocUrl}
                initialParams={params}
                modelAndDeploymentIds={deploymentIds}
                modelId={modelId}
                onConfigChange={(config) => {
                  modalSession.close();

                  resolve(config);
                }}
                onClose={() => {
                  modalSession.close();
                  resolve();
                }}
              />
            </KibanaContextProvider>,
            startServices
          )
        );
      } catch (e) {
        resolve();
      }
    });
  };
