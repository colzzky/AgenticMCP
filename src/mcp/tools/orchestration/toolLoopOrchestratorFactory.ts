import { DIContainer } from '../../../core/di/container';
import { DI_TOKENS } from '../../../core/di/tokens';
import { ToolLoopOrchestrator } from './toolLoopOrchestrator';
import { Logger } from '../../../core/types/logger.types';
import { ToolExecutor } from '../../../tools/toolExecutor';

/**
 * Creates a ToolLoopOrchestrator with dependencies from the DI container
 * @param container DI container to resolve dependencies from
 * @returns A new ToolLoopOrchestrator instance
 */
export function createToolLoopOrchestrator(
  container: DIContainer = DIContainer.getInstance()
): ToolLoopOrchestrator {
  // Resolve dependencies from the container
  const logger = container.get<Logger>(DI_TOKENS.LOGGER);
  const toolExecutor = container.get<ToolExecutor>(DI_TOKENS.TOOL_EXECUTOR);
  
  // Create and return the orchestrator
  return new ToolLoopOrchestrator(logger, toolExecutor);
}

/**
 * Gets the default ToolLoopOrchestrator instance
 * @param container DI container to resolve dependencies from
 * @returns A ToolLoopOrchestrator instance
 */
export function getDefaultToolLoopOrchestrator(
  container: DIContainer = DIContainer.getInstance()
): ToolLoopOrchestrator {
  return createToolLoopOrchestrator(container);
}