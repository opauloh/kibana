/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import deepEqual from 'fast-deep-equal';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs';
import { createStateContainer, StateContainer } from '@kbn/kibana-utils-plugin/public';
import type { SearchSessionSavedObject } from './sessions_client';

/**
 * Possible state that current session can be in
 *
 * @public
 */
export enum SearchSessionState {
  /**
   * Session is not active, e.g. didn't start
   */
  None = 'none',

  /**
   * Pending search request has not been sent to the background yet
   */
  Loading = 'loading',

  /**
   * No action was taken and the page completed loading without search session creation.
   */
  Completed = 'completed',

  /**
   * Search session was sent to the background.
   * The page is loading in background.
   */
  BackgroundLoading = 'backgroundLoading',

  /**
   * Page load completed with search session created.
   */
  BackgroundCompleted = 'backgroundCompleted',

  /**
   * Revisiting the page after background completion
   */
  Restored = 'restored',

  /**
   * Current session requests where explicitly canceled by user
   * Displaying none or partial results
   */
  Canceled = 'canceled',
}

/**
 * State of the tracked search
 */
export enum TrackedSearchState {
  InProgress = 'inProgress',
  Completed = 'completed',
  Errored = 'errored',
}

export interface TrackedSearch<SearchDescriptor = unknown, SearchMeta extends {} = {}> {
  state: TrackedSearchState;
  searchDescriptor: SearchDescriptor;
  searchMeta: SearchMeta;
}

/**
 * Internal state of SessionService
 * {@link SearchSessionState} is inferred from this state
 *
 * @internal
 */
export interface SessionStateInternal<SearchDescriptor = unknown, SearchMeta extends {} = {}> {
  /**
   * Current session Id
   * Empty means there is no current active session.
   */
  sessionId?: string;

  /**
   * App that created this session
   */
  appName?: string;

  /**
   * Has the session already been stored (i.e. "sent to background")?
   */
  isStored: boolean;

  /**
   * Saved object of a current search session
   */
  searchSessionSavedObject?: SearchSessionSavedObject;

  /**
   * Is this session a restored session (have these requests already been made, and we're just
   * looking to re-use the previous search IDs)?
   */
  isRestore: boolean;

  /**
   * Set of all searches within a session and any info associated with them
   */
  trackedSearches: Array<TrackedSearch<SearchDescriptor, SearchMeta>>;

  /**
   * There was at least a single search in this session
   */
  isStarted: boolean;

  /**
   * If user has explicitly canceled search requests
   */
  isCanceled: boolean;

  /**
   * If session was continued from a different app,
   * If session continued from a different app, then it is very likely that `trackedSearches`
   * doesn't have all the search that were included into the session.
   * Session that was continued can't be saved because we can't guarantee all the searches saved.
   * This limitation should be fixed in https://github.com/elastic/kibana/issues/121543
   *
   * @deprecated - https://github.com/elastic/kibana/issues/121543
   */
  isContinued: boolean;

  /**
   * Start time of the current session (from browser perspective)
   */
  startTime?: Date;

  /**
   * Time when all the searches from the current session are completed (from browser perspective)
   */
  completedTime?: Date;

  /**
   * Time when the session was canceled by user, by hitting "stop"
   */
  canceledTime?: Date;
}

const createSessionDefaultState: <
  SearchDescriptor = unknown,
  SearchMeta extends {} = {}
>() => SessionStateInternal<SearchDescriptor, SearchMeta> = () => ({
  sessionId: undefined,
  appName: undefined,
  isStored: false,
  isRestore: false,
  isCanceled: false,
  isContinued: false,
  isStarted: false,
  trackedSearches: [],
});

export interface SessionPureTransitions<
  SearchDescriptor = unknown,
  SearchMeta extends {} = {},
  S = SessionStateInternal<SearchDescriptor, SearchMeta>
