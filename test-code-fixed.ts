// Fixed version of problematic code - demonstrates proper implementations
// This file shows the corrected versions of all issues found in test-code.ts

import * as fs from 'fs';
import { promisify } from 'util';
import axios from 'axios';

// Constants for discount calculations
const PREMIUM_DISCOUNT_RATE = 0.85;
const GOLD_DISCOUNT_RATE = 0.75;

// Proper interface definition instead of 'any'
interface UserData {
  id: string;
  name?: string;
  email?: string;
  profile?: {
    settings?: {
      notifications?: {
        email?: {
          marketing?: {
            enabled?: boolean;
          };
        };
      };
    };
  };
}

interface ProcessableData {
  [key: string]: unknown;
}

// Fixed: Proper typing instead of 'any'
function processData(data: ProcessableData): ProcessableData {
  return data;
}

// Fixed: Use environment variables for secrets
const API_KEY = process.env.API_KEY || '';
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || '';
const JWT_SECRET = process.env.JWT_SECRET || '';

// Fixed: Use parameterized queries (example with a hypothetical DB library)
function getUserById(id: string): string {
  // Example with parameterized query - actual implementation depends on your DB library
  const query = 'SELECT * FROM users WHERE id = ?';
  // Parameters would be passed separately: [id]
  return query;
}

// Fixed: Proper error handling
async function fetchUserData(userId: string): Promise<UserData> {
  try {
    const response = await axios.get(`https://api.example.com/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw new Error(`Unable to fetch user data for ID: ${userId}`);
  }
}

// Fixed: Proper event listener management
class EventManager {
  private listeners: Map<Function, EventListener> = new Map();
  
  addListener(callback: (event: Event) => void): void {
    const eventListener = callback as EventListener;
    this.listeners.set(callback, eventListener);
    document.addEventListener('click', eventListener);
  }
  
  removeListener(callback: (event: Event) => void): void {
    const eventListener = this.listeners.get(callback);
    if (eventListener) {
      document.removeEventListener('click', eventListener);
      this.listeners.delete(callback);
    }
  }
  
  removeAllListeners(): void {
    this.listeners.forEach((eventListener) => {
      document.removeEventListener('click', eventListener);
    });
    this.listeners.clear();
  }
}

// Fixed: Asynchronous file operations
async function readConfigFile(path: string): Promise<string> {
  try {
    return await fs.promises.readFile(path, 'utf8');
  } catch (error) {
    console.error('Failed to read config file:', error);
    throw new Error(`Unable to read config file: ${path}`);
  }
}

// Fixed: Proper loop increment
function processItems(items: ProcessableData[]): void {
  for (let i = 0; i < items.length; i++) {
    if (items[i].skip) {
      continue;
    }
    console.log(items[i]);
  }
}

// Fixed: Use atomic operations or proper locking for shared state
let counter = 0;
const counterLock = new Set<Promise<void>>();

async function incrementCounter(): Promise<void> {
  const operation = (async () => {
    counter += 1;
  })();
  
  counterLock.add(operation);
  await operation;
  counterLock.delete(operation);
}

// Fixed: Proper null/undefined checks and type safety
function processUser(user: UserData | null | undefined): string {
  if (!user) {
    throw new Error('User is required');
  }
  
  if (user.name && typeof user.name === 'string') {
    return user.name.toUpperCase();
  }
  
  if (user.email && typeof user.email === 'string') {
    return user.email.toLowerCase();
  }
  
  throw new Error('User must have either a valid name or email');
}

// Fixed: Use named constants for magic numbers
function calculateDiscount(price: number, userType: string): number {
  switch (userType) {
    case 'premium':
      return price * PREMIUM_DISCOUNT_RATE;
    case 'gold':
      return price * GOLD_DISCOUNT_RATE;
    default:
      return price;
  }
}

// Fixed: Simplified logic using optional chaining
function complexBusinessLogic(data: UserData | null | undefined): boolean {
  return data?.profile?.settings?.notifications?.email?.marketing?.enabled ?? false;
}

// Fixed: Consistent camelCase naming
function getUserData(userId: string): Promise<UserData> {
  return fetchUserData(userId);
}

// Fixed: Proper Promise handling
async function goodAsyncFunction(): Promise<string> {
  try {
    await fetchUserData("123");
    return "done";
  } catch (error) {
    console.error('Error in async function:', error);
    throw error;
  }
}

// Fixed: No mutation of input parameters
function sortUsers(users: UserData[]): UserData[] {
  return [...users].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
}

// Fixed: Use proper logging (example with a logger interface)
interface Logger {
  info(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

// Mock logger for demonstration - in real code, use winston, pino, etc.
const logger: Logger = {
  info: (message: string, data?: unknown) => {
    // In production, this would use a proper logging library
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, data);
    }
  },
  error: (message: string, data?: unknown) => {
    console.error(`[ERROR] ${message}`, data);
  }
};

function debugFunction(data: ProcessableData): ProcessableData {
  logger.info('Processing data', { dataKeys: Object.keys(data) });
  return data;
}

// Fixed: Strict equality comparison
function checkValue(value: unknown): boolean {
  return value !== null && value !== undefined;
}

// Fixed: Proper error handling in try-catch
async function safeOperation(): Promise<void> {
  try {
    await fetchUserData('invalid-id');
  } catch (error) {
    logger.error('Operation failed', error);
    // Re-throw if this error should propagate, or handle appropriately
    throw new Error('Safe operation failed');
  }
}

// Fixed: Proper resource management with async/await
async function processFile(filename: string): Promise<Buffer> {
  let fileHandle: fs.promises.FileHandle | null = null;
  
  try {
    fileHandle = await fs.promises.open(filename, 'r');
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
    return buffer.subarray(0, bytesRead);
  } catch (error) {
    logger.error('Failed to process file', { filename, error });
    throw new Error(`Unable to process file: ${filename}`);
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
}

// Alternative synchronous version with try-finally
function processFileSync(filename: string): Buffer {
  let fd: number | null = null;
  
  try {
    fd = fs.openSync(filename, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    return buffer.subarray(0, bytesRead);
  } catch (error) {
    logger.error('Failed to process file synchronously', { filename, error });
    throw new Error(`Unable to process file: ${filename}`);
  } finally {
    if (fd !== null) {
      fs.closeSync(fd);
    }
  }
}

export {
  processData,
  getUserById,
  fetchUserData,
  EventManager,
  readConfigFile,
  processItems,
  incrementCounter,
  processUser,
  calculateDiscount,
  complexBusinessLogic,
  getUserData,
  goodAsyncFunction,
  sortUsers,
  debugFunction,
  checkValue,
  safeOperation,
  processFile,
  processFileSync,
  PREMIUM_DISCOUNT_RATE,
  GOLD_DISCOUNT_RATE
};
