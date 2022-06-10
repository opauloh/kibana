/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AutoSizer, List } from 'react-virtualized';
import { i18n } from '@kbn/i18n';
import { ProcessTreeNode } from '../process_tree_node';
import { BackToInvestigatedAlert } from '../back_to_investigated_alert';
import { useProcessTree } from './hooks';
import { ProcessTreeLoadMoreButton } from '../process_tree_load_more_button';
import {
  AlertStatusEventEntityIdMap,
  Process,
  ProcessEventsPage,
} from '../../../common/types/process_tree';
import { useScroll } from '../../hooks/use_scroll';
import { useStyles } from './styles';
import { PROCESS_EVENTS_PER_PAGE } from '../../../common/constants';
import { useResizeObserver } from '@elastic/eui';

type FetchFunction = () => void;

const LOAD_NEXT_TEXT = i18n.translate('xpack.sessionView.processTree.loadMore', {
  defaultMessage: 'Show {pageSize} next events',
  values: {
    pageSize: PROCESS_EVENTS_PER_PAGE,
  },
});

const LOAD_PREVIOUS_TEXT = i18n.translate('xpack.sessionView.processTree.loadPrevious', {
  defaultMessage: 'Show {pageSize} previous events',
  values: {
    pageSize: PROCESS_EVENTS_PER_PAGE,
  },
});

export interface ProcessTreeDeps {
  // process.entity_id to act as root node (typically a session (or entry session) leader).
  sessionEntityId: string;

  data: ProcessEventsPage[];

  jumpToEntityId?: string;
  investigatedAlertId?: string;
  isFetching: boolean;
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
  fetchNextPage: FetchFunction;
  fetchPreviousPage: FetchFunction;

  // plain text search query (only searches "process.working_directory process.args.join(' ')"
  searchQuery?: string;

  // currently selected process
  selectedProcess?: Process | null;
  onProcessSelected: (process: Process | null) => void;
  setSearchResults?: (results: Process[]) => void;

  // a map for alerts with updated status and process.entity_id
  updatedAlertsStatus: AlertStatusEventEntityIdMap;
  onShowAlertDetails: (alertUuid: string) => void;
  showTimestamp?: boolean;
  verboseMode?: boolean;
  height?: number;
}

