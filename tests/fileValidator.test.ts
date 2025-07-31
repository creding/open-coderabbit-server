import { describe, it, expect, beforeEach } from 'vitest';
import { FileValidator, FileValidationError } from '../src/utils/fileValidator';
import { File } from '../src/types';

describe('FileValidator', () => {
  let validator: FileValidator;

  beforeEach(() => {
    validator = new FileValidator({
      maxFileSize: 100,
      maxFiles: 3,
      maxTotalSize: 200,
      allowedExtensions: ['.ts', '.js'],
    });
  });

  it('should not throw an error for valid files', () => {
    const files: File[] = [
      {
        filename: 'file1.ts',
        fileContent: 'content',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
      {
        filename: 'file2.js',
        fileContent: 'content',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(() => validator.validateFiles(files)).not.toThrow();
  });

  it('should throw an error if no files are provided', () => {
    const files: File[] = [];
    expect(() => validator.validateFiles(files)).toThrow(FileValidationError);
  });

  it('should throw an error if too many files are provided', () => {
    const files: File[] = [
      {
        filename: 'file1.ts',
        fileContent: 'c',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
      {
        filename: 'file2.ts',
        fileContent: 'c',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
      {
        filename: 'file3.ts',
        fileContent: 'c',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
      {
        filename: 'file4.ts',
        fileContent: 'c',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(() => validator.validateFiles(files)).toThrow(FileValidationError);
  });

  it('should throw an error if the total file size is too large', () => {
    const files: File[] = [
      {
        filename: 'file1.ts',
        fileContent: 'c'.repeat(150),
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
      {
        filename: 'file2.ts',
        fileContent: 'c'.repeat(100),
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(() => validator.validateFiles(files)).toThrow(FileValidationError);
  });

  it('should throw an error if a file is too large', () => {
    const files: File[] = [
      {
        filename: 'file1.ts',
        fileContent: 'c'.repeat(150),
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(() => validator.validateFiles(files)).toThrow(FileValidationError);
  });

  it('should throw an error for an unsupported file extension', () => {
    const files: File[] = [
      {
        filename: 'file1.py',
        fileContent: 'c',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(() => validator.validateFiles(files)).toThrow(FileValidationError);
  });

  it('should throw an error for an invalid filename', () => {
    const files: File[] = [
      {
        filename: '<invalid>',
        fileContent: 'c',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(() => validator.validateFiles(files)).toThrow(FileValidationError);
  });

  it('should throw an error for binary content', () => {
    const files: File[] = [
      {
        filename: 'file1.ts',
        fileContent: '\x00',
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(() => validator.validateFiles(files)).toThrow(FileValidationError);
  });

  it('should throw an error for a line that is too long', () => {
    const files: File[] = [
      {
        filename: 'file1.ts',
        fileContent: 'c'.repeat(10001),
        diff: '',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(() => validator.validateFiles(files)).toThrow(FileValidationError);
  });
});
