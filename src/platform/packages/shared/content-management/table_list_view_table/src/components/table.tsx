/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Dispatch, useCallback, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBasicTableColumn,
  EuiButton,
  EuiInMemoryTable,
  CriteriaWithPagination,
  SearchFilterConfig,
  Direction,
  Query,
  Search,
  type EuiTableSelectionType,
  useEuiTheme,
  EuiCode,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import {
  cssFavoriteHoverWithinEuiTableRow,
  useFavorites,
  FavoritesEmptyState,
} from '@kbn/content-management-favorites-public';

import { useServices } from '../services';
import type { Action } from '../actions';
import type {
  State as TableListViewState,
  TableListViewTableProps,
} from '../table_list_view_table';
import type { TableItemsRowActions } from '../types';
import { TableSortSelect } from './table_sort_select';
import { TagFilterPanel, TagFilterContextProvider } from './tag_filter_panel';
import { useTagFilterPanel } from './use_tag_filter_panel';
import type { Params as UseTagFilterPanelParams } from './use_tag_filter_panel';
import type { CustomSortingOptions, SortColumnField } from './table_sort_select';
import {
  UserFilterPanel,
  UserFilterContextProvider,
  NULL_USER as USER_FILTER_NULL_USER,
} from './user_filter_panel';
import { TabbedTableFilter } from './tabbed_filter';

type State<T extends UserContentCommonSchema> = Pick<
  TableListViewState<T>,
  'items' | 'selectedIds' | 'searchQuery' | 'tableSort' | 'pagination' | 'tableFilter'
>;

type TagManagementProps = Pick<
  UseTagFilterPanelParams,
  'addOrRemoveIncludeTagFilter' | 'addOrRemoveExcludeTagFilter' | 'tagsToTableItemMap'
>;

export const FORBIDDEN_SEARCH_CHARS = '()[]{}<>+=\\"$#!¿?,;`\'/|&';

interface Props<T extends UserContentCommonSchema> extends State<T>, TagManagementProps {
  dispatch: Dispatch<Action<T>>;
  entityName: string;
  entityNamePlural: string;
  isFetchingItems: boolean;
  tableCaption: string;
  tableColumns: Array<EuiBasicTableColumn<T>>;
  hasUpdatedAtMetadata: boolean;
  hasRecentlyAccessedMetadata: boolean;
  customSortingOptions?: CustomSortingOptions;
  deleteItems: TableListViewTableProps<T>['deleteItems'];
  tableItemsRowActions: TableItemsRowActions;
  renderCreateButton: () => React.ReactElement | undefined;
  onSortChange: (column: SortColumnField, direction: Direction) => void;
  onTableChange: (criteria: CriteriaWithPagination<T>) => void;
  onFilterChange: (filter: Partial<State<T>['tableFilter']>) => void;
  onTableSearchChange: (arg: { query: Query | null; queryText: string }) => void;
  clearTagSelection: () => void;
  createdByEnabled: boolean;
  favoritesEnabled: boolean;
}

