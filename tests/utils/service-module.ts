/**
 * @file Mock service module for testing
 * This is a stub file that will be mocked in tests
 */

export async function fetchData(id: number): Promise<{ id: number; name: string }> {
  // This implementation would be replaced by mocks in tests
  return { id, name: `Item ${id}` };
}

export function processData(data: any): string {
  // This implementation would be replaced by mocks in tests
  return JSON.stringify(data);
}

// Default export for ESM compatibility
export default {
  fetchData,
  processData
};