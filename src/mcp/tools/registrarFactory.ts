import type { RoleBasedToolsRegistrar } from './types';
import type { Logger } from '../../core/types/logger.types.js';
import type { PathDI } from '../../types/global.types';
import { registerRoleBasedTools } from './roleBasedTools';
import { McpServer } from '../mcpServer';

/**
 * Factory for creating RoleBasedToolsRegistrar implementations
 */
export const RoleBasedToolsRegistrarFactory = {
  /**
   * Creates a default implementation of RoleBasedToolsRegistrar
   */
  createDefault(): RoleBasedToolsRegistrar {
    return new DefaultRoleBasedToolsRegistrar();
  }
};

/**
 * Default implementation of RoleBasedToolsRegistrar
 */
class DefaultRoleBasedToolsRegistrar implements RoleBasedToolsRegistrar {
  register(server: McpServer, logger: Logger, provider: any, pathDI: PathDI): McpServer {
    return registerRoleBasedTools(server, logger, provider, pathDI);
  }
}
