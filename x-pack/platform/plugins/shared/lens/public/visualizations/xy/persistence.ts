/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Reference } from '@kbn/content-management-utils';
import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';

import { layerTypes } from '../../../common/layer_types';
import { AnnotationGroups } from '../../types';
import {
  XYLayerConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  XYState,
  XYAnnotationLayerConfig,
  XYByReferenceAnnotationLayerConfig,
  XYByValueAnnotationLayerConfig,
} from './types';
import { isAnnotationsLayer, isByReferenceAnnotationsLayer } from './visualization_helpers';
import { nonNullable } from '../../utils';
import { annotationLayerHasUnsavedChanges } from './state_helpers';

export const isPersistedByReferenceAnnotationsLayer = (
  layer: XYPersistedAnnotationLayerConfig
): layer is XYPersistedByReferenceAnnotationLayerConfig =>
  isPersistedAnnotationsLayer(layer) && layer.persistanceType === 'byReference';

export const isPersistedLinkedByValueAnnotationsLayer = (
  layer: XYPersistedAnnotationLayerConfig
): layer is XYPersistedLinkedByValueAnnotationLayerConfig =>
  isPersistedAnnotationsLayer(layer) && layer.persistanceType === 'linked';

/**
 * This is the type of hybrid layer we get after the user has made a change to
 * a by-reference annotation layer and saved the visualization without
 * first saving the changes to the library annotation layer.
 *
 * We maintain the link to the library annotation group, but allow the users
 * changes (persisted in the visualization state) to override the attributes in
 * the library version until the user
 * - saves the changes to the library annotation group
 * - reverts the changes
 * - unlinks the layer from the library annotation group
 */
export type XYPersistedLinkedByValueAnnotationLayerConfig = Omit<
  XYPersistedByValueAnnotationLayerConfig,
  'persistanceType'
> &
  Omit<XYPersistedByReferenceAnnotationLayerConfig, 'persistanceType'> & {
    persistanceType: 'linked';
  };

export type XYPersistedByValueAnnotationLayerConfig = Omit<
  XYByValueAnnotationLayerConfig,
  'indexPatternId' | 'hide' | 'simpleView'
> & { persistanceType?: 'byValue'; hide?: boolean; simpleView?: boolean }; // props made optional for backwards compatibility since this is how the existing saved objects are

export type XYPersistedByReferenceAnnotationLayerConfig = Pick<
  XYByValueAnnotationLayerConfig,
  'layerId' | 'layerType'
> & {
  persistanceType: 'byReference';
  annotationGroupRef: string;
};

export type XYPersistedAnnotationLayerConfig =
  | XYPersistedByReferenceAnnotationLayerConfig
  | XYPersistedByValueAnnotationLayerConfig
  | XYPersistedLinkedByValueAnnotationLayerConfig;

export type XYPersistedLayerConfig =
  | XYDataLayerConfig
  | XYReferenceLineLayerConfig
  | XYPersistedAnnotationLayerConfig;

export type XYPersistedState = Omit<XYState, 'layers'> & {
  layers: XYPersistedLayerConfig[];
  valuesInLegend?: boolean;
};

export function convertPersistedState(
  state: XYPersistedState,
  annotationGroups?: AnnotationGroups,
  references?: Reference[]
) {
  return structuredClone(injectReferences(state, annotationGroups, references));
}

export function convertToPersistable(state: XYState) {
  const persistableState: XYPersistedState = state;
  const references: Reference[] = [];
  const persistableLayers: XYPersistedLayerConfig[] = [];

  persistableState.layers.forEach((layer) => {
    // anything but an annotation can just be persisted as is
    if (!isAnnotationsLayer(layer)) {
      persistableLayers.push(layer);
      return;
    }
    // a by value annotation layer can be persisted with some config tweak
    if (!isByReferenceAnnotationsLayer(layer)) {
      const { indexPatternId, ...persistableLayer } = layer;
      references.push({
        type: 'index-pattern',
        id: indexPatternId,
        name: getLayerReferenceName(layer.layerId),
      });
      persistableLayers.push({ ...persistableLayer, persistanceType: 'byValue' });
      return;
    }
    /**
     * by reference annotation layer needs to be handled carefully
     **/

    // make this id stable so that it won't retrigger all the time a change diff
    const referenceName = `ref-${layer.layerId}`;
    references.push({
      type: EVENT_ANNOTATION_GROUP_TYPE,
      id: layer.annotationGroupId,
      name: referenceName,
    });

    // if there's no divergence from the library, it can be persisted without much ado
    if (!annotationLayerHasUnsavedChanges(layer)) {
      const persistableLayer: XYPersistedByReferenceAnnotationLayerConfig = {
        persistanceType: 'byReference',
        layerId: layer.layerId,
        layerType: layer.layerType,
        annotationGroupRef: referenceName,
      };

      persistableLayers.push(persistableLayer);
      return;
    }
    // this is the case where the by reference diverged from library
    // so it needs to persist some extra metadata
    const persistableLayer: XYPersistedLinkedByValueAnnotationLayerConfig = {
      persistanceType: 'linked',
      cachedMetadata: layer.cachedMetadata || {
        title: layer.__lastSaved.title,
        description: layer.__lastSaved.description,
        tags: layer.__lastSaved.tags,
      },
      layerId: layer.layerId,
      layerType: layer.layerType,
      annotationGroupRef: referenceName,
      annotations: layer.annotations,
      ignoreGlobalFilters: layer.ignoreGlobalFilters,
    };
    persistableLayers.push(persistableLayer);

    references.push({
      type: 'index-pattern',
      id: layer.indexPatternId,
      name: getLayerReferenceName(layer.layerId),
    });
  });
  return { references, state: { ...persistableState, layers: persistableLayers } };
}

