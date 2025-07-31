import { env } from '../constants';
import { File } from '../types';

export class FileValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'FileValidationError';
  }
}

export interface ValidationConfig {
  maxFileSize: number;
  maxFiles: number;
  allowedExtensions: string[];
  maxTotalSize: number;
}

export class FileValidator {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      maxFileSize: parseInt(env.MAX_FILE_SIZE || '1048576', 10), // 1MB default
      maxFiles: parseInt(env.MAX_FILES_PER_REVIEW || '50', 10),
      maxTotalSize: parseInt(env.MAX_TOTAL_SIZE || '10485760', 10), // 10MB default
      allowedExtensions: [
        // Programming languages
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.py',
        '.java',
        '.go',
        '.rs',
        '.cpp',
        '.c',
        '.h',
        '.php',
        '.rb',
        '.swift',
        '.kt',
        '.cs',
        '.vb',
        // Web technologies
        '.html',
        '.css',
        '.scss',
        '.sass',
        '.less',
        // Data formats
        '.json',
        '.xml',
        '.yaml',
        '.yml',
        '.toml',
        // Documentation and text
        '.md',
        '.txt',
        '.rst',
        // Scripts
        '.sh',
        '.bat',
        '.ps1',
        // Database
        '.sql',
        '.graphql',
        '.proto',
        // Docker and containers
        '.dockerfile',
        'dockerfile',
        // Configuration files (special files)
        '.gitignore',
        '.env',
        '.env.local',
        '.env.development',
        '.env.production',
        '.env.example',
        '.eslintrc',
        '.prettierrc',
        '.babelrc',
        '.npmrc',
        '.nvmrc',
        '.editorconfig',
        '.dockerignore',
        '.htaccess',
      ],
      ...config,
    };
  }

  validateFiles(files: File[]): void {
    this.validateFileCount(files);
    this.validateTotalSize(files);

    for (const file of files) {
      this.validateSingleFile(file);
    }
  }

  private validateFileCount(files: File[]): void {
    if (files.length === 0) {
      throw new FileValidationError('No files provided for review', 'NO_FILES');
    }

    if (files.length > this.config.maxFiles) {
      throw new FileValidationError(
        `Too many files: ${files.length} exceeds limit of ${this.config.maxFiles}`,
        'TOO_MANY_FILES'
      );
    }
  }

  private validateTotalSize(files: File[]): void {
    const totalSize = files.reduce(
      (sum, file) => sum + file.fileContent.length,
      0
    );

    if (totalSize > this.config.maxTotalSize) {
      throw new FileValidationError(
        `Total file size ${this.formatBytes(
          totalSize
        )} exceeds limit of ${this.formatBytes(this.config.maxTotalSize)}`,
        'TOTAL_SIZE_EXCEEDED'
      );
    }
  }

  private validateSingleFile(file: File): void {
    // Validate file size
    if (file.fileContent.length > this.config.maxFileSize) {
      throw new FileValidationError(
        `File '${file.filename}' size ${this.formatBytes(
          file.fileContent.length
        )} exceeds limit of ${this.formatBytes(this.config.maxFileSize)}`,
        'FILE_TOO_LARGE'
      );
    }

    // Validate file extension
    const extension = this.getFileExtension(file.filename);
    if (!this.config.allowedExtensions.includes(extension)) {
      throw new FileValidationError(
        `File '${
          file.filename
        }' has unsupported extension '${extension}'. Allowed: ${this.config.allowedExtensions.join(
          ', '
        )}`,
        'UNSUPPORTED_EXTENSION'
      );
    }

    // Validate filename
    if (!this.isValidFilename(file.filename)) {
      throw new FileValidationError(
        `File '${file.filename}' has invalid filename`,
        'INVALID_FILENAME'
      );
    }

    // Basic content validation
    this.validateFileContent(file);
  }

  private validateFileContent(file: File): void {
    // Check for binary content (simple heuristic)
    const binaryPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
    if (binaryPattern.test(file.fileContent)) {
      throw new FileValidationError(
        `File '${file.filename}' appears to contain binary content`,
        'BINARY_CONTENT'
      );
    }

    // Check for extremely long lines (potential minified code)
    const lines = file.fileContent.split('\n');
    const maxLineLength = 10000;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLineLength) {
        throw new FileValidationError(
          `File '${file.filename}' line ${i + 1} is too long (${
            lines[i].length
          } chars). This might be minified code.`,
          'LINE_TOO_LONG'
        );
      }
    }
  }

  private getFileExtension(filename: string): string {
    // Handle special files that start with a dot (like .gitignore, .env, etc.)
    const specialFiles = [
      '.gitignore',
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.example',
      '.eslintrc',
      '.prettierrc',
      '.babelrc',
      '.npmrc',
      '.nvmrc',
      '.editorconfig',
      '.dockerignore',
      '.htaccess',
    ];

    const baseFilename = filename.split('/').pop() || filename;

    // Check if it's a special file
    if (
      specialFiles.includes(baseFilename) ||
      baseFilename.startsWith('.env.')
    ) {
      return baseFilename; // Return the whole filename as the "extension"
    }

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      return '';
    }
    return filename.substring(lastDotIndex).toLowerCase();
  }

  private isValidFilename(filename: string): boolean {
    // Basic filename validation
    if (!filename || filename.length === 0) return false;
    if (filename.length > 255) return false;

    // Check for invalid characters
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(filename)) return false;

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(filename)) return false;

    return true;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Default validator instance
export const defaultFileValidator = new FileValidator();