export const ProcessTree = ({
  sessionEntityId,
  data,
  jumpToEntityId,
  investigatedAlertId,
  isFetching,
  hasNextPage,
  hasPreviousPage,
  fetchNextPage,
  fetchPreviousPage,
  searchQuery,
  selectedProcess,
  onProcessSelected,
  setSearchResults,
  updatedAlertsStatus,
  onShowAlertDetails,
  showTimestamp = true,
  verboseMode = false,
  height = 500,
}: ProcessTreeDeps) => {
  const [isInvestigatedEventVisible, setIsInvestigatedEventVisible] = useState<boolean>(true);
  const [isInvestigatedEventAbove, setIsInvestigatedEventAbove] = useState<boolean>(false);
  const windowingListRef = useRef<List>(null);

  const styles = useStyles();

  const { sessionLeader, processMap, searchResults, getFlattenedLeader } = useProcessTree({
    sessionEntityId,
    data,
    searchQuery,
    updatedAlertsStatus,
    verboseMode,
    jumpToEntityId,
  });

  const flattenedLeader = getFlattenedLeader();

  const eventsRemaining = useMemo(() => {
    const total = data?.[0]?.total || 0;
    const loadedSoFar = data.reduce((prev, current) => {
      return prev + (current?.events?.length || 0);
    }, 0);

    return total - loadedSoFar;
  }, [data]);

  const scrollerRef = useRef<HTMLDivElement>(null);

  const onChangeJumpToEventVisibility = useCallback(
    (isVisible: boolean, isAbove: boolean) => {
      if (isVisible !== isInvestigatedEventVisible) {
        setIsInvestigatedEventVisible(isVisible);
      }
      if (!isVisible && isAbove !== isInvestigatedEventAbove) {
        setIsInvestigatedEventAbove(isAbove);
      }
    },
    [isInvestigatedEventVisible, isInvestigatedEventAbove]
  );

  const handleBackToInvestigatedAlert = useCallback(() => {
    onProcessSelected(null);
    setIsInvestigatedEventVisible(true);
  }, [onProcessSelected]);

  useEffect(() => {
    if (setSearchResults) {
      setSearchResults(searchResults);
    }
  }, [searchResults, setSearchResults]);

  useScroll({
    div: scrollerRef.current,
    handler: (pos: number, endReached: boolean) => {
      if (!isFetching && endReached) {
        fetchNextPage();
      }
    },
  });

  useEffect(() => {
    if (jumpToEntityId) {
      const process = processMap[jumpToEntityId];
      const hasDetails = !!process?.getDetails();

      if (!selectedProcess && hasDetails) {
        onProcessSelected(process);
        windowingListRef.current?.scrollToRow(
          flattenedLeader.findIndex((p) => p.id === jumpToEntityId)
        );
      }
    } else if (!selectedProcess) {
      onProcessSelected(sessionLeader);
    }
  }, [
    jumpToEntityId,
    processMap,
    onProcessSelected,
    selectedProcess,
    sessionLeader,
    flattenedLeader,
  ]);

  useEffect(() => {
    window.addEventListener('resize', () => {
      setTimeout(() => {
        windowingListRef.current?.recomputeRowHeights();
        windowingListRef.current?.forceUpdate();
      }, 10);
    });
  }, []);
  const toggleProcessChildComponent = (process: Process) => {
    process.expanded = !process.expanded;
    // process.setHeight(nodeHeight.current?.clientHeight);
    // setTimeout(() => {
    //   windowingListRef.current?.recomputeRowHeights();
    //   windowingListRef.current?.forceUpdate();
    // }, 10);
  };

  const toggleProcessAlerts = (process: Process) => {
    process.alertsExpanded = !process.alertsExpanded;
    // batchUpdateRowHeight(process, ref);
    // process.setHeight(nodeHeight.current?.clientHeight);
    // setTimeout(() => {
    //   windowingListRef.current?.recomputeRowHeights();
    //   windowingListRef.current?.forceUpdate();
    // }, 10);
  };

  const dimensions = useResizeObserver(scrollerRef.current);

  useEffect(() => {
    setTimeout(() => {
      windowingListRef.current?.recomputeRowHeights();
      windowingListRef.current?.forceUpdate();
    }, 10);
  }, [dimensions.width]);

  const rowHeightList = useRef({});

  const itemsRef = useRef({});

  const batchUpdateRowHeight = (index) => {
    rowHeightList.current[index] = itemsRef.current[index]?.clientHeight;
    // console.log('----------------------------------', index, '--------------------');
    // console.log(itemsRef.current[index]?.clientHeight);
    setTimeout(() => {
      //   // process.setHeight(ref?.clientHeight);
      //   // console.log(ref.current?.clientHeight);
      //   // console.log(process);
      windowingListRef.current?.recomputeRowHeights();
      windowingListRef.current?.forceUpdate();
    }, 100);
  };

  const flattenedListLength = flattenedLeader.length;

  return (
    <>
      <div
        ref={scrollerRef}
        css={styles.sessionViewProcessTree}
        data-test-subj="sessionView:sessionViewProcessTree"
      >
        <AutoSizer>
          {({ width }) =>
            sessionLeader && (
              <List
                css={styles.processTree}
                scrollToAlignment="center"
                ref={windowingListRef}
                height={height}
                rowCount={flattenedLeader.length}
                rowHeight={({ index }) => {
                  // return flattenedLeader[index].getHeight();
                  let selfHeight = 29;
                  if (
                    flattenedLeader[index].id === sessionEntityId ||
                    index === flattenedListLength - 1
                  ) {
                    selfHeight += 16;
                  }

                  return rowHeightList?.current?.[index] || selfHeight;
                  // return flattenedLeader[index].getHeight(
                  //   flattenedLeader[index].id === sessionEntityId,
                  //   width,
                  //   showTimestamp,
                  //   index === flattenedListLength - 1
                  // );
                  // // if (rowHeightList[index]) {
                  //   return rowHeightList[index];
                  // }

                  // return 29;
                }}
                rowRenderer={({ index, style }) => {
                  return (
                    <div style={style}>
                      <div ref={(el) => (itemsRef.current[index] = el)}>
                        {index === 0 ? (
                          <ProcessTreeNode
                            isSessionLeader
                            process={sessionLeader}
                            onProcessSelected={onProcessSelected}
                            onToggleChild={toggleProcessChildComponent}
                            onToggleAlerts={toggleProcessAlerts}
                            jumpToEntityId={jumpToEntityId}
                            investigatedAlertId={investigatedAlertId}
                            selectedProcess={selectedProcess}
                            // scrollerRef={scrollerRef}
                            onChangeJumpToEventVisibility={onChangeJumpToEventVisibility}
                            onShowAlertDetails={onShowAlertDetails}
                            showTimestamp={showTimestamp}
                            verboseMode={verboseMode}
                            searchResults={searchResults}
                            depth={1}
                            // loadPreviousButton={
                            //   hasPreviousPage ? (
                            //     <ProcessTreeLoadMoreButton
                            //       text={LOAD_PREVIOUS_TEXT}
                            //       onClick={fetchPreviousPage}
                            //       isFetching={isFetching}
                            //       eventsRemaining={eventsRemaining}
                            //       forward={false}
                            //     />
                            //   ) : null
                            // }
                            // loadNextButton={
                            //   hasNextPage ? (
                            //     <ProcessTreeLoadMoreButton
                            //       text={LOAD_NEXT_TEXT}
                            //       onClick={fetchNextPage}
                            //       isFetching={isFetching}
                            //       eventsRemaining={eventsRemaining}
                            //       forward={true}
                            //     />
                            //   ) : null
                            // }
                          />
                        ) : (
                          <ProcessTreeNode
                            process={flattenedLeader[index]}
                            onProcessSelected={onProcessSelected}
                            onToggleChild={toggleProcessChildComponent}
                            onToggleAlerts={toggleProcessAlerts}
                            jumpToEntityId={jumpToEntityId}
                            investigatedAlertId={investigatedAlertId}
                            selectedProcess={selectedProcess}
                            // scrollerRef={scrollerRef}
                            onChangeJumpToEventVisibility={onChangeJumpToEventVisibility}
                            onShowAlertDetails={onShowAlertDetails}
                            showTimestamp={showTimestamp}
                            verboseMode={verboseMode}
                            searchResults={searchResults}
                            isLastResult={index === flattenedListLength - 1}
                            depth={2}
                            batchUpdateRowHeight={() => {
                              batchUpdateRowHeight(index);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                }}
                width={width || 800}
              />
            )
          }
        </AutoSizer>
      </div>
      {!isInvestigatedEventVisible && (
        <BackToInvestigatedAlert
          onClick={handleBackToInvestigatedAlert}
          isDisplayedAbove={isInvestigatedEventAbove}
        />
      )}
    </>
  );
};
