/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const SupportedEntityTypesRT = rt.keyof({
  host: null,
});

export const EntityTypeRT = rt.type({
  entityType: SupportedEntityTypesRT,
});

export type EntityTypes = rt.TypeOf<typeof SupportedEntityTypesRT>;
