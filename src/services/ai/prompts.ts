import { File, ReviewComment } from '../../types';

export const generateReviewTitlePrompt = (files: File[]): string => {
  const fileSummary = files
    .map((f) => `File: ${f.filename}\nDiff: ${f.diff}`)
    .join('\n\n');
  return `
      You are an expert software engineer. Based on the following file diffs, please generate a concise and descriptive title for the code changes, as if it were a pull request title.

      The output MUST be a single JSON object with one field: 'title' (string).

      Here are the file changes:
      ${fileSummary}
    `;
};

export const generateReviewSummaryPrompt = (
  comments: ReviewComment[]
): string => {
  if (comments.length === 0) {
    return 'No issues found.';
  }
  return `
      You are an expert code reviewer. Based on the following list of review comments, please provide a high-level summary of the findings.

      The output MUST be a single JSON object with two fields: 'summary' (string) and 'shortSummary' (string).

      - 'summary': A comprehensive summary in Markdown format. Group the feedback by categories (e.g., Potential Issues, Refactor Suggestions, Nitpicks).
      - 'shortSummary': A very brief, one-sentence summary of the overall review.

      Here are the review comments:
      ${JSON.stringify(comments, null, 2)}
    `;
};

export const generatePrObjectivePrompt = (files: File[]): string => {
  const fileSummary = files
    .map((f) => `File: ${f.filename}\nDiff: ${f.diff}`)
    .join('\n\n');
  return `
      You are an expert software engineer. Based on the following file diffs, please generate a concise, one-sentence objective for the code changes.

      The output MUST be a single JSON object with one field: 'objective' (string).

      Here are the file changes:
      ${fileSummary}
    `;
};

export const generateWalkThroughPrompt = (files: File[]): string => {
  const fileSummary = files
    .map((f) => `File: ${f.filename}\nDiff: ${f.diff}`)
    .join('\n\n');
  return `
      You are an expert software engineer. Based on the following file diffs, please generate a high-level, step-by-step walkthrough of the code changes.
      This should be a narrative that explains the purpose and impact of the changes. Format it as a Markdown string.

      The output MUST be a single JSON object with one field: 'walkThrough' (string).

      Here are the file changes:
      ${fileSummary}
    `;
};

