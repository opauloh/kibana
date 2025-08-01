/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { TimeRange } from '@kbn/es-query';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { decodeOrThrow } from '@kbn/io-ts-utils';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { ServicesAPIResponseRT } from '../../../../../common/http_api';
import { isPending, useFetcher } from '../../../../hooks/use_fetcher';
import { Section } from '../../components/section';
import { ServicesSectionTitle } from './section_titles';
import { HOST_NAME_FIELD } from '../../../../../common/constants';
import { LinkToApmServices } from '../../links';
import { APM_HOST_FILTER_FIELD, APM_HOST_TROUBLESHOOTING_LINK } from '../../constants';
import { LinkToApmService } from '../../links/link_to_apm_service';
import { useKibanaEnvironmentContext } from '../../../../hooks/use_kibana';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';
import { useMetadataStateContext } from '../../hooks/use_metadata_state';

export const ServicesContent = ({
  hostName,
  dateRange,
}: {
  hostName: string;
  dateRange: TimeRange;
}) => {
  const { isServerlessEnv } = useKibanaEnvironmentContext();
  const { request$ } = useRequestObservable();
  const { isActiveTab } = useTabSwitcherContext();
  const { metadata, loading: metadataLoading } = useMetadataStateContext();

  const linkProps = useLinkProps({
    app: 'home',
    hash: '/tutorial/apm',
  });
  const serverlessLinkProps = useLinkProps({
    app: 'apm',
    pathname: '/onboarding',
  });

  const parsedDateRange = useTimeRange({
    rangeFrom: dateRange.from,
    rangeTo: dateRange.to,
  });

  const params = useMemo(
    () => ({
      filters: { [HOST_NAME_FIELD]: hostName },
      ...parsedDateRange,
    }),
    [hostName, parsedDateRange]
  );

  const query = useMemo(() => ({ ...params, filters: JSON.stringify(params.filters) }), [params]);

  const { data, status, error } = useFetcher(
    async (callApi) => {
      const response = await callApi('/api/infra/services', {
        method: 'GET',
        query,
      });

      return decodeOrThrow(ServicesAPIResponseRT)(response);
    },
    [query],
    {
      requestObservable$: request$,
      autoFetch: isActiveTab('overview'),
    }
  );

  const services = data?.services;
  const hasServices = services?.length;

  return (
    <Section
      title={<ServicesSectionTitle />}
      collapsible
      data-test-subj="infraAssetDetailsServicesCollapsible"
      id="services"
      extraAction={<LinkToApmServices entityId={hostName} apmField={APM_HOST_FILTER_FIELD} />}
    >
      {error ? (
        <EuiCallOut
          title={i18n.translate('xpack.infra.assetDetails.services.getServicesRequestErrorTitle', {
            defaultMessage: 'Error',
          })}
          color="danger"
          iconType="alert"
        >
          {i18n.translate('xpack.infra.assetDetails.services.getServicesRequestError', {
            defaultMessage: 'An error occurred while fetching services.',
          })}
        </EuiCallOut>
      ) : isPending(status) || metadataLoading ? (
        <EuiLoadingSpinner size="m" />
      ) : hasServices ? (
        <EuiFlexGroup
          wrap
          responsive={false}
          gutterSize="xs"
          data-test-subj="infraAssetDetailsServicesContainer"
        >
          {services.map((service, index) => (
            <EuiFlexItem grow={false} key={index}>
              <LinkToApmService
                serviceName={service.serviceName}
                agentName={service.agentName}
                dateRange={dateRange}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : metadata?.hasSystemIntegration ? (
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.services.noServicesMsg"
            defaultMessage="No services found on this host. Click {apmTutorialLink} to instrument your services with APM."
            values={{
              apmTutorialLink: (
                <EuiLink
                  data-test-subj="assetDetailsTooltipAPMTutorialLink"
                  href={isServerlessEnv ? serverlessLinkProps.href : linkProps.href}
                >
                  <FormattedMessage
                    id="xpack.infra.assetDetails.table.services.noServices.tutorialLink"
                    defaultMessage="here"
                  />
                </EuiLink>
              ),
            }}
          />{' '}
          <EuiLink
            data-test-subj="assetDetailsAPMTroubleshootingLink"
            href={APM_HOST_TROUBLESHOOTING_LINK}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.infra.assetDetails.table.services.noServices.troubleshootingLink"
              defaultMessage="Troubleshooting"
            />
          </EuiLink>
        </p>
      ) : (
        <p>
          <FormattedMessage
            id="xpack.infra.assetDetails.services.noServicesWithApmMessage"
            defaultMessage="No services found on this host."
          />{' '}
          <EuiLink
            data-test-subj="assetDetailsAPMHostTroubleshootingLink"
            href={APM_HOST_TROUBLESHOOTING_LINK}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.infra.assetDetails.table.services.noServices.troubleshootingLink"
              defaultMessage="Troubleshooting"
            />
          </EuiLink>
        </p>
      )}
    </Section>
  );
};
