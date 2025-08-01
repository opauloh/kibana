/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const filterBar = getService('filterBar');
  const { common, visualize, visEditor, timePicker } = getPageObjects([
    'common',
    'visualize',
    'visEditor',
    'timePicker',
  ]);
  const testSubjects = getService('testSubjects');
  const inspector = getService('inspector');
  const find = getService('find');
  const comboBox = getService('comboBox');
  const retry = getService('retry');
  const FIELD_NAME = 'machine.os.raw';

  describe('input control options', () => {
    before(async () => {
      await visualize.initTests();
      await timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      await common.navigateToApp('visualize');
      await visualize.loadSavedVisualization('input control options', {
        navigateToVisualize: false,
      });
    });

    it('should not have inspector enabled', async function () {
      await inspector.expectIsNotEnabled();
    });

    describe('filter bar', () => {
      it('should show the default index pattern when clicking "Add filter"', async () => {
        await testSubjects.click('addFilter');
        const fields = await filterBar.getFilterEditorFields();
        await filterBar.ensureFieldEditorModalIsClosed();
        expect(fields.length).to.be.greaterThan(0);
      });
    });

    describe('updateFiltersOnChange is false', () => {
      it('should contain dropdown with terms aggregation results as options', async () => {
        const menu = await comboBox.getOptionsList('listControlSelect0');
        expect(menu.trim().split('\n').join()).to.equal('ios,osx,win 7,win 8,win xp');
      });

      it('should display staging control buttons', async () => {
        const submitButtonExists = await testSubjects.exists('inputControlSubmitBtn');
        const cancelButtonExists = await testSubjects.exists('inputControlCancelBtn');
        const clearButtonExists = await testSubjects.exists('inputControlClearBtn');
        expect(submitButtonExists).to.equal(true);
        expect(cancelButtonExists).to.equal(true);
        expect(clearButtonExists).to.equal(true);
      });

      it('should stage filter when item selected but not create filter pill', async () => {
        await comboBox.set('listControlSelect0', 'ios');

        const selectedOptions = await comboBox.getComboBoxSelectedOptions('listControlSelect0');
        expect(selectedOptions[0].trim()).to.equal('ios');

        const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
        expect(hasFilter).to.equal(false);
      });

      it('should add filter pill when submit button is clicked', async () => {
        await visEditor.inputControlSubmit();

        const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
        expect(hasFilter).to.equal(true);
      });

      it('should replace existing filter pill(s) when new item is selected', async () => {
        await comboBox.clear('listControlSelect0');
        await retry.waitFor('input control is clear', async () => {
          return (await comboBox.doesComboBoxHaveSelectedOptions('listControlSelect0')) === false;
        });
        await comboBox.set('listControlSelect0', 'osx');
        await visEditor.inputControlSubmit();
        await common.sleep(1000);

        const hasOldFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
        const hasNewFilter = await filterBar.hasFilter(FIELD_NAME, 'osx');
        expect(hasOldFilter).to.equal(false);
        expect(hasNewFilter).to.equal(true);
      });

      it('should clear dropdown when filter pill removed', async () => {
        await filterBar.removeFilter(FIELD_NAME);
        await common.sleep(500); // give time for filter to be removed and event handlers to fire

        const hasValue = await comboBox.doesComboBoxHaveSelectedOptions('listControlSelect0');
        expect(hasValue).to.equal(false);
      });

      it('should clear form when Clear button is clicked but not remove filter pill', async () => {
        await comboBox.set('listControlSelect0', 'ios');
        await visEditor.inputControlSubmit();
        const hasFilterBeforeClearBtnClicked = await filterBar.hasFilter(FIELD_NAME, 'ios');
        expect(hasFilterBeforeClearBtnClicked).to.equal(true);

        await visEditor.inputControlClear();
        const hasValue = await comboBox.doesComboBoxHaveSelectedOptions('listControlSelect0');
        expect(hasValue).to.equal(false);

        const hasFilterAfterClearBtnClicked = await filterBar.hasFilter(FIELD_NAME, 'ios');
        expect(hasFilterAfterClearBtnClicked).to.equal(true);
      });

      it('should remove filter pill when cleared form is submitted', async () => {
        await visEditor.inputControlSubmit();
        const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
        expect(hasFilter).to.equal(false);
      });
    });

    describe('updateFiltersOnChange is true', () => {
      before(async () => {
        await visEditor.clickVisEditorTab('options');
        await visEditor.checkSwitch('inputControlEditorUpdateFiltersOnChangeCheckbox');
        await visEditor.clickGo();
      });

      after(async () => {
        await visEditor.clickVisEditorTab('options');
        await visEditor.uncheckSwitch('inputControlEditorUpdateFiltersOnChangeCheckbox');
        await visEditor.clickGo();
      });

      it('should not display staging control buttons', async () => {
        const submitButtonExists = await testSubjects.exists('inputControlSubmitBtn');
        const cancelButtonExists = await testSubjects.exists('inputControlCancelBtn');
        const clearButtonExists = await testSubjects.exists('inputControlClearBtn');
        expect(submitButtonExists).to.equal(false);
        expect(cancelButtonExists).to.equal(false);
        expect(clearButtonExists).to.equal(false);
      });

      it('should add filter pill when item selected', async () => {
        await comboBox.set('listControlSelect0', 'ios');

        const selectedOptions = await comboBox.getComboBoxSelectedOptions('listControlSelect0');
        expect(selectedOptions[0].trim()).to.equal('ios');

        const hasFilter = await filterBar.hasFilter(FIELD_NAME, 'ios');
        expect(hasFilter).to.equal(true);
      });
    });

    describe('useTimeFilter', () => {
      it('should use global time filter when getting terms', async () => {
        await visEditor.clickVisEditorTab('options');
        await testSubjects.setCheckbox('inputControlEditorUseTimeFilterCheckbox', 'check');
        await visEditor.clickGo();

        // Expect control to be disabled because no terms could be gathered with time filter applied
        const input = await find.byCssSelector('[data-test-subj="inputControl0"] input');
        const isDisabled = await input.getAttribute('disabled');
        expect(isDisabled).to.equal('true');
      });

      it('should re-create control when global time filter is updated', async () => {
        await timePicker.setAbsoluteRange(
          'Jan 1, 2015 @ 00:00:00.000',
          'Jan 1, 2016 @ 00:00:00.000'
        );

        // Expect control to have values for selected time filter
        const menu = await comboBox.getOptionsList('listControlSelect0');
        expect(menu.trim().split('\n').join()).to.equal('osx,win 7,win 8,win xp');
      });
    });

    after(async () => {
      await common.unsetTime();
    });
  });
}
