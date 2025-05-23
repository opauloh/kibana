/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { waitFor } from '@testing-library/react';
import { JobsTableComponent } from './jobs_table';
import { mockSecurityJobs } from '../api.mock';
import { cloneDeep } from 'lodash/fp';
import type { SecurityJob } from '../types';

jest.mock('../../../lib/kibana');

describe('JobsTableComponent', () => {
  let securityJobs: SecurityJob[];
  let onJobStateChangeMock = jest.fn();

  beforeEach(() => {
    securityJobs = cloneDeep(mockSecurityJobs);
    onJobStateChangeMock = jest.fn();
  });

  test('should display the job friendly name', async () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={true}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
        mlNodesAvailable={true}
      />
    );

    await waitFor(() =>
      expect(wrapper.find('[data-test-subj="jobs-table-link"]').first().text()).toContain(
        'Unusual Network Activity'
      )
    );
  });

  test('should call onJobStateChange when the switch is clicked to be true/open', async () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={false}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
        mlNodesAvailable={true}
      />
    );

    wrapper
      .find('button[data-test-subj="job-switch"]')
      .first()
      .simulate('click', {
        target: { checked: true },
      });
    await waitFor(() => {
      expect(onJobStateChangeMock.mock.calls[0]).toEqual([securityJobs[0], 1571022859393, true]);
    });
  });

  test('should have a switch when it is not in the loading state', async () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={false}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
        mlNodesAvailable={true}
      />
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(true);
    });
  });

  test('should not have a switch when it is in the loading state', async () => {
    const wrapper = mount(
      <JobsTableComponent
        isLoading={true}
        jobs={securityJobs}
        onJobStateChange={onJobStateChangeMock}
        mlNodesAvailable={true}
      />
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="job-switch"]').exists()).toBe(false);
    });
  });
});
