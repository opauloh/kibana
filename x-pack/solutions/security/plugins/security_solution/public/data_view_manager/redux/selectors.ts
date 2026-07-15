/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { PageScope } from '../constants';
import type { RootState } from './reducer';

export const sourcererAdapterSelector = (scope: PageScope) =>
  createSelector([(state: RootState) => state.dataViewManager], (dataViewManager) => {
    const scopedState = dataViewManager[scope];

    return {
      ...scopedState,
    };
  });

export const sharedStateSelector = createSelector(
  [(state: RootState) => state.dataViewManager],
  (dataViewManager) => dataViewManager.shared
);

/**
 * Resolves the selected index patterns for a scope directly from the store state
 * (matching what `useSelectedPatterns` derives from the resolved data view's
 * `getIndexPattern()`, which is the spec `title`).
 *
 * This is intended for lazy reads inside callbacks (e.g. `store.getState()`), so
 * callers can obtain the patterns at call time without subscribing to (and
 * re-rendering on) data view changes for a scope they don't actually render.
 */
export const selectDataViewPatternsForScope = (state: RootState, scope: PageScope): string[] => {
  const { dataViewId } = state.dataViewManager[scope];
  if (!dataViewId) {
    return [];
  }
  const { dataViews, adhocDataViews } = state.dataViewManager.shared;
  const spec = [...dataViews, ...adhocDataViews].find((dataView) => dataView.id === dataViewId);
  return spec?.title ? spec.title.split(',') : [];
};

// NOTE: This will be subject to cleanup tasks https://github.com/elastic/security-team/issues/11959
export const signalIndexNameSelector = createSelector(
  [(state: RootState) => state.dataViewManager],
  (dataViewManager) => dataViewManager.shared.signalIndex?.name ?? ''
);

// NOTE: This will be subject to cleanup tasks https://github.com/elastic/security-team/issues/11959
export const signalIndexOutdatedSelector = createSelector(
  [(state: RootState) => state.dataViewManager],
  (dataViewManager) => !!dataViewManager.shared.signalIndex?.isOutdated
);
