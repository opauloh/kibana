/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const security = getService('security');

  const { dashboardControls, timePicker, dashboard } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'common',
    'header',
  ]);

  const DASHBOARD_NAME = 'Test Replace Controls';

  const changeFieldType = async (controlId: string, newField: string, type: string) => {
    await dashboardControls.editExistingControl(controlId);
    await dashboardControls.controlsEditorSetfield(newField);
    await dashboardControls.controlsEditorSetControlType(type);
    await dashboardControls.controlEditorSave();
  };

  const replaceWithOptionsList = async (controlId: string, field: string) => {
    await changeFieldType(controlId, field, OPTIONS_LIST_CONTROL);
    const newControlId: string = (await dashboardControls.getAllControlIds())[0];
    await testSubjects.waitForEnabled(`optionsList-control-${newControlId}`);
    await dashboardControls.verifyControlType(newControlId, 'optionsList-control');
  };

  const replaceWithRangeSlider = async (controlId: string, field: string) => {
    await changeFieldType(controlId, field, RANGE_SLIDER_CONTROL);
    await retry.try(async () => {
      const newControlId: string = (await dashboardControls.getAllControlIds())[0];
      await dashboardControls.rangeSliderWaitForLoading(newControlId);
      await dashboardControls.verifyControlType(newControlId, 'range-slider-control');
    });
  };

  describe('Replacing controls', () => {
    let controlId: string;

    before(async () => {
      await dashboard.navigateToApp();
      await security.testUser.setRoles(['kibana_admin', 'test_logstash_reader', 'animals']);
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
      await timePicker.setDefaultDataRange();
      await dashboard.saveDashboard(DASHBOARD_NAME, {
        exitFromEditMode: false,
        saveAsNew: true,
      });
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    describe('Replace options list', () => {
      beforeEach(async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        controlId = (await dashboardControls.getAllControlIds())[0];
      });

      afterEach(async () => {
        await dashboardControls.clearAllControls();
      });

      it('with range slider - default title', async () => {
        await replaceWithRangeSlider(controlId, 'weightLbs');
        const titles = await dashboardControls.getAllControlTitles();
        expect(titles[0]).to.be('weightLbs');
      });

      it('with options list - custom title', async () => {
        await dashboardControls.editExistingControl(controlId);
        await dashboardControls.controlEditorSetTitle('Custom title');
        await dashboardControls.controlEditorSave();

        await replaceWithRangeSlider(controlId, 'weightLbs');
        const titles = await dashboardControls.getAllControlTitles();
        expect(titles[0]).to.be('Custom title');
      });
    });

    describe('Replace range slider', () => {
      beforeEach(async () => {
        await dashboardControls.createControl({
          controlType: RANGE_SLIDER_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'weightLbs',
        });
        controlId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.rangeSliderWaitForLoading(controlId);
      });

      afterEach(async () => {
        await dashboardControls.clearAllControls();
      });

      it('with options list - default title', async () => {
        await replaceWithOptionsList(controlId, 'sound.keyword');
        const titles = await dashboardControls.getAllControlTitles();
        expect(titles[0]).to.be('sound.keyword');
      });

      it('with options list - custom title', async () => {
        await dashboardControls.editExistingControl(controlId);
        await dashboardControls.controlEditorSetTitle('Custom title');
        await dashboardControls.controlEditorSave();

        await replaceWithOptionsList(controlId, 'sound.keyword');
        const titles = await dashboardControls.getAllControlTitles();
        expect(titles[0]).to.be('Custom title');
      });
    });
  });
}
