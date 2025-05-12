// __mocks__/src/tools/toolRegistry.ts
async function getAllTools() {
  return [];
}

async function registerTool() {}

export class ToolRegistry {
  getAllTools = jest.fn(getAllTools);
  registerTool = jest.fn(registerTool);
}

export default ToolRegistry;
