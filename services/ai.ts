

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../constants";
import { generateObject } from "ai";
import { z } from "zod";
import { issueType, ReviewComment } from "../types";

// Zod schema for files, matching the one in your router
const fileSchema = z.object({
  filename: z.string(),
  diff: z.string(),
  newFile: z.boolean(),
  renamedFile: z.boolean(),
  deletedFile: z.boolean(),
  fileContent: z.string(),
});

// Zod schema for a single review comment, aligned with the extension's needs
export const reviewCommentSchema = z.object({
  filename: z.string().describe("The name of the file being reviewed."),
  startLine: z
    .number()
    .describe("The starting line number of the code being commented on."),
  endLine: z
    .number()
    .describe("The ending line number of the code being commented on."),
  comment: z.string().describe("The review comment in Markdown format."),
  type: z
    .enum([
      issueType.POTENTIAL_ISSUE,
      issueType.REFACTOR_SUGGESTION,
      issueType.NITPICK,
      issueType.VERIFICATION,
      issueType.OTHER,
    ])
    .describe("The category of the review comment."),
  suggestions: z
    .array(z.string())
    .optional()
    .describe(
      'An optional array containing a single string with the suggested code change. This should be the full, complete code block that replaces the original.',
    ),
  codegenInstructions: z
    .string()
    .optional()
    .describe(
      'For complex changes, provide a high-level instruction for an AI agent to perform the task (e.g., "Refactor this function to be asynchronous and handle errors gracefully.").',
    ),
});

type File = z.infer<typeof fileSchema>;



/**
 * Performs a code review using the Gemini AI model.
 * @param files - An array of files to be reviewed.
 * @returns A stream of text containing the code review feedback.
 */
// Zod schema for the review summary
export const reviewSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      'A comprehensive, high-level summary of the code review findings, formatted in Markdown.',
    ),
  shortSummary: z
    .string()
    .describe('A very brief, one-sentence summary of the review.'),
});

// Zod schema for the review title
// Zod schema for the PR Objective
export const prObjectiveSchema = z.object({
  objective: z.string().describe('A concise, one-sentence objective for the pull request.'),
});

// Zod schema for the Walkthrough
export const walkThroughSchema = z.object({
  walkThrough: z.string().describe('A high-level, step-by-step walkthrough of the code changes in Markdown format.'),
});

export const reviewTitleSchema = z.object({
  title: z.string().describe('A concise, descriptive title for the code changes, like a pull request title.'),
});

/**
 * Generates a title for the code review.
 * @param files - An array of files that were changed.
 * @returns The generated title as a string.
 */
export async function generateReviewTitle(files: File[]): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  const fileSummary = files.map(f => `File: ${f.filename}\nDiff: ${f.diff}`).join('\n\n');

  const prompt = `
    You are an expert software engineer. Based on the following file diffs, please generate a concise and descriptive title for the code changes, as if it were a pull request title.

    The output MUST be a single JSON object with one field: 'title' (string).

    Here are the file changes:
    ${fileSummary}
  `;

  console.log('🤖 Sending title prompt to AI:');
  console.log(prompt);

  const { object } = await generateObject({
    model: google(env.AI_MODEL),
    schema: reviewTitleSchema,
    prompt: prompt,
  });

  console.log('🤖 AI Title Response received:', JSON.stringify(object, null, 2));

  return object.title;
}

/**
 * Generates a summary of the code review comments.
 * @param comments - An array of review comments.
 * @returns An object containing a full summary and a short summary.
 */
