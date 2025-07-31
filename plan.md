# Plan: From Mock to Real AI Code Review Server

### **1. Objective**

To transition the existing mock server into a fully functional, AI-powered code review server. This new server will receive code changes from the CoderRabbit extension, use an LLM via the Vercel AI SDK to generate intelligent reviews, and stream the structured feedback back to the extension in the required format.

### **2. Core Technologies**

*   **Node.js / tRPC:** The existing server foundation.
*   **Vercel AI SDK:** The primary tool for interfacing with the LLM. We will specifically use its `generateObject` feature to get structured, predictable JSON output.
*   **LLM Provider:** An underlying Large Language Model (e.g., OpenAI's GPT series, Anthropic's Claude, or Google's Gemini) to perform the code analysis.
*   **Zod:** To define the schema for the structured data we expect from the LLM.

---

### **3. High-Level Workflow**

The end-to-end process for a review will be as follows:

1.  **Request:** The VS Code extension sends a `requestFullReview` mutation containing the list of changed files, including their content and diffs.
2.  **Prompt Construction:** The server receives this data and constructs a detailed prompt for the LLM. This prompt will instruct the AI to act as a code reviewer and provide feedback in a specific JSON format.
3.  **AI Invocation:** The server uses the Vercel AI SDK's `generateObject` function to send the prompt to the configured LLM.
4.  **Structured Response:** The LLM returns a structured JSON object (conforming to our Zod schema) containing a list of review comments.
5.  **Response Transformation:** The server processes the LLM's JSON response, transforming each comment into the precise `review_comment` event format that the extension expects (including Markdown diffs, indicator types, etc.).
6.  **Event Streaming:** The server uses the existing `eventEmitter` to stream these formatted `review_comment` events back to the extension, which then renders them in the UI.

---

### **4. Detailed Implementation Plan**

#### **Phase 1: Setup and Integration**

1.  **Install Dependencies:**
    *   `npm install ai`: Install the core Vercel AI SDK.
    *   `npm install openai`: Or the client library for your chosen LLM provider (e.g., `@anthropic-ai/sdk`).
    *   `npm install zod`: If not already present.

2.  **Environment Configuration:**
    *   Update the `.env` file to include the API key for the chosen LLM provider (e.g., `OPENAI_API_KEY`).

3.  **Create AI Module:**
    *   Create a new file, `server/ai-reviewer.js`, to encapsulate all AI-related logic, keeping `router.js` clean.

#### **Phase 2: Prompt Engineering & Schema Definition**

1.  **Define the Output Schema (Zod):**
    *   In `ai-reviewer.js`, create a Zod schema that defines the structure of a single review comment from the LLM. This schema will be the "contract" for the AI.
    *   *Example Schema:*
        ```javascript
        const commentSchema = z.object({
          fileName: z.string(),
          startLine: z.number(),
          endLine: z.number(),
          indicatorType: z.enum(['refactor_suggestion', 'potential_issue', 'nitpick']),
          explanation: z.string().describe("A detailed but user-friendly explanation of the issue in Markdown."),
          suggestion: z.string().describe("The exact code to replace the original block. Should be a simple replacement.")
        });
        const reviewResponseSchema = z.object({
          comments: z.array(commentSchema)
        });
        ```

2.  **Develop the System Prompt:**
    *   Create a robust system prompt that sets the context for the LLM. It should define its role, the desired tone, and explicitly mention the JSON output format defined by the Zod schema.
    *   *Key Instructions:* "You are an expert code reviewer. Analyze the following code diffs and provide your feedback as a JSON object. Your response must conform to the provided schema. For each comment, provide an explanation and a direct code suggestion."

3.  **Construct the User Prompt:**
    *   In the `requestFullReview` handler (which will now call a function in `ai-reviewer.js`), iterate through the `files` array from the extension's payload.
    *   Format the file diffs into a clean, readable format to be included in the user prompt.

#### **Phase 3: AI Response Processing and Streaming**

1.  **Invoke `generateObject`:**
    *   Call the Vercel AI SDK's `generateObject` function, passing the LLM client, the system prompt, the user prompt, and the `reviewResponseSchema`.

2.  **Transform LLM Output to Extension Events:**
    *   Once the structured `reviewResponse` object is received, iterate through its `comments` array.
    *   For each comment from the LLM:
        a.  Read the original lines from the `fileContent` using the `startLine` and `endLine` from the LLM's response.
        b.  Construct the Markdown `diff` block using the original lines and the `suggestion` from the LLM's response.
        c.  Combine the LLM's `explanation` with the Markdown `diff` to create the final comment body.
        d.  Build the complete `review_comment` payload object, mapping the `indicatorType` and other fields to the format the extension expects.
        e.  Emit the event via the `eventEmitter`.

#### **Phase 4: Refinement and Error Handling**

1.  **Testing:** Thoroughly test the end-to-end flow with various types of code changes to see how the AI responds.
2.  **Prompt Tuning:** Refine the system and user prompts to improve the quality, accuracy, and relevance of the AI-generated reviews.
3.  **Error Handling:** Implement `try...catch` blocks around the AI call to handle potential API errors, timeouts, or cases where the LLM returns invalid data. If an error occurs, send a `review_failed` event to the extension.

### **5. Next Steps**

1.  Install the required NPM packages (`ai`, `openai`, etc.).
2.  Add the `OPENAI_API_KEY` (or equivalent) to the `.env` file.
3.  Begin implementing the `ai-reviewer.js` module, starting with the Zod schema definition.
