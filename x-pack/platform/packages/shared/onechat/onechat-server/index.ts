/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  BuiltinToolDefinition,
  ToolHandlerFn,
  ToolHandlerReturn,
  ToolHandlerContext,
  ToolProvider,
  ToolProviderHasOptions,
  ToolProviderGetOptions,
  ToolProviderListOptions,
  ExecutableTool,
  ExecutableToolHandlerParams,
  ExecutableToolHandlerFn,
} from './src/tools';
export type { ModelProvider, ScopedModel } from './src/model_provider';
export type {
  ScopedRunner,
  ScopedRunToolFn,
  ScopedRunnerRunToolsParams,
  RunContext,
  RunContextStackEntry,
  RunToolParams,
  RunToolFn,
  Runner,
  RunToolReturn,
} from './src/runner';
export {
  type OnechatToolEvent,
  type ToolEventHandlerFn,
  type ToolEventEmitter,
  type ToolEventEmitterFn,
  type InternalToolEvent,
} from './src/events';
export type {
  AgentHandlerParams,
  AgentHandlerContext,
  AgentHandlerReturn,
  AgentHandlerFn,
  RunAgentFn,
  RunAgentParams,
  RunAgentReturn,
  ScopedRunAgentFn,
  ScopedRunnerRunAgentParams,
  AgentEventEmitter,
  RunAgentOnEventFn,
} from './agents';
