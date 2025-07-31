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

export const performCodeReviewPrompt = (files: File[]): string => {
  return `
    You are an expert code reviewer. Your task is to analyze code changes and provide feedback as a single JSON array.

    The output MUST be a single JSON array of review comment objects. Each object in the array must have the following fields: 'filename' (string), 'startLine' (number), 'endLine' (number), 'comment' (string), and 'type' (string).

    The 'type' field must be one of these values: 'potential_issue', 'refactor_suggestion', 'nitpick', 'verification', or 'other'.

    COMMENT TYPE DEFINITIONS:
    - 'potential_issue': A bug or an error that could cause problems.
    - 'refactor_suggestion': A suggestion to improve the code's structure, readability, or performance without changing its external behavior. This is for making good code better. DO NOT just describe the change that was made. The comment should explain WHY the refactor is an improvement.
    - 'nitpick': A minor stylistic preference or a trivial issue.
    - 'verification': A comment to confirm that a piece of code is correct and well-implemented, especially if it's complex.
    - 'other': Any other type of comment.

    IMPORTANT RULES FOR COMMENTS:
    1. Your comments should provide new insights, not just summarize the diff. The user already knows what they changed.
    2. Focus on improvements, potential bugs, and best practices.
    3. A 'refactor_suggestion' should NOT change the application's logic or behavior. If a change alters functionality, it is not a refactor. Classify it as 'potential_issue' if it's a bug, or 'other' if it's a functional change.

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

    If you find no issues, return an empty JSON array, like this: []. Do not return any other text or explanations.

    Here are the files to review:
    ${files
      .map((file) => {
        const numberedContent = file.fileContent
          .split('\n')
          .map(
            (line, index) =>
              `${(index + 1).toString().padStart(3, ' ')}: ${line}`
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
      .join('\n')}\n
    `;
};
