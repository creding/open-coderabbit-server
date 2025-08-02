// Problematic code for testing code review server
// This file contains intentional issues that should be caught by code review

import * as fs from 'fs';
import { promisify } from 'util';

// Issue 1: Unused import
import { Buffer } from 'buffer';
import axios from 'axios';

// Issue 2: Any type usage
function processData(data: any): any {
  return data;
}

// Issue 3: Hardcoded credentials and secrets
const API_KEY = 'sk-1234567890abcdef';
const DATABASE_PASSWORD = 'admin123';
const JWT_SECRET = 'my-super-secret-key';

// Issue 4: SQL Injection vulnerability
function getUserById(id: string) {
  const query = `SELECT * FROM users WHERE id = '${id}'`;
  // This is vulnerable to SQL injection
  return query;
}

// Issue 5: No error handling
async function fetchUserData(userId: string) {
  const response = await axios.get(`https://api.example.com/users/${userId}`);
  return response.data;
}

// Issue 6: Memory leak potential - event listener not removed
class EventManager {
  private listeners: Function[] = [];

  addListener(callback: Function) {
    this.listeners.push(callback);
    document.addEventListener('click', callback as EventListener);
  }

  // Missing removeListener method
}

// Issue 7: Synchronous file operations
function readConfigFile(path: string) {
  return fs.readFileSync(path, 'utf8');
}

// Issue 8: Infinite loop potential
function processItems(items: any[]) {
  let i = 0;
  while (i < items.length) {
    if (items[i].skip) {
      continue; // i is never incremented, potential infinite loop
    }
    console.log(items[i]);
    i++;
  }
}

// Issue 9: Race condition
let counter = 0;
async function incrementCounter() {
  const current = counter;
  await new Promise((resolve) => setTimeout(resolve, 10));
  counter = current + 1;
}

// Issue 10: Improper null/undefined checks
function processUser(user: any) {
  if (user.name) {
    return user.name.toUpperCase(); // Could throw if name is not a string
  }
  return user.email.toLowerCase(); // Could throw if user is null/undefined
}

// Issue 11: Magic numbers and strings
function calculateDiscount(price: number, userType: string) {
  if (userType === 'premium') {
    return price * 0.85; // Magic number
  } else if (userType === 'gold') {
    return price * 0.75; // Magic number
  }
  return price;
}

// Issue 12: Overly complex function
function complexBusinessLogic(data: any) {
  if (data && data.user && data.user.profile && data.user.profile.settings) {
    if (data.user.profile.settings.notifications) {
      if (data.user.profile.settings.notifications.email) {
        if (data.user.profile.settings.notifications.email.marketing) {
          if (
            data.user.profile.settings.notifications.email.marketing.enabled
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// Issue 13: Inconsistent naming
function get_user_data(userId: string) {
  // snake_case in TypeScript
  return fetchUserData(userId);
}

// Issue 14: Dead code
function oldFunction() {
  console.log('This function is never called');
}

// Issue 15: Improper Promise handling
function badAsyncFunction() {
  fetchUserData('123'); // Promise not awaited or handled
  return 'done';
}

// Issue 16: Mutation of input parameters
function sortUsers(users: any[]) {
  return users.sort((a, b) => a.name.localeCompare(b.name)); // Mutates original array
}

// Issue 17: Console.log in production code
function debugFunction(data: any) {
  console.log('Debug data:', data); // Should use proper logging
  console.error('This will show in production');
  return data;
}

// Issue 18: Weak comparison
function checkValue(value: any) {
  if (value == null) {
    // Should use === for strict comparison
    return false;
  }
  return true;
}

// Issue 19: Try-catch without proper error handling
async function riskyOperation() {
  try {
    await fetchUserData('invalid-id');
  } catch (error) {
    // Empty catch block - error is swallowed
  }
}

// Issue 20: Resource not properly closed
function processFile(filename: string) {
  const fd = fs.openSync(filename, 'r');
  const data = fs.readSync(fd, Buffer.alloc(1024), 0, 1024, 0);
  // File descriptor not closed - resource leak
  return data;
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
};
