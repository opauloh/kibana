/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse, stringify } from 'query-string';
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useEffect,
  type FC,
  type PropsWithChildren,
} from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { isEqual } from 'lodash';

import { getNestedProperty } from '@kbn/ml-nested-property';
import { decode, encode } from '@kbn/rison';

import type { Observable } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import useDeepCompareEffect from 'react-use/lib/useDeepCompareEffect';

export interface Dictionary<TValue> {
  [id: string]: TValue;
}

export interface ListingPageUrlState {
  pageSize: number;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
  queryText?: string;
  showPerPageOptions?: boolean;
  showAll?: boolean;
}

export type Accessor = '_a' | '_g';
export type SetUrlState = (
  accessor: Accessor,
  attribute: string | Dictionary<any>,
  value?: any,
  replaceState?: boolean
) => void;
export interface UrlState {
  searchString: string;
  setUrlState: SetUrlState;
}

/**
 * Set of URL query parameters that require the rison serialization.
 */
const risonSerializedParams = new Set(['_a', '_g']);

/**
 * Checks if the URL query parameter requires rison serialization.
 * @param queryParam
 */
export function isRisonSerializationRequired(queryParam: string): boolean {
  return risonSerializedParams.has(queryParam);
}

export function parseUrlState(search: string): Dictionary<any> {
  const urlState: Dictionary<any> = Object.create(null);
  const parsedQueryString = parse(search, { sort: false });

  try {
    Object.keys(parsedQueryString).forEach((a) => {
      if (isRisonSerializationRequired(a)) {
        urlState[a] = decode(parsedQueryString[a] as string);
      } else {
        urlState[a] = parsedQueryString[a];
      }
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Could not read url state', error);
  }

  return urlState;
}

// Compared to the original appState/globalState,
// this no longer makes use of fetch/save methods.
// - Reading from `location.search` is the successor of `fetch`.
// - `history.push()` is the successor of `save`.
// - The exposed state and set call make use of the above and make sure that
//   different urlStates(e.g. `_a` / `_g`) don't overwrite each other.
// This uses a context to be able to maintain only one instance
// of the url state. It gets passed down with `UrlStateProvider`
// and can be used via `useUrlState`.
export const urlStateStore = createContext<UrlState>({
  searchString: '',
  setUrlState: () => {},
});

export const { Provider } = urlStateStore;

export const UrlStateProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const history = useHistory();
  const { search: searchString } = useLocation();

  const searchStringRef = useRef<string>(searchString);

  useEffect(() => {
    searchStringRef.current = searchString;
  }, [searchString]);

  const setUrlState: SetUrlState = useCallback(
    (
      accessor: Accessor,
      attribute: string | Dictionary<any>,
      value?: any,
      replaceState?: boolean
    ) => {
      const prevSearchString = searchStringRef.current;

      const urlState = parseUrlState(prevSearchString);
      const parsedQueryString = parse(prevSearchString, { sort: false });

      if (!Object.hasOwn(urlState, accessor)) {
        urlState[accessor] = Object.create(null);
      }

      if (typeof attribute === 'string') {
        if (isEqual(getNestedProperty(urlState, `${accessor}.${attribute}`), value)) {
          return prevSearchString;
        }

        urlState[accessor][attribute] = value;
      } else {
        const attributes = attribute;
        Object.keys(attributes).forEach((a) => {
          urlState[accessor][a] = attributes[a];
        });
      }

      try {
        const oldLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        Object.keys(urlState).forEach((a) => {
          if (isRisonSerializationRequired(a)) {
            parsedQueryString[a] = encode(urlState[a]);
          } else {
            parsedQueryString[a] = urlState[a];
          }
        });
        const newLocationSearchString = stringify(parsedQueryString, {
          sort: false,
          encode: false,
        });

        if (oldLocationSearchString !== newLocationSearchString) {
          const newSearchString = stringify(parsedQueryString, { sort: false });
          // Another `setUrlState` call could happen before the updated
          // `searchString` gets propagated via `useLocation` therefore
          // we update the ref right away too.
          searchStringRef.current = newSearchString;
          if (replaceState) {
            history.replace({ search: newSearchString });
          } else {
            history.push({ search: newSearchString });
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Could not save url state', error);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <Provider value={{ searchString, setUrlState }}>{children}</Provider>;
};

export const useUrlState = (
  accessor: Accessor
): [
  Record<string, any>,
  (attribute: string | Dictionary<unknown>, value?: unknown, replaceState?: boolean) => void
] => {
  const { searchString, setUrlState: setUrlStateContext } = useContext(urlStateStore);

  const urlState = useMemo(() => {
    const fullUrlState = parseUrlState(searchString);
    if (typeof fullUrlState === 'object') {
      return fullUrlState[accessor];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString]);

  const setUrlState = useCallback(
    (attribute: string | Dictionary<unknown>, value?: unknown, replaceState?: boolean) => {
      setUrlStateContext(accessor, attribute, value, replaceState);
    },
    [accessor, setUrlStateContext]
  );
  return [urlState, setUrlState];
};

/**
 * Service for managing URL state of particular page.
 */
export class UrlStateService<T> {
  private _urlState$ = new BehaviorSubject<T | null>(null);
  private _urlStateCallback: ((update: Partial<T>, replaceState?: boolean) => void) | null = null;

  /**
   * Provides updates for the page URL state.
   */
  public getUrlState$(): Observable<T> {
    return this._urlState$.pipe(distinctUntilChanged(isEqual));
  }

  public getUrlState(): T | null {
    return this._urlState$.getValue();
  }

  public updateUrlState(update: Partial<T>, replaceState?: boolean): void {
    if (!this._urlStateCallback) {
      throw new Error('Callback has not been initialized.');
    }
    this._urlStateCallback(update, replaceState);
  }

  /**
   * Populates internal subject with currently active state.
   * @param currentState
   */
  public setCurrentState(currentState: T): void {
    this._urlState$.next(currentState);
  }

  /**
   * Sets the callback for the state update.
   * @param callback
   */
  public setUpdateCallback(callback: (update: Partial<T>, replaceState?: boolean) => void): void {
    this._urlStateCallback = callback;
  }
}

export interface PageUrlState {
  pageKey: string;
  pageUrlState: object;
}

interface AppStateOptions<T> {
  pageKey: string;
  defaultState?: T;
}

interface GlobalStateOptions<T> {
  defaultState?: T;
}

type UrlStateOptions<K extends Accessor, T> = K extends '_a'
  ? AppStateOptions<T>
  : GlobalStateOptions<T>;

function isAppStateOptions<T>(
  _stateKey: Accessor,
  options: Partial<AppStateOptions<T>>
): options is AppStateOptions<T> {
  return 'pageKey' in options;
}

export const useUrlStateService = <K extends Accessor, T>(
  stateKey: K,
  options: UrlStateOptions<K, T>
): [T, (update: Partial<T>, replaceState?: boolean) => void, UrlStateService<T>] => {
  const optionsRef = useRef(options);

  useDeepCompareEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [state, setState] = useUrlState(stateKey);
  const urlState = isAppStateOptions<T>(stateKey, optionsRef.current)
    ? state?.[optionsRef.current.pageKey]
    : state;

  const setCallback = useRef<typeof setState>(setState);

  useEffect(() => {
    setCallback.current = setState;
  }, [setState]);

  const prevPageState = useRef<T | undefined>();

  const resultState: T = useMemo(() => {
    const result = {
      ...(optionsRef.current.defaultState ?? {}),
      ...(urlState ?? {}),
    };

    if (isEqual(result, prevPageState.current)) {
      return prevPageState.current;
    }

    // Compare prev and current states to only update changed values
    if (isPopulatedObject(prevPageState.current)) {
      for (const key in result) {
        if (isEqual(result[key], prevPageState.current[key])) {
          result[key] = prevPageState.current[key];
        }
      }
    }

    prevPageState.current = result;

    return result;
  }, [urlState]);

  const onStateUpdate = useCallback(
    (update: Partial<T>, replaceState?: boolean) => {
      if (!setCallback?.current) {
        throw new Error('Callback for URL state update has not been initialized.');
      }
      if (isAppStateOptions<T>(stateKey, optionsRef.current)) {
        setCallback.current(
          optionsRef.current.pageKey,
          {
            ...resultState,
            ...update,
          },
          replaceState
        );
      } else {
        setCallback.current({ ...resultState, ...update }, replaceState);
      }
    },
    [stateKey, resultState]
  );

  const urlStateService = useMemo(() => new UrlStateService<T>(), []);

  useEffect(
    function updateUrlStateService() {
      urlStateService.setCurrentState(resultState);
      urlStateService.setUpdateCallback(onStateUpdate);
    },
    [urlStateService, onStateUpdate, resultState]
  );

  return useMemo(
    () => [resultState, onStateUpdate, urlStateService],
    [resultState, onStateUpdate, urlStateService]
  );
};

/**
 * Hook for managing the URL state of the page.
 */
export const usePageUrlState = <T extends PageUrlState>(
  pageKey: T['pageKey'],
  defaultState?: T['pageUrlState']
): [
  T['pageUrlState'],
  (update: Partial<T['pageUrlState']>, replaceState?: boolean) => void,
  UrlStateService<T['pageUrlState']>
] => {
  return useUrlStateService<'_a', T['pageUrlState']>('_a', { pageKey, defaultState });
};

/**
 * Global state type, to add more state types, add them here
 */

export interface GlobalState {
  ml: {
    jobIds: string[];
  };
  time?: {
    from: string;
    to: string;
  };
}

/**
 * Hook for managing the global URL state.
 */
export const useGlobalUrlState = (
  defaultState?: GlobalState
): [
  GlobalState,
  (update: Partial<GlobalState>, replaceState?: boolean) => void,
  UrlStateService<GlobalState>
] => {
  return useUrlStateService<'_g', GlobalState>('_g', { defaultState });
};
