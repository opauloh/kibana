/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { type DiscoverEBTContextProps, DiscoverEBTManager } from './discover_ebt_manager';
import { registerDiscoverEBTManagerAnalytics } from './discover_ebt_manager_registrations';
import { ContextualProfileLevel } from '../context_awareness/profiles_manager';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';

describe('DiscoverEBTManager', () => {
  let discoverEBTContextManager: DiscoverEBTManager;
  let discoverEbtContext$: BehaviorSubject<DiscoverEBTContextProps>;

  const coreSetupMock = coreMock.createSetup();

  const fieldsMetadata = {
    getClient: jest.fn().mockResolvedValue({
      find: jest.fn().mockResolvedValue({
        fields: {
          test: {
            short: 'test',
          },
        },
      }),
    }),
  } as unknown as FieldsMetadataPublicStart;

  beforeEach(() => {
    discoverEBTContextManager = new DiscoverEBTManager();
    discoverEbtContext$ = new BehaviorSubject<DiscoverEBTContextProps>({
      discoverProfiles: [],
    });
    (coreSetupMock.analytics.reportEvent as jest.Mock).mockClear();
  });

  describe('register', () => {
    it('should register the context provider and custom events', () => {
      registerDiscoverEBTManagerAnalytics(coreSetupMock, discoverEbtContext$);

      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      expect(coreSetupMock.analytics.registerContextProvider).toHaveBeenCalledWith({
        name: 'discover_context',
        context$: expect.any(BehaviorSubject),
        schema: {
          discoverProfiles: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'List of active Discover context awareness profiles',
              },
            },
          },
        },
      });

      expect(coreSetupMock.analytics.registerEventType).toHaveBeenCalledWith({
        eventType: 'discover_field_usage',
        schema: {
          eventName: {
            type: 'keyword',
            _meta: {
              description:
                'The name of the event that is tracked in the metrics i.e. dataTableSelection, dataTableRemoval',
            },
          },
          fieldName: {
            type: 'keyword',
            _meta: {
              description: "Field name if it's a part of ECS schema",
              optional: true,
            },
          },
          filterOperation: {
            type: 'keyword',
            _meta: {
              description: "Operation type when a filter is added i.e. '+', '-', '_exists_'",
              optional: true,
            },
          },
        },
      });
    });
  });

  describe('updateProfilesWith', () => {
    it('should update the profiles with the provided props', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile21', 'profile22'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles2);
    });

    it('should not update the profiles if profile list did not change', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile1', 'profile2'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
    });

    it('should not update the profiles if not enabled yet', () => {
      const dscProfiles = ['profile1', 'profile2'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
    });

    it('should not update the profiles after resetting unless enabled again', () => {
      const dscProfiles = ['profile1', 'profile2'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
      discoverEBTContextManager.onDiscoverAppUnmounted();
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      discoverEBTContextManager.onDiscoverAppMounted();
      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
    });
  });

  describe('trackFieldUsageEvent', () => {
    it('should track the field usage when a field is added to the table', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      await discoverEBTContextManager.trackDataTableSelection({
        fieldName: 'test',
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith('discover_field_usage', {
        eventName: 'dataTableSelection',
        fieldName: 'test',
      });

      await discoverEBTContextManager.trackDataTableSelection({
        fieldName: 'test2',
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenLastCalledWith('discover_field_usage', {
        eventName: 'dataTableSelection', // non-ECS fields would not be included in properties
      });
    });

    it('should track the field usage when a field is removed from the table', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      await discoverEBTContextManager.trackDataTableRemoval({
        fieldName: 'test',
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith('discover_field_usage', {
        eventName: 'dataTableRemoval',
        fieldName: 'test',
      });

      await discoverEBTContextManager.trackDataTableRemoval({
        fieldName: 'test2',
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenLastCalledWith('discover_field_usage', {
        eventName: 'dataTableRemoval', // non-ECS fields would not be included in properties
      });
    });

    it('should track the field usage when a filter is created', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      await discoverEBTContextManager.trackFilterAddition({
        fieldName: 'test',
        fieldsMetadata,
        filterOperation: '+',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith('discover_field_usage', {
        eventName: 'filterAddition',
        fieldName: 'test',
        filterOperation: '+',
      });

      await discoverEBTContextManager.trackFilterAddition({
        fieldName: 'test2',
        fieldsMetadata,
        filterOperation: '_exists_',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenLastCalledWith('discover_field_usage', {
        eventName: 'filterAddition', // non-ECS fields would not be included in properties
        filterOperation: '_exists_',
      });
    });
  });

  describe('trackContextualProfileResolvedEvent', () => {
    it('should track the event when a next contextual profile is resolved', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenNthCalledWith(
        1,
        'discover_profile_resolved',
        {
          contextLevel: 'rootLevel',
          profileId: 'test',
        }
      );

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.dataSourceLevel,
        profileId: 'data-source-test',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenNthCalledWith(
        2,
        'discover_profile_resolved',
        {
          contextLevel: 'dataSourceLevel',
          profileId: 'data-source-test',
        }
      );

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.documentLevel,
        profileId: 'document-test',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenNthCalledWith(
        3,
        'discover_profile_resolved',
        {
          contextLevel: 'documentLevel',
          profileId: 'document-test',
        }
      );
    });

    it('should not trigger duplicate requests', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test1',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(1);

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test1',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(1);

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test2',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(2);
    });

    it('should trigger similar requests after remount', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test1',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(1);

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test1',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(1);

      discoverEBTContextManager.onDiscoverAppUnmounted();
      discoverEBTContextManager.onDiscoverAppMounted();

      discoverEBTContextManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test1',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(2);
    });
  });
});