> {
  start: (state: S) => ({ appName }: { appName: string }) => S;
  restore: (state: S) => (sessionId: string) => S;
  clear: (state: S) => () => S;
  store: (state: S) => (searchSessionSavedObject: SearchSessionSavedObject) => S;
  trackSearch: (state: S) => (search: SearchDescriptor, meta?: SearchMeta) => S;
  removeSearch: (state: S) => (search: SearchDescriptor) => S;
  completeSearch: (state: S) => (search: SearchDescriptor) => S;
  errorSearch: (state: S) => (search: SearchDescriptor) => S;
  updateSearchMeta: (state: S) => (search: SearchDescriptor, meta: Partial<SearchMeta>) => S;

  cancel: (state: S) => () => S;
  setSearchSessionSavedObject: (
    state: S
  ) => (searchSessionSavedObject: SearchSessionSavedObject) => S;
}

export const sessionPureTransitions: SessionPureTransitions = {
  start:
    (state) =>
    ({ appName }) => ({
      ...createSessionDefaultState(),
      sessionId: uuidv4(),
      startTime: new Date(),
      appName,
    }),
  restore: (state) => (sessionId: string) => ({
    ...createSessionDefaultState(),
    sessionId,
    isRestore: true,
    isStored: true,
  }),
  clear: (state) => () => createSessionDefaultState(),
  store: (state) => (searchSessionSavedObject: SearchSessionSavedObject) => {
    if (!state.sessionId) throw new Error("Can't store session. Missing sessionId");
    if (state.isStored || state.isRestore)
      throw new Error('Can\'t store because current session is already stored"');
    return {
      ...state,
      isStored: true,
      searchSessionSavedObject,
    };
  },
  trackSearch:
    (state) =>
    (search, meta = {}) => {
      if (!state.sessionId) throw new Error("Can't track search. Missing sessionId");
      return {
        ...state,
        isStarted: true,
        trackedSearches: state.trackedSearches.concat({
          state: TrackedSearchState.InProgress,
          searchDescriptor: search,
          searchMeta: meta,
        }),
        completedTime: undefined,
      };
    },
  removeSearch: (state) => (search) => {
    const trackedSearches = state.trackedSearches.filter((s) => s.searchDescriptor !== search);
    return {
      ...state,
      trackedSearches,
      completedTime:
        trackedSearches.filter((s) => s.state !== TrackedSearchState.InProgress).length === 0
          ? new Date()
          : state.completedTime,
    };
  },
  completeSearch: (state) => (search) => {
    return {
      ...state,
      trackedSearches: state.trackedSearches.map((s) => {
        if (s.searchDescriptor === search) {
          return {
            ...s,
            state: TrackedSearchState.Completed,
          };
        }

        return s;
      }),
    };
  },
  errorSearch: (state) => (search) => {
    return {
      ...state,
      trackedSearches: state.trackedSearches.map((s) => {
        if (s.searchDescriptor === search) {
          return {
            ...s,
            state: TrackedSearchState.Errored,
          };
        }

        return s;
      }),
    };
  },
  updateSearchMeta: (state) => (search, meta) => {
    return {
      ...state,
      trackedSearches: state.trackedSearches.map((s) => {
        if (s.searchDescriptor === search) {
          return {
            ...s,
            searchMeta: {
              ...s.searchMeta,
              ...meta,
            },
          };
        }

        return s;
      }),
    };
  },
  cancel: (state) => () => {
    if (!state.sessionId) throw new Error("Can't cancel searches. Missing sessionId");
    if (state.isRestore) throw new Error("Can't cancel searches when restoring older searches");
    return {
      ...state,
      pendingSearches: [],
      isCanceled: true,
      canceledTime: new Date(),
      isStored: false,
      searchSessionSavedObject: undefined,
    };
  },
  setSearchSessionSavedObject: (state) => (searchSessionSavedObject: SearchSessionSavedObject) => {
    if (!state.sessionId)
      throw new Error(
        "Can't add search session saved object session into the state. Missing sessionId"
      );
    if (state.sessionId !== searchSessionSavedObject.attributes.sessionId)
      throw new Error(
        "Can't add search session saved object session into the state. SessionIds don't match."
      );
    return {
      ...state,
      searchSessionSavedObject,
    };
  },
};

