/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertRuleUpgradePreview } from '../../test_utils/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../test_utils/assert_rule_upgrade_after_review';
import { assertDiffAfterSavingUnchangedValue } from '../../test_utils/assert_diff_after_saving_unchanged_value';
import { assertFieldValidation } from '../../test_utils/assert_field_validation';

describe('Upgrade diffable rule "threat_index" (threat_match rule type) after preview in flyout', () => {
  const ruleType = 'threat_match';
  const fieldName = 'threat_index';
  const humanizedFieldName = 'Indicator index patterns';
  const initial = ['indexA'];
  const customized = ['indexB'];
  const upgrade = ['indexC'];
  const resolvedValue = ['resolved'];

  assertRuleUpgradePreview({
    ruleType,
    fieldName,
    humanizedFieldName,
    fieldVersions: {
      initial,
      customized,
      upgrade,
      resolvedValue,
    },
  });

  assertDiffAfterSavingUnchangedValue({
    ruleType,
    fieldName,
    fieldVersions: {
      initial,
      upgrade,
    },
  });

  assertFieldValidation({
    ruleType,
    fieldName,
    fieldVersions: {
      initial,
      upgrade,
      // empty threat index pattern is invalid
      invalidValue: [''],
    },
  });

  assertRuleUpgradeAfterReview({
    ruleType,
    fieldName,
    fieldVersions: {
      initial,
      customized,
      upgrade,
      resolvedValue,
    },
  });
});
