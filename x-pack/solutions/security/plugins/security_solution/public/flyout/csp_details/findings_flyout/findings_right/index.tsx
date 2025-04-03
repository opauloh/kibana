/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { createMisconfigurationFindingsQuery } from '@kbn/cloud-security-posture';
import { FlyoutNavigation } from '../../../shared/components/flyout_navigation';
import { FindingsMisconfigurationFlyoutHeader } from './header';
import { FlyoutHeader } from '../../../shared/components/flyout_header';
import { useKibana } from '../../../../common/lib/kibana';
import { FlyoutBody } from '../../../shared/components/flyout_body';
import { FlyoutFooter } from '../../../shared/components/flyout_footer';

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
      <Suspense fallback={<div>Loading flyout...</div>}>
        <CspFlyout.Component ruleId={ruleId} resourceId={resourceId}>
          <FlyoutHeader>
            <CspFlyout.Header />
          </FlyoutHeader>
          <FlyoutBody>
            <CspFlyout.Body />
          </FlyoutBody>
          <FlyoutFooter>
            <CspFlyout.Footer />
          </FlyoutFooter>
        </CspFlyout.Component>
      </Suspense>
    </>
  );
};

FindingsMisconfigurationPanelTrial.displayName = 'FindingsMisconfigurationPanelTrial';