/**
 * Consolidate meta info about current seach session
 * Contains both deferred properties and plain properties from state
 */
export interface SessionMeta {
  state: SearchSessionState;
  name?: string;
  startTime?: Date;
  canceledTime?: Date;
  completedTime?: Date;

  /**
   * @deprecated - see remarks in {@link SessionStateInternal}
   */
  isContinued: boolean;
}

export interface SessionPureSelectors<
  SearchDescriptor = unknown,
  SearchMeta extends {} = {},
  S = SessionStateInternal<SearchDescriptor, SearchMeta>
> {
  getState: (state: S) => () => SearchSessionState;
  getMeta: (state: S) => () => SessionMeta;
  getSearch: (
    state: S
  ) => (search: SearchDescriptor) => TrackedSearch<SearchDescriptor, SearchMeta> | null;
}

export const sessionPureSelectors: SessionPureSelectors = {
  getState: (state) => () => {
    if (!state.sessionId) return SearchSessionState.None;
    if (!state.isStarted) return SearchSessionState.None;
    if (state.isCanceled) return SearchSessionState.Canceled;

    const pendingSearches = state.trackedSearches.filter(
      (s) => s.state === TrackedSearchState.InProgress
    );

    switch (true) {
      case state.isRestore:
        return pendingSearches.length > 0
          ? SearchSessionState.BackgroundLoading
          : SearchSessionState.Restored;
      case state.isStored:
        return pendingSearches.length > 0
          ? SearchSessionState.BackgroundLoading
          : SearchSessionState.BackgroundCompleted;
      default:
        return pendingSearches.length > 0
          ? SearchSessionState.Loading
          : SearchSessionState.Completed;
    }
    return SearchSessionState.None;
  },
  getMeta(state) {
    const sessionState = this.getState(state)();

    return () => ({
      state: sessionState,
      name: state.searchSessionSavedObject?.attributes.name,
      startTime: state.searchSessionSavedObject?.attributes.created
        ? new Date(state.searchSessionSavedObject?.attributes.created)
        : state.startTime,
      completedTime: state.completedTime,
      canceledTime: state.canceledTime,
      isContinued: state.isContinued,
    });
  },
  getSearch(state) {
    return (search) => {
      return state.trackedSearches.find((s) => s.searchDescriptor === search) ?? null;
    };
  },
};

export type SessionStateContainer<
  SearchDescriptor = unknown,
  SearchMeta extends {} = {}
> = StateContainer<
  SessionStateInternal<SearchDescriptor, SearchMeta>,
  SessionPureTransitions<SearchDescriptor, SearchMeta>,
  SessionPureSelectors<SearchDescriptor, SearchMeta>
>;

export const createSessionStateContainer = <SearchDescriptor = unknown, SearchMeta extends {} = {}>(
  { freeze = true }: { freeze: boolean } = { freeze: true }
): {
  stateContainer: SessionStateContainer<SearchDescriptor, SearchMeta>;
  sessionState$: Observable<SearchSessionState>;
  sessionMeta$: Observable<SessionMeta>;
} => {
  const stateContainer = createStateContainer(
    createSessionDefaultState(),
    sessionPureTransitions,
    sessionPureSelectors,
    freeze ? undefined : { freeze: (s) => s }
  ) as unknown as SessionStateContainer<SearchDescriptor, SearchMeta>;

  const sessionMeta$: Observable<SessionMeta> = stateContainer.state$.pipe(
    map(() => stateContainer.selectors.getMeta()),
    distinctUntilChanged(deepEqual),
    shareReplay(1)
  );

  const sessionState$: Observable<SearchSessionState> = sessionMeta$.pipe(
    map((meta) => meta.state),
    distinctUntilChanged()
  );

  return {
    stateContainer,
    sessionState$,
    sessionMeta$,
  };
};
