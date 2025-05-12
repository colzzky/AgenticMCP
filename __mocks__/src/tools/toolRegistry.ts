// __mocks__/src/tools/toolRegistry.ts
export class ToolRegistry {
  getAllTools = jest.fn(() => []);
  registerTool = jest.fn();
}

export default ToolRegistry;
