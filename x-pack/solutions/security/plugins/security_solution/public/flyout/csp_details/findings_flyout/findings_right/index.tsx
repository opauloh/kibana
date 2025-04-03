/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer } from '@elastic/eui';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { createMisconfigurationFindingsQuery } from '@kbn/cloud-security-posture';
import { FlyoutNavigation } from '../../../shared/components/flyout_navigation';
import { FindingsMisconfigurationFlyoutHeader } from './header';
import { FlyoutHeader } from '../../../shared/components/flyout_header';
import { useKibana } from '../../../../common/lib/kibana';
import { FlyoutBody } from '../../../shared/components/flyout_body';
import { FlyoutFooter } from '../../../shared/components/flyout_footer';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FlyoutTitle } from '../../../shared/components/flyout_title';

export interface FindingsMisconfigurationPanelProps extends Record<string, unknown> {
  resourceId: string;
  ruleId: string;
}

export interface FindingsMisconfigurationPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'findings-misconfiguration-panel';
  params: FindingsMisconfigurationPanelProps;
}

export const FindingsMisconfigurationPanelTrial = ({
  resourceId,
  ruleId,
}: FindingsMisconfigurationPanelProps) => {
  const { cloudSecurityPosture } = useKibana().services;
  const CspFlyout = cloudSecurityPosture.getCloudSecurityPostureMisconfigurationFlyout();

  return (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <CspFlyout.Component ruleId={ruleId} resourceId={resourceId}>
        {({ finding, createRuleFn, tab, setTab, tabs }: any) => {
          return (
            <>
              <FlyoutHeader>
                <EuiFlexGroup gutterSize="xs" responsive={false} direction="column">
                  {finding['@timestamp'] && (
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs">
                        <b>{'Evaluated at '}</b>
                        <PreferenceFormattedDate value={finding['@timestamp']} />
                        <EuiSpacer size="xs" />
                      </EuiText>
                    </EuiFlexItem>
                  )}
                  {/* <EuiFlexItem grow={false}>
                    <FlyoutTitle title={finding.ruleName} />
                  </EuiFlexItem> */}
                </EuiFlexGroup>
                <CspFlyout.Header tab={tab} setTab={setTab} finding={finding} tabs={tabs} />
              </FlyoutHeader>
              <FlyoutBody>
                <CspFlyout.Body tab={tab} finding={finding} />
              </FlyoutBody>
              <FlyoutFooter>
                <CspFlyout.Footer finding={finding} createRuleFn={createRuleFn} />
              </FlyoutFooter>
            </>
          );
        }}
      </CspFlyout.Component>
    </>
  );
};

FindingsMisconfigurationPanelTrial.displayName = 'FindingsMisconfigurationPanelTrial';
