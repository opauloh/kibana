/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { SettingsFlyout } from '.';
import { useKibana } from '../../../common/lib/kibana';
import { TestProviders } from '../../../common/mock';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { ATTACK_DISCOVERY_SETTINGS } from './translations';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

jest.mock('../../../common/hooks/use_experimental_features');
jest.mock('../../../common/lib/kibana');
jest.mock('../../../sourcerer/containers');
jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));

const defaultProps = {
  end: undefined,
  filters: undefined,
  localStorageAttackDiscoveryMaxAlerts: undefined,
  onClose: jest.fn(),
  query: undefined,
  setEnd: jest.fn(),
  setFilters: jest.fn(),
  setLocalStorageAttackDiscoveryMaxAlerts: jest.fn(),
  setQuery: jest.fn(),
  setStart: jest.fn(),
  start: undefined,
};

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;

describe('SettingsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);

    mockUseKibana.mockReturnValue({
      services: {
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);
  });

  it('renders the flyout title', () => {
    render(
      <TestProviders>
        <SettingsFlyout {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getAllByTestId('title')[0]).toHaveTextContent(ATTACK_DISCOVERY_SETTINGS);
  });

  it('invokes onClose when the close button is clicked', () => {
    render(
      <TestProviders>
        <SettingsFlyout {...defaultProps} />
      </TestProviders>
    );

    const closeButton = screen.getByTestId('euiFlyoutCloseButton');
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should not render Settings tab', () => {
    expect(screen.queryByRole('tab', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('should not render Schedule tab', () => {
    expect(screen.queryByRole('tab', { name: 'Schedule' })).not.toBeInTheDocument();
  });

  describe('when the save button is clicked', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <SettingsFlyout {...defaultProps} />
        </TestProviders>
      );

      const save = screen.getByTestId('save');
      fireEvent.click(save);
    });

    it('invokes setEnd', () => {
      expect(defaultProps.setEnd).toHaveBeenCalled();
    });

    it('invokes setFilters', () => {
      expect(defaultProps.setFilters).toHaveBeenCalled();
    });

    it('invokes setQuery', () => {
      expect(defaultProps.setQuery).toHaveBeenCalled();
    });

    it('invokes setStart', () => {
      expect(defaultProps.setStart).toHaveBeenCalled();
    });

    it('invokes setLocalStorageAttackDiscoveryMaxAlerts', () => {
      expect(defaultProps.setLocalStorageAttackDiscoveryMaxAlerts).toHaveBeenCalled();
    });

    it('invokes onClose', () => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('when `assistantAttackDiscoverySchedulingEnabled` feature flag is enabled', () => {
    beforeEach(() => {
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      render(
        <TestProviders>
          <SettingsFlyout {...defaultProps} />
        </TestProviders>
      );
    });

    it('should render Settings tab', () => {
      expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();
    });

    it('should render Schedule tab', () => {
      expect(screen.getByRole('tab', { name: 'Schedule' })).toBeInTheDocument();
    });

    it('should switch to Settings tab and show `AlertSelectionQuery`', async () => {
      const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
      act(() => {
        fireEvent.click(scheduleTabButton); // clicking invokes tab switching
      });
      await waitFor(() => {
        expect(screen.getByTestId('emptySchedule')).toBeInTheDocument();
      });
    });

    it('should switch to Settings tab and show `AlertSelectionRange`', async () => {
      const scheduleTabButton = screen.getByRole('tab', { name: 'Schedule' });
      act(() => {
        fireEvent.click(scheduleTabButton); // clicking invokes tab switching
      });
      await waitFor(() => {
        expect(screen.getByTestId('createSchedule')).toBeInTheDocument();
      });
    });
  });
});