export async function generateReviewSummary(comments: ReviewComment[]): Promise<{ summary: string, shortSummary: string }> {
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  if (comments.length === 0) {
    return {
      summary: '✅ Great work! No issues were found in the code.',
      shortSummary: 'No issues found.',
    };
  }

  const prompt = `
    You are an expert code reviewer. Based on the following list of review comments, please provide a high-level summary of the findings.

    The output MUST be a single JSON object with two fields: 'summary' (string) and 'shortSummary' (string).

    - 'summary': A comprehensive summary in Markdown format. Group the feedback by categories (e.g., Potential Issues, Refactor Suggestions, Nitpicks).
    - 'shortSummary': A very brief, one-sentence summary of the overall review.

    Here are the review comments:
    ${JSON.stringify(comments, null, 2)}
  `;

  console.log('🤖 Sending summary prompt to AI:');
  console.log('=== SUMMARY PROMPT START ===');
  console.log(prompt);
  console.log('=== SUMMARY PROMPT END ===');

  const { object } = await generateObject({
    model: google(env.AI_MODEL),
    schema: reviewSummarySchema,
    prompt: prompt,
  });

  console.log('🤖 AI Summary Response received:');
  console.log('=== AI SUMMARY RESPONSE START ===');
  console.log(JSON.stringify(object, null, 2));
  console.log('=== AI SUMMARY RESPONSE END ===');

  return object;
}

export async function generatePrObjective(files: File[]): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  const fileSummary = files.map(f => `File: ${f.filename}\nDiff: ${f.diff}`).join('\n\n');

  const prompt = `
    You are an expert software engineer. Based on the following file diffs, please generate a concise, one-sentence objective for the code changes.

    The output MUST be a single JSON object with one field: 'objective' (string).

    Here are the file changes:
    ${fileSummary}
  `;

  const { object } = await generateObject({
    model: google(env.AI_MODEL),
    schema: prObjectiveSchema,
    prompt: prompt,
  });

  return object.objective;
}

export async function generateWalkThrough(files: File[]): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  const fileSummary = files.map(f => `File: ${f.filename}\nDiff: ${f.diff}`).join('\n\n');

  const prompt = `
    You are an expert software engineer. Based on the following file diffs, please generate a high-level, step-by-step walkthrough of the code changes.
    This should be a narrative that explains the purpose and impact of the changes. Format it as a Markdown string.

    The output MUST be a single JSON object with one field: 'walkThrough' (string).

    Here are the file changes:
    ${fileSummary}
  `;

  const { object } = await generateObject({
    model: google(env.AI_MODEL),
    schema: walkThroughSchema,
    prompt: prompt,
  });

  return object.walkThrough;
}

export async function performCodeReview(files: File[]): Promise<ReviewComment[]> {
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  const prompt = `
    You are an expert code reviewer. Your task is to analyze code changes and provide feedback as a single JSON array.

    The output MUST be a single JSON array of review comment objects. Each object in the array must have the following fields: 'filename' (string), 'startLine' (number), 'endLine' (number), 'comment' (string), and 'type' (string).

    The 'type' field must be one of these values: 'potential_issue', 'refactor_suggestion', 'nitpick', 'verification', or 'other'.

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
      .map(
        (file) => {
          // Add line numbers to the file content for better AI reference
          const numberedContent = file.fileContent
            .split('\n')
            .map((line, index) => `${(index + 1).toString().padStart(3, ' ')}: ${line}`)
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
        }
      )
      .join("\n")}\n
  `;

  console.log("🤖 Sending prompt to AI:");
  console.log("=== PROMPT START ===");
  console.log(prompt);
  console.log("=== PROMPT END ===");

  const { object } = await generateObject({
    model: google(env.AI_MODEL),
    schema: z.array(reviewCommentSchema),
    prompt: prompt,
  });

  console.log("🤖 AI Response received:");
  console.log("=== AI RESPONSE START ===");
  console.log(JSON.stringify(object, null, 2));
  console.log("=== AI RESPONSE END ===");

  // Log each comment's suggestions specifically
  object.forEach((comment, index) => {
    console.log(`📝 Comment ${index + 1}:`);
    console.log(`  File: ${comment.filename}`);
    console.log(`  Lines: ${comment.startLine}-${comment.endLine}`);
    console.log(`  Type: ${comment.type}`);
    console.log(`  Has suggestions: ${comment.suggestions ? 'YES' : 'NO'}`);
    if (comment.suggestions && comment.suggestions.length > 0) {
      console.log(`  Suggestion content:`);
      console.log(`  "${comment.suggestions[0]}"`);
      console.log(`  Suggestion length: ${comment.suggestions[0].length} characters`);
    }
  });

  return object as ReviewComment[];
}
