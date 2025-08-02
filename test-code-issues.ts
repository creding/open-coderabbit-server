// Three focused test issues to validate refined AI prompts
// Each issue should trigger a different type of AI comment

import * as fs from 'fs';

// TEST ISSUE 1: CRITICAL SECURITY VULNERABILITY (should trigger potential_issue)
// This should generate a high-priority security comment with actionable suggestions
function authenticateUser(username: string, password: string): boolean {
  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  // Direct SQL injection vulnerability - user input directly embedded in query
  const result = executeQuery(query);
  return result.length > 0;
}

// TEST ISSUE 2: PERFORMANCE PROBLEM (should trigger refactor_suggestion)
// This should generate a performance improvement suggestion with code examples
function findUsersByRole(users: User[], targetRoles: string[]): User[] {
  const matches: User[] = [];
  const targetRolesSet = new Set(targetRoles);

  for (const user of users) {
    if (targetRolesSet.has(user.role)) {
      matches.push(user);
    }
  }

  return matches;
}

// TEST ISSUE 3: GOOD CODE (should NOT generate any comments)
// This should test the AI's selectivity - no comments should be generated
function safeUserLookup(users: User[], targetRoles: Set<string>): User[] {
  return users.filter((user) => targetRoles.has(user.role));
}

async function robustApiCall<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
}

// Supporting types and mock functions
interface User {
  id: string;
  username: string;
  role: string;
}

function executeQuery(query: string): any[] {
  // Mock implementation
  return [];
}