export function Table<T extends UserContentCommonSchema>({
  dispatch,
  items,
  isFetchingItems,
  searchQuery,
  selectedIds,
  pagination,
  tableColumns,
  tableSort,
  tableFilter,
  hasUpdatedAtMetadata,
  hasRecentlyAccessedMetadata,
  customSortingOptions,
  entityName,
  entityNamePlural,
  tagsToTableItemMap,
  tableItemsRowActions,
  deleteItems,
  renderCreateButton,
  tableCaption,
  onTableChange,
  onTableSearchChange,
  onSortChange,
  onFilterChange,
  addOrRemoveExcludeTagFilter,
  addOrRemoveIncludeTagFilter,
  clearTagSelection,
  createdByEnabled,
  favoritesEnabled,
}: Props<T>) {
  const euiTheme = useEuiTheme();
  const { getTagList, isTaggingEnabled, isKibanaVersioningEnabled } = useServices();

  const renderToolsLeft = useCallback(() => {
    if (!deleteItems || selectedIds.length === 0) {
      return;
    }

    return (
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={() => dispatch({ type: 'showConfirmDeleteItemsModal' })}
        data-test-subj="deleteSelectedItems"
      >
        <FormattedMessage
          id="contentManagement.tableList.listing.deleteButtonMessage"
          defaultMessage="Delete {itemCount} {entityName}"
          values={{
            itemCount: selectedIds.length,
            entityName: selectedIds.length === 1 ? entityName : entityNamePlural,
          }}
        />
      </EuiButton>
    );
  }, [deleteItems, dispatch, entityName, entityNamePlural, selectedIds.length]);

  const selection = useMemo<EuiTableSelectionType<T> | undefined>(() => {
    if (deleteItems) {
      return {
        onSelectionChange: (obj: T[]) => {
          dispatch({ type: 'onSelectionChange', data: obj });
        },
        selectable: (obj) => {
          const actions = tableItemsRowActions[obj.id];
          return actions?.delete?.enabled !== false;
        },
        selectableMessage: (selectable, obj) => {
          if (!selectable) {
            const actions = tableItemsRowActions[obj.id];
            return (
              actions?.delete?.reason ??
              i18n.translate('contentManagement.tableList.actionsDisabledLabel', {
                defaultMessage: 'Actions disabled for this item',
              })
            );
          }
          return '';
        },
        initialSelected: [],
      };
    }
  }, [deleteItems, dispatch, tableItemsRowActions]);

  const {
    isPopoverOpen,
    closePopover,
    onFilterButtonClick,
    onSelectChange,
    options,
    totalActiveFilters,
  } = useTagFilterPanel({
    query: searchQuery.query,
    getTagList,
    tagsToTableItemMap,
    addOrRemoveExcludeTagFilter,
    addOrRemoveIncludeTagFilter,
  });

  const tableSortSelectFilter = useMemo<SearchFilterConfig>(() => {
    return {
      type: 'custom_component',
      component: () => {
        return (
          <TableSortSelect
            tableSort={tableSort}
            hasUpdatedAtMetadata={hasUpdatedAtMetadata}
            hasRecentlyAccessedMetadata={hasRecentlyAccessedMetadata}
            customSortingOptions={customSortingOptions}
            onChange={onSortChange}
          />
        );
      },
    };
  }, [
    hasUpdatedAtMetadata,
    onSortChange,
    tableSort,
    hasRecentlyAccessedMetadata,
    customSortingOptions,
  ]);

  const tagFilterPanel = useMemo<SearchFilterConfig | null>(() => {
    if (!isTaggingEnabled()) return null;

    return {
      type: 'custom_component',
      component: TagFilterPanel,
    };
  }, [isTaggingEnabled]);

  const userFilterPanel = useMemo<SearchFilterConfig | null>(() => {
    return createdByEnabled
      ? {
          type: 'custom_component',
          component: UserFilterPanel,
        }
      : null;
  }, [createdByEnabled]);

  const searchFilters = useMemo(() => {
    return [tableSortSelectFilter, tagFilterPanel, userFilterPanel].filter(
      (f: SearchFilterConfig | null): f is SearchFilterConfig => Boolean(f)
    );
  }, [tableSortSelectFilter, tagFilterPanel, userFilterPanel]);

  const search = useMemo((): Search => {
    const showHint = !!searchQuery.error && searchQuery.error.containsForbiddenChars;
    return {
      onChange: onTableSearchChange,
      toolsLeft: renderToolsLeft(),
      toolsRight: renderCreateButton(),
      query: searchQuery.query ?? undefined,
      box: {
        incremental: true,
        'data-test-subj': 'tableListSearchBox',
      },
      filters: searchFilters,
      hint: {
        content: (
          <EuiText color="red" size="s" data-test-subj="forbiddenCharErrorMessage">
            <FormattedMessage
              id="contentManagement.tableList.listing.charsNotAllowedHint"
              defaultMessage="Characters not allowed: {chars}"
              values={{
                chars: <EuiCode>{FORBIDDEN_SEARCH_CHARS}</EuiCode>,
              }}
            />
          </EuiText>
        ),
        popoverProps: {
          isOpen: showHint,
        },
      },
    };
  }, [
    onTableSearchChange,
    renderCreateButton,
    renderToolsLeft,
    searchFilters,
    searchQuery.query,
    searchQuery.error,
  ]);

  const hasQueryOrFilters = Boolean(searchQuery.text || tableFilter.createdBy.length > 0);

  const noItemsMessage = tableFilter.favorites ? (
    <FavoritesEmptyState
      emptyStateType={hasQueryOrFilters ? 'noMatchingItems' : 'noItems'}
      entityName={entityName}
      entityNamePlural={entityNamePlural}
    />
  ) : (
    <FormattedMessage
      id="contentManagement.tableList.listing.noMatchedItemsMessage"
      defaultMessage="No {entityNamePlural} matched your search."
      values={{ entityNamePlural }}
    />
  );

  const { data: favorites, isError: favoritesError } = useFavorites({ enabled: favoritesEnabled });

  const visibleItems = React.useMemo(() => {
    let filteredItems = items;

    if (tableFilter?.createdBy?.length > 0) {
      filteredItems = items.filter((item) => {
        if (item.createdBy) return tableFilter.createdBy.includes(item.createdBy);
        else if (item.managed) return false;
        else return tableFilter.createdBy.includes(USER_FILTER_NULL_USER);
      });
    }

    if (tableFilter?.favorites && !favoritesError) {
      if (!favorites) {
        filteredItems = [];
      } else {
        filteredItems = filteredItems.filter((item) => favorites.favoriteIds.includes(item.id));
      }
    }

    return filteredItems;
  }, [items, tableFilter, favorites, favoritesError]);

  const { allUsers, showNoUserOption } = useMemo(() => {
    if (!createdByEnabled) return { allUsers: [], showNoUserOption: false };

    let _showNoUserOption = false;
    const users = new Set<string>();
    items.forEach((item) => {
      if (item.createdBy) {
        users.add(item.createdBy);
      } else if (!item.managed) {
        // show no user option only if there is an item without createdBy that is not a "managed" item
        _showNoUserOption = true;
      }
    });
    return { allUsers: Array.from(users), showNoUserOption: _showNoUserOption };
  }, [createdByEnabled, items]);

  const sorting =
    tableSort.field === 'accessedAt' // "accessedAt" is a special case with a custom sorting
      ? true // by passing "true" we disable the EuiInMemoryTable sorting and handle it ourselves, but sorting is still enabled
      : { sort: tableSort };

  const favoritesFilter =
    favoritesEnabled && !favoritesError ? (
      <TabbedTableFilter
        selectedTabId={tableFilter.favorites ? 'favorite' : 'all'}
        onSelectedTabChanged={(newTab) => {
          onFilterChange({ favorites: newTab === 'favorite' });
        }}
      />
    ) : undefined;

  return (
    <UserFilterContextProvider
      enabled={createdByEnabled}
      allUsers={allUsers}
      onSelectedUsersChange={(selectedUsers) => {
        onFilterChange({ createdBy: selectedUsers });
      }}
      selectedUsers={tableFilter.createdBy}
      showNoUserOption={showNoUserOption}
      isKibanaVersioningEnabled={isKibanaVersioningEnabled}
      entityNamePlural={entityNamePlural}
    >
      <TagFilterContextProvider
        isPopoverOpen={isPopoverOpen}
        closePopover={closePopover}
        onFilterButtonClick={onFilterButtonClick}
        onSelectChange={onSelectChange}
        options={options}
        totalActiveFilters={totalActiveFilters}
        clearTagSelection={clearTagSelection}
      >
        <EuiInMemoryTable<T>
          itemId="id"
          items={visibleItems}
          columns={tableColumns}
          pagination={pagination}
          loading={isFetchingItems}
          message={noItemsMessage}
          selection={selection}
          search={search}
          executeQueryOptions={{ enabled: false }}
          sorting={sorting}
          onChange={onTableChange}
          data-test-subj="itemsInMemTable"
          rowHeader="attributes.title"
          tableCaption={tableCaption}
          css={cssFavoriteHoverWithinEuiTableRow(euiTheme.euiTheme)}
          childrenBetween={favoritesFilter}
        />
      </TagFilterContextProvider>
    </UserFilterContextProvider>
  );
}
