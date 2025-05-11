import 'reflect-metadata';
import { CommandRegistry, COMMAND_METADATA, CommandMetadata, CommandClass } from './registry';
import { debug } from '../utils/logger';

// Type-safe metadata helper functions
const defineMetadata = (metadataKey: string | symbol, metadataValue: any, target: any, propertyKey?: string | symbol): void => {
  if (propertyKey === undefined) {
    Reflect.defineMetadata(metadataKey, metadataValue, target);
    return;
  }
  Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey);
};

const getMetadata = <T>(metadataKey: string | symbol, target: any, propertyKey?: string | symbol): T | undefined => {
  if (propertyKey !== undefined) {
    return Reflect.getMetadata(metadataKey, target, propertyKey) as T | undefined;
  }
  return Reflect.getMetadata(metadataKey, target) as T | undefined;
};

/**
 * Decorator for agent commands.
 * Attaches metadata to the command class and registers it with the command registry.
 * 
 * @example
 * ```typescript
 * @AgentCommand({
 *   name: 'writer',
 *   description: 'Generate written content',
 *   aliases: ['write', 'w'],
 *   category: 'creation'
 * })
 * export class WriterCommand implements Command {
 *   // Implementation...
 * }
 * ```
 */
export function AgentCommand(metadata: CommandMetadata) {
  return function(target: CommandClass): void {
    // Attach metadata to the class using our helper
    defineMetadata(COMMAND_METADATA, metadata, target);
    
    // Auto-register with the command registry
    const registry = CommandRegistry.getInstance();
    registry.registerCommand(target);
    
    debug(`Decorated and registered command class: ${target.name} as '${metadata.name}'`);
  };
}

/**
 * Parameter decorator for injecting command parameters.
 * This can be extended to handle different types of parameter injection.
 */
export function CommandParam(paramName?: string) {
  return function(target: object, propertyKey: string | symbol, parameterIndex: number): void {
    // Store the parameter metadata on the method
    const params = getMetadata<Array<{ name: string }>>('command:params', target, propertyKey) || [];
    params[parameterIndex] = { name: paramName || `param${parameterIndex}` };
    
    defineMetadata('command:params', params, target, propertyKey);
    debug(`Registered command parameter for ${String(propertyKey)}: ${paramName}`);
  };
}

/**
 * Method decorator for command handlers.
 * This can be used to define sub-commands or specific command actions.
 */
export function CommandHandler(options: { name: string; description: string }) {
  return function(
    target: object, 
    propertyKey: string | symbol, 
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    // Store the handler metadata on the method
    defineMetadata('command:handler', options, target, propertyKey);
    
    debug(`Registered command handler: ${String(propertyKey)} as '${options.name}'`);
    return descriptor;
  };
}

/**
 * Class decorator for defining command options.
 * This is an alternative to passing all options in the AgentCommand decorator.
 */
export function CommandOptions(options: CommandMetadata['options']) {
  return function(target: CommandClass): void {
    // Get existing metadata
    const metadata = getMetadata<CommandMetadata>(COMMAND_METADATA, target) || {} as CommandMetadata;
    
    // Update options
    metadata.options = options;
    
    // Re-attach updated metadata
    defineMetadata(COMMAND_METADATA, metadata, target);
    debug(`Added command options to ${target.name}`);
  };
}

export default {
  AgentCommand,
  CommandParam,
  CommandHandler,
  CommandOptions
};
