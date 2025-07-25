/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { DocumentDetailsPreviewPanelKey } from '../shared/constants/panel_keys';
import { useTabs } from '../right/hooks/use_tabs';
import { useFlyoutIsExpandable } from '../right/hooks/use_flyout_is_expandable';
import { useDocumentDetailsContext } from '../shared/context';
import type { DocumentDetailsProps } from '../shared/types';
import { PanelHeader } from '../right/header';
import { PanelContent } from '../right/content';
import { PreviewPanelFooter } from './footer';
import type { RightPanelTabType } from '../right/tabs';
import { ALERT_PREVIEW_BANNER, EVENT_PREVIEW_BANNER } from './constants';
import { useBasicDataFromDetailsData } from '../shared/hooks/use_basic_data_from_details_data';

/**
 * Panel to be displayed in the document details expandable flyout on top of right section
 */
export const PreviewPanel: FC<Partial<DocumentDetailsProps>> = memo(({ path }) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const {
    eventId,
    indexName,
    scopeId,
    getFieldsData,
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
  } = useDocumentDetailsContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const flyoutIsExpandable = useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject });

  const { tabsDisplayed, selectedTabId } = useTabs({ flyoutIsExpandable, path });

  const setSelectedTabId = (tabId: RightPanelTabType['id']) => {
    openPreviewPanel({
      id: DocumentDetailsPreviewPanelKey,
      path: {
        tab: tabId,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
        isPreviewMode: true,
        banner: isAlert ? ALERT_PREVIEW_BANNER : EVENT_PREVIEW_BANNER,
      },
    });
  };

  return (
    <>
      <PanelHeader
        tabs={tabsDisplayed}
        selectedTabId={selectedTabId}
        setSelectedTabId={setSelectedTabId}
        css={{ marginTop: '-15px' }}
      />
      <PanelContent tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      <PreviewPanelFooter />
    </>
  );
});

PreviewPanel.displayName = 'PreviewPanel';