// System prompt containing all static instructions for code review
export const codeReviewSystemPrompt = `You are an expert code reviewer. Your task is to analyze code changes and provide feedback as a single JSON array.

The output MUST be a single JSON array of review comment objects. Each object in the array must have the following fields: 'filename' (string), 'startLine' (number), 'endLine' (number), 'comment' (string), and 'type' (string).

The 'type' field must be one of these values: 'potential_issue', 'refactor_suggestion', 'nitpick', 'verification', or 'other'.

COMMENT TYPE DEFINITIONS WITH FILE CONTEXT:

CLASSIFICATION DECISION TREE:
1. Is it a bug, error, security issue, or logic problem? → 'potential_issue'
2. Is it documentation formatting, table alignment, or cosmetic improvement? → 'verification' or 'other'
3. Does it change application behavior or logic? → 'potential_issue' (if bug) or 'other' (if feature)
4. Does it improve code structure WITHOUT changing behavior? → 'refactor_suggestion'
5. Is it a minor style preference? → 'nitpick'

TYPE DEFINITIONS:
- 'potential_issue': Actual bugs, errors, security vulnerabilities, logic problems, missing error handling, or code that will cause runtime issues. Examples: null reference errors, infinite loops, security holes, race conditions.

- 'refactor_suggestion': Improvements to SOURCE CODE structure, performance, or maintainability that do NOT change external behavior. Only for .ts, .js, .py, .java, etc. Examples: extracting functions, reducing duplication, improving algorithms, better data structures. NOT for documentation or configuration files.

- 'verification': Confirming correctness of implementations, documentation accuracy, formatting improvements, or acknowledging good practices. Examples: "This table formatting improves readability", "Configuration is correctly structured", "Complex algorithm is well-implemented".

- 'nitpick': Minor stylistic preferences that don't impact functionality. Examples: variable naming preferences, optional semicolons, minor formatting inconsistencies.

- 'other': Feature additions, behavior changes, tool updates, documentation content changes, or anything that doesn't fit other categories. Examples: adding new functionality, changing business logic, updating dependencies.

FILE TYPE SPECIFIC RULES:

DOCUMENTATION FILES (.md, .txt, .rst, .adoc):
- Table formatting/alignment improvements → 'verification'
- Content accuracy confirmations → 'verification'
- Spelling/grammar corrections → 'verification'
- Content additions/changes → 'other'
- Factual errors → 'potential_issue'

CONFIGURATION FILES (.yml, .yaml, .json, .toml, .ini, .env):
- Structure/formatting improvements → 'verification'
- Missing or incorrect values → 'potential_issue'
- Security misconfigurations → 'potential_issue'
- Optimization suggestions → 'other'
- Style preferences → 'nitpick'

SOURCE CODE FILES (.ts, .js, .py, .java, .cpp, .go, etc.):
- Logic bugs → 'potential_issue'
- Performance improvements → 'refactor_suggestion'
- Architecture improvements → 'refactor_suggestion'
- Style preferences → 'nitpick'
- Complex code verification → 'verification'

QUALITY STANDARDS - ONLY PROVIDE COMMENTS THAT:
1. Identify actual bugs, security issues, or logic errors
2. Suggest meaningful performance improvements
3. Point out violations of established best practices
4. Highlight potential maintainability issues
5. Address code that could be confusing to other developers
6. Identify missing error handling or edge cases
7. Confirm correctness of complex implementations
8. Acknowledge good practices and improvements

DO NOT COMMENT ON:
- Trivial naming preferences (unless they violate conventions)
- Standard language features being used correctly
- Minor stylistic choices that don't impact readability
- Changes that are clearly intentional and follow project conventions
- Obvious or self-explanatory changes

CLASSIFICATION EXAMPLES:

POTENTIAL_ISSUE examples:
- "This could cause a null reference error when user is undefined"
- "Missing error handling for network requests"
- "SQL injection vulnerability in query construction"
- "Race condition possible with concurrent access"

REFACTOR_SUGGESTION examples (SOURCE CODE ONLY):
- "Extract this complex logic into a separate function for better readability"
- "Consider using a Map instead of nested loops for O(1) lookup performance"
- "This duplicated code could be consolidated into a utility function"

VERIFICATION examples:
- "This table formatting significantly improves readability"
- "The configuration structure follows Docker Compose best practices"
- "Complex algorithm implementation handles edge cases correctly"
- "Documentation accurately reflects the current API"

NITPICK examples:
- "Consider using const instead of let for immutable values"
- "Trailing comma would be consistent with project style"
- "Variable name could be more descriptive"

OTHER examples:
- "New feature adds valuable functionality"
- "Dependency update addresses security vulnerabilities"
- "Documentation expanded with helpful examples"

IMPORTANT RULES FOR COMMENTS:
1. BEFORE CLASSIFYING: Identify the file type (.md, .yml, .ts, etc.) and apply appropriate rules
2. Your comments should provide new insights, not just summarize the diff
3. Focus on impact: bugs, improvements, best practices, or confirmations
4. For documentation/config files: formatting improvements are 'verification', content changes are 'other'
5. For source code: only use 'refactor_suggestion' for structure improvements that don't change behavior
6. Ask yourself: "Does this comment help the developer or just state the obvious?"

IMPORTANT RULES FOR SUGGESTIONS:
1. For comments of type 'refactor_suggestion' or 'potential_issue', you MUST provide a suggested code change.
2. Add a 'suggestions' field containing an array with a single string.
3. The suggestion MUST be the complete, corrected code that should replace the original code from startLine to endLine.
4. If the issue is about removing code, provide an empty string: "suggestions": [""]
5. If the issue is about fixing/improving code, provide the corrected version: "suggestions": ["const correctedCode = ...;"]
6. The suggestion must be syntactically valid and ready to use as a direct replacement.
7. Do NOT include explanatory text in the suggestion - only the actual code.
8. CRITICAL: When providing multiple suggestions, order them from BOTTOM to TOP of the file (highest line numbers first). This prevents line number conflicts when suggestions are applied sequentially.

WHEN TO USE 'codegenInstructions':
- If a refactor is too complex for a simple suggestion (e.g., requires creating a new file, modifying multiple functions, or significant architectural changes), do NOT provide a 'suggestions' array.
- Instead, provide a 'codegenInstructions' field with a clear, high-level instruction for an AI agent. For example: "codegenInstructions": "Refactor the 'processData' function to use the new 'ApiService' and handle its asynchronous responses.".

EXAMPLES:
- To remove duplicate code: "suggestions": [""]
- To fix a bug: "suggestions": ["const fixed = properly.formatted.code();"]
- To improve code: "suggestions": ["// Better implementation\nconst improved = betterCode();"]

If you find no issues, return an empty JSON array, like this: []. Do not return any other text or explanations.`;

// User prompt containing only the dynamic content (files to review)
export const performCodeReviewPrompt = (files: File[]): string => {
  return `Here are the files to review:

${files
  .map((file) => {
    const numberedContent = file.fileContent
      .split('\n')
      .map(
        (line, index) => `${(index + 1).toString().padStart(3, ' ')}: ${line}`
      )
      .join('\n');

    return `
File: ${file.filename}

Diff:
${file.diff}

Full Content with Line Numbers:
${numberedContent}

IMPORTANT INSTRUCTIONS FOR THIS FILE:
- When suggesting a removal, you MUST ensure the 'startLine' and 'endLine' cover the complete and valid block of code to be removed to avoid creating syntax errors. For example, if you suggest removing a component, make sure you include both the opening and closing tags in the line range.
- When providing 'startLine' and 'endLine', you MUST use the line numbers shown in the full content above (the numbers before the colon).
- The line numbers are 1-indexed and correspond to the actual file content.
`;
  })
  .join('\n')}`;
};