export const isPersistedAnnotationsLayer = (
  layer: XYPersistedLayerConfig
): layer is XYPersistedAnnotationLayerConfig =>
  layer.layerType === layerTypes.ANNOTATIONS && !('indexPatternId' in layer);

export const isPersistedByValueAnnotationsLayer = (
  layer: XYPersistedLayerConfig
): layer is XYPersistedByValueAnnotationLayerConfig =>
  isPersistedAnnotationsLayer(layer) &&
  (layer.persistanceType === 'byValue' || !layer.persistanceType);

function getLayerReferenceName(layerId: string) {
  return `xy-visualization-layer-${layerId}`;
}

function needsInjectReferences(state: XYPersistedState | XYState): state is XYPersistedState {
  return state.layers.some(isPersistedAnnotationsLayer);
}

function injectReferences(
  state: XYPersistedState,
  annotationGroups?: AnnotationGroups,
  references?: Reference[]
): XYState {
  if (!references || !references.length) {
    return state as XYState;
  }
  if (!needsInjectReferences(state)) {
    return state as XYState;
  }

  if (!annotationGroups) {
    throw new Error(
      'xy visualization: injecting references relies on annotation groups but they were not provided'
    );
  }

  // called on-demand since indexPattern reference won't be here on the vis if its a by-reference group
  const getIndexPatternIdFromReferences = (annotationLayerId: string) => {
    const fallbackIndexPatternId = references.find(({ type }) => type === 'index-pattern')!.id;
    return (
      references.find(({ name }) => name === getLayerReferenceName(annotationLayerId))?.id ||
      fallbackIndexPatternId
    );
  };

  return {
    ...state,
    layers: state.layers
      .map((persistedLayer) => {
        if (!isPersistedAnnotationsLayer(persistedLayer)) {
          return persistedLayer as XYLayerConfig;
        }

        let injectedLayer: XYAnnotationLayerConfig;

        if (isPersistedByValueAnnotationsLayer(persistedLayer)) {
          injectedLayer = {
            ...persistedLayer,
            indexPatternId: getIndexPatternIdFromReferences(persistedLayer.layerId),
          };
        } else {
          const annotationGroupId = references?.find(
            ({ name }) => name === persistedLayer.annotationGroupRef
          )?.id;

          const annotationGroup = annotationGroupId
            ? annotationGroups[annotationGroupId]
            : undefined;

          if (!annotationGroupId || !annotationGroup) {
            return undefined; // the annotation group this layer was referencing is gone, so remove the layer
          }

          // declared as a separate variable for type checking
          const commonProps: Pick<
            XYByReferenceAnnotationLayerConfig,
            'layerId' | 'layerType' | 'annotationGroupId' | '__lastSaved'
          > = {
            layerId: persistedLayer.layerId,
            layerType: persistedLayer.layerType,
            annotationGroupId,
            __lastSaved: annotationGroup,
          };

          if (isPersistedByReferenceAnnotationsLayer(persistedLayer)) {
            // a clean by-reference layer inherits everything from the library annotation group
            injectedLayer = {
              ...commonProps,
              ignoreGlobalFilters: annotationGroup.ignoreGlobalFilters,
              indexPatternId: annotationGroup.indexPatternId,
              annotations: structuredClone(annotationGroup.annotations),
            };
          } else {
            // a linked by-value layer gets settings from visualization state while
            // still maintaining the reference to the library annotation group
            injectedLayer = {
              ...commonProps,
              ignoreGlobalFilters: persistedLayer.ignoreGlobalFilters,
              indexPatternId: getIndexPatternIdFromReferences(persistedLayer.layerId),
              annotations: structuredClone(persistedLayer.annotations),
              cachedMetadata: persistedLayer.cachedMetadata,
            };
          }
        }

        return injectedLayer;
      })
      .filter(nonNullable),
  };
}
