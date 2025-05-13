// src/core/commands/decorators.ts

// Stub export to satisfy imports, actual decorator implementation is pending.
export const CommandHandler = (details: string | { name: string; description?: string }): MethodDecorator => {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => { /* no-op */ }; 
};

// Stub export
export const AgentCommand = (commandDetails: any): ClassDecorator => {
  return (target: Function) => { /* no-op */ };
};

// Stub export
export const CommandParam = (paramDetails: any): ParameterDecorator => {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => { /* no-op */ };
};
