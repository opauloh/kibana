/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isNoneGroup, useGrouping } from '@kbn/securitysolution-grouping';
import * as uuid from 'uuid';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  GroupOption,
  GroupPanelRenderer,
  GroupStatsRenderer,
} from '@kbn/securitysolution-grouping/src';

import { useUrlQuery } from '../../common/hooks/use_url_query';

import { FindingsBaseURLQuery } from '../../common/types';
import { useBaseEsQuery, usePersistedQuery } from '../../common/hooks/use_cloud_posture_data_table';

const DEFAULT_PAGE_SIZE = 10;
export const GROUPING_ID = 'cspLatestFindings';
export const MAX_GROUPING_LEVELS = 3;

/*
 Utility hook to handle the grouping logic of the cloud security components
*/
export const useCloudSecurityGrouping = ({
  dataView,
  groupingTitle,
  defaultGroupingOptions,
  getDefaultQuery,
  unit,
  groupPanelRenderer,
  groupStatsRenderer,
  groupingLevel,
}: {
  dataView: DataView;
  groupingTitle: string;
  defaultGroupingOptions: GroupOption[];
  getDefaultQuery: (params: FindingsBaseURLQuery) => FindingsBaseURLQuery;
  unit: (count: number) => string;
  groupPanelRenderer?: GroupPanelRenderer<any>;
  groupStatsRenderer?: GroupStatsRenderer<any>;
  groupingLevel: number;
}) => {
  const getPersistedDefaultQuery = usePersistedQuery(getDefaultQuery);
  const { urlQuery, setUrlQuery } = useUrlQuery(getPersistedDefaultQuery);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { query, error } = useBaseEsQuery({
    dataView,
    filters: urlQuery.filters,
    query: urlQuery.query,
  });

  const grouping = useGrouping({
    componentProps: {
      unit,
      groupPanelRenderer,
      groupStatsRenderer,
    },
    defaultGroupingOptions,
    fields: dataView.fields,
    groupingId: GROUPING_ID,
    maxGroupingLevels: MAX_GROUPING_LEVELS,
    title: groupingTitle,
    onGroupChange: (param) => {
      setActivePageIndex(0);
      setUrlQuery({
        groupBy: param.selectedGroups,
      });
    },
  });

  const selectedGroup = grouping.selectedGroups[groupingLevel];
  /**
   * Reset the active page when the filters or query change
   * This is needed because the active page is not automatically reset when the filters or query change
   */
  useEffect(() => {
    setActivePageIndex(0);
  }, [urlQuery.filters, urlQuery.query]);

  useEffect(() => {
    if (urlQuery.groupBy) {
      grouping.setSelectedGroups(urlQuery.groupBy);
    }

    // console.log(grouping.selectedGroups);
    // if (grouping.selectedGroups) {
    //   setUrlQuery({
    //     groupBy: grouping.selectedGroups,
    //   });
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // This is recommended by the grouping component to cover an edge case
  // where the selectedGroup has multiple values
  const uniqueValue = useMemo(() => `${selectedGroup}-${uuid.v4()}`, [selectedGroup]);

  const isNoneSelected = isNoneGroup(grouping.selectedGroups);

  const onChangeGroupsItemsPerPage = (size: number) => {
    setActivePageIndex(0);
    setPageSize(size);
  };

  const onResetFilters = useCallback(() => {
    setUrlQuery({
      filters: [],
      query: {
        query: '',
        language: 'kuery',
      },
    });
  }, [setUrlQuery]);

  const onChangeGroupsPage = (index: number) => setActivePageIndex(index);

  return {
    activePageIndex,
    setActivePageIndex,
    grouping,
    pageSize,
    query,
    error,
    selectedGroup,
    setUrlQuery,
    uniqueValue,
    isNoneSelected,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    onResetFilters,
    filters: urlQuery.filters,
  };
};
