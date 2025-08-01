import { File, ReviewComment } from '../../src/types';

export const createMockFile = (overrides: Partial<File> = {}): File => ({
  filename: 'test.ts',
  fileContent: 'const example = "test";',
  diff: '+const example = "test";',
  newFile: false,
  renamedFile: false,
  deletedFile: false,
  ...overrides,
});

export const createMockComment = (
  overrides: Partial<ReviewComment> = {}
): ReviewComment => ({
  filename: 'test.ts',
  startLine: 1,
  endLine: 1,
  comment: 'Test comment',
  type: 'potential_issue',
  ...overrides,
});

export const mockFiles = {
  typescript: createMockFile({
    filename: 'example.ts',
    fileContent: 'interface User { id: number; }',
  }),
  javascript: createMockFile({
    filename: 'example.js',
    fileContent: 'const user = { id: 1 };',
  }),
  markdown: createMockFile({
    filename: 'README.md',
    fileContent: '# Test Project',
  }),
};

export const mockComments = {
  suggestion: createMockComment({
    type: 'refactor_suggestion',
    comment: 'Consider using const instead of let',
  }),
  issue: createMockComment({
    type: 'potential_issue',
    comment: 'Potential null pointer exception',
  }),
  nitpick: createMockComment({
    type: 'nitpick',
    comment: 'Missing semicolon',
  }),
};

export const createMockFileArray = (...files: File[]): File[] => files;
export const testFileArray = [mockFiles.typescript, mockFiles.javascript];
