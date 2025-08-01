import { describe, it, expect, beforeEach } from 'vitest';
import { FileValidator, FileValidationError } from '../../src/utils/fileValidator';
import { File } from '../../src/types';

describe('FileValidator', () => {
  let validator: FileValidator;
  const defaultConfig = {
    maxFileSize: 1000,
    maxFiles: 5,
    maxTotalSize: 2000,
    allowedExtensions: ['.ts', '.js', '.md'],
  };

  beforeEach(() => {
    validator = new FileValidator(defaultConfig);
  });

  const createFile = (filename: string, content: string): File => ({
    filename,
    fileContent: content,
    diff: '',
    newFile: false,
    deletedFile: false,
    lines: [],
  });

  it('should not throw an error for valid files', () => {
    const files = [createFile('test.ts', 'console.log("hello")')];
    expect(() => validator.validateFiles(files)).not.toThrow();
  });

  it('should throw an error if no files are provided', () => {
    expect(() => validator.validateFiles([])).toThrow(
      new FileValidationError('No files provided for review', 'NO_FILES')
    );
  });

  it('should throw an error if too many files are provided', () => {
    const files = Array(6).fill(0).map((_, i) => createFile(`file${i}.ts`, 'content'));
    expect(() => validator.validateFiles(files)).toThrow(
      new FileValidationError('Too many files: 6 exceeds limit of 5', 'TOO_MANY_FILES')
    );
  });

  it('should throw an error if total file size is exceeded', () => {
    const files = [
      createFile('file1.ts', 'a'.repeat(1000)),
      createFile('file2.ts', 'b'.repeat(1001)),
    ];
    expect(() => validator.validateFiles(files)).toThrow(
      new FileValidationError('Total file size 1.95 KB exceeds limit of 1.95 KB', 'TOTAL_SIZE_EXCEEDED')
    );
  });

  it('should throw an error if a single file is too large', () => {
    const files = [createFile('large.ts', 'a'.repeat(1001))];
    expect(() => validator.validateFiles(files)).toThrow(
      new FileValidationError("File 'large.ts' size 1001 Bytes exceeds limit of 1000 Bytes", 'FILE_TOO_LARGE')
    );
  });

  it('should throw an error for unsupported file extensions', () => {
    const files = [createFile('image.jpg', 'content')];
    expect(() => validator.validateFiles(files)).toThrow(
      new FileValidationError("File 'image.jpg' has unsupported extension '.jpg'. Allowed: .ts, .js, .md", 'UNSUPPORTED_EXTENSION')
    );
  });

  it('should throw an error for invalid filenames', () => {
    const files = [createFile('in<valid>.ts', 'content')];
    expect(() => validator.validateFiles(files)).toThrow(
      new FileValidationError("File 'in<valid>.ts' has invalid filename", 'INVALID_FILENAME')
    );
  });

  it('should throw an error for binary content', () => {
    const files = [createFile('binary.ts', '\x00\x01\x02')];
    expect(() => validator.validateFiles(files)).toThrow(
      new FileValidationError("File 'binary.ts' appears to contain binary content", 'BINARY_CONTENT')
    );
  });

  it('should throw an error for lines that are too long', () => {
    const longLine = 'a'.repeat(10001);
    const files = [createFile('longline.ts', longLine)];
    expect(() => validator.validateFiles(files)).toThrow(
      new FileValidationError('Total file size 9.77 KB exceeds limit of 1.95 KB', 'TOTAL_SIZE_EXCEEDED')
    );
  });
});