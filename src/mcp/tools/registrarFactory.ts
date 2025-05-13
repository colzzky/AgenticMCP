import type { RoleBasedToolsRegistrar } from './types';
import type { Logger } from '../../core/types/logger.types.js';
import type { PathDI } from '../../global.types';
import { registerRoleBasedTools } from './roleBasedTools';

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
  register(server: any, logger: Logger, provider: any, pathDI: PathDI): void {
    registerRoleBasedTools(server, logger, provider, pathDI);
  }
}
