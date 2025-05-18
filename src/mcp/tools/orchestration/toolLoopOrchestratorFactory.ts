import { ToolLoopOrchestrator } from './toolLoopOrchestrator';
import { logger } from '@/core/utils';

/**
 * Creates a ToolLoopOrchestrator with dependencies from the DI container
 * @returns A new ToolLoopOrchestrator instance
 */
export function createToolLoopOrchestrator(): ToolLoopOrchestrator {
  // Create and return the orchestrator
  return new ToolLoopOrchestrator(logger);
}