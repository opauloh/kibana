/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { TestData, MetricFieldVisConfig } from './types';

const SHOW_FIELD_STATISTICS = 'discover:showFieldStatistics';
import {
  farequoteDataViewTestData,
  farequoteKQLSearchTestData,
  farequoteLuceneFiltersSearchTestData,
  farequoteKQLFiltersSearchTestData,
  farequoteLuceneSearchTestData,
  sampleLogTestData,
} from './index_test_data';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'discover', 'timePicker', 'settings']);
  const ml = getService('ml');
  const retry = getService('retry');
  const dataViews = getService('dataViews');

  const startTime = 'Jan 1, 2016 @ 00:00:00.000';
  const endTime = 'Nov 1, 2020 @ 00:00:00.000';

  function runTests(testData: TestData) {
    describe(`with ${testData.suiteTitle}`, function () {
      it(`displays the 'Field statistics' table content correctly`, async function () {
        await PageObjects.common.navigateToApp('discover');
        if (testData.isSavedSearch) {
          await retry.tryForTime(2 * 1000, async () => {
            await PageObjects.discover.loadSavedSearch(testData.sourceIndexOrSavedSearch);
          });
        } else {
          await dataViews.switchToAndValidate(testData.sourceIndexOrSavedSearch);
        }
        await PageObjects.timePicker.setAbsoluteRange(startTime, endTime);

        await PageObjects.discover.assertHitCount(testData.expected.totalDocCountFormatted);
        await PageObjects.discover.assertViewModeToggleExists();
        await PageObjects.discover.clickViewModeFieldStatsButton();
        await ml.testExecution.logTestStep(
          'displays details for metric fields and non-metric fields correctly'
        );
        for (const fieldRow of testData.expected.metricFields as Array<
          Required<MetricFieldVisConfig>
        >) {
          await ml.dataVisualizerTable.assertNumberFieldContents(
            fieldRow.fieldName,
            fieldRow.docCountFormatted,
            fieldRow.topValuesCount,
            fieldRow.viewableInLens
          );
        }

        for (const fieldRow of testData.expected.nonMetricFields!) {
          await ml.dataVisualizerTable.assertNonMetricFieldContents(
            fieldRow.type,
            fieldRow.fieldName!,
            fieldRow.docCountFormatted,
            fieldRow.exampleCount,
            fieldRow.viewableInLens,
            false,
            fieldRow.exampleContent
          );
        }
      });
    });
  }

  describe('field statistics in Discover', function () {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/ml/module_sample_logs'
      );
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createDataViewIfNeeded('ft_module_sample_logs', '@timestamp');
      await ml.testResources.createSavedSearchFarequoteKueryIfNeeded();
      await ml.testResources.createSavedSearchFarequoteLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndLuceneIfNeeded();
      await ml.testResources.createSavedSearchFarequoteFilterAndKueryIfNeeded();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async function () {
      await ml.testResources.clearAdvancedSettingProperty(SHOW_FIELD_STATISTICS);
      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
      await ml.testResources.deleteDataViewByTitle('ft_module_sample_logs');
    });

    describe('when enabled', function () {
      before(async function () {
        await ml.testResources.setAdvancedSettingProperty(SHOW_FIELD_STATISTICS, true);
      });

      after(async function () {
        await ml.testResources.clearAdvancedSettingProperty(SHOW_FIELD_STATISTICS);
      });

      runTests(farequoteDataViewTestData);
      runTests(farequoteKQLSearchTestData);
      runTests(farequoteLuceneSearchTestData);
      runTests(farequoteKQLFiltersSearchTestData);
      runTests(farequoteLuceneFiltersSearchTestData);
      runTests(sampleLogTestData);
    });
  });
}
