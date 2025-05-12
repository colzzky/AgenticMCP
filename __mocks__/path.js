// __mocks__/path.js
const path = jest.createMockFromModule('path');
path.isAbsolute = jest.fn((p) => p.startsWith('/'));
path.resolve = jest.fn((...parts) => parts.join('/'));
export * from 'path';
