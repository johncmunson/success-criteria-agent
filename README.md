- BUSINESS MODEL
  - Users have the choice between...
    - Bring your own API key
    - Purchase credits and use the Iterative Canvas API key
  - Users may pay a monthly subscription for access to pro-level features

- Register as a Delaware LLC using Firstbase or Doola
  - Will also have to notify Missouri, but that's okay
- Use a merchant of record (e.g. Paddle, LemonSqueezy, Polar) instead of Stripe
  - Far less legal and accounting burden, complexity, and risk that way

- Adapter pattern for models and model providers
  - Text
  - Image
  - File / File Search / Retrieval API
  - Reasoning Effort
  - Code Interpreter
  - Web Search
  - Structured Outputs
  - Predicted Outputs
  - Prompt Caching
  - MCP??? Custom Tools???
  - DO NOT ALLOW "FILE INPUTS"
    - i.e. PDFs that are treat as images rather than documents
    - https://platform.openai.com/docs/guides/pdf-files?api-mode=responses

- If files are small/medium, consider providing the entire file contents to the model rather than using RAG techniques or the file_search tool.
  - Will reduce friction when things change or need updated. Won't need to run migrations. Could simply update the lookup table using an admin panel.
- Background mode for reasoning models??
  - https://platform.openai.com/docs/guides/background
- warn the user when deleting a folder that all canvases within will be deleted if they don't manually transfer them
- Expose an Iterative Canvas API!!! And possibly leverage the OpenAI batch API for this.
- "Cancel Request" feature
- Auto-Refine Mode - A toggle to let the model iterate on its own until a passing grade is achieved, within user-defined limits (e.g., max 3 iterations)
- Canvas Marketplace - Users can publish their canvases to a marketplace. Other users can clone them to their account.
- Persona-based prompting - Allow users to swap out the requirements module with a set of personas ("Socratic teacher", "Startup CTO", "Technical copywriter") that critique the response
- Requirement Voting - If, for example, votes = 3, then when a requirement is run it will be evaluated three times and the average score will be used. Or a different strategy could be configured where the lowest score is used.
- Interactive Guided Tour - Plays the first time the user opens a canvas
- Merge together the Generate button and the Refine Response button

////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
//////////////////////// POLAR ///////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////// USER SETTINGS //////////////////////////////
////////////////////////////////////////////////////////////////////////
//////////////// EMAILS //////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

## MVP

- Users, Signup, Login
- Polar
- BYO API Key + Usage-Based
- Basic Features
  - Folders and Canvases
  - Canvas Versions
  - Prompt + Requirements + Response + Refine Response
  - All OpenAI Models
  - Copy Prompt, Copy Response, Copy Requirements, Copy All
  - Show Version Diff
  - Markdown View
  - Search
- Pro Features
  - Code Interpreter
  - Web Search
  - Files
  - Images
  - Predicted Outputs
  - Templated Requirements {{}}
  - Requirement Templates

## Security Considerations and Features

- MFA
- On successful password change via reset, invalidate all user sessions and refresh tokens.
- Always return a generic response like “If an account exists…” to avoid user enumeration.
- Use a cron to periodically delete expired rows from the verifications table
- Consider tracking ip_address and user_agent in the verifications table
- Rate limiting for all endpoints. Can rate limit by email/user or by ip_address/user_agent, or both, depending on the endpoint.
- Rotate API keys periodically (especially if using your own OpenAI keys) and encourage users to do the same
- Sanitize File Names and MIME Types Before Storing or Serving
  - For file names, strip dangerous characters (/, \, .., <, >, etc.)
  - For MIME types, use a backend library like file-type (Node.js) to detect real MIME types from binary content
- Never Serve Uploaded Files from the Same Domain Without Validation
  - There steps you can take to do this safely, but...
  - It's much better to just take advantage of Vercel Blob Storage and the built-in blob CDN.
  - It's automatically secure by isolation and it requires almost no setup.
- Add HMAC or bearer token verification with timestamp checks to all incoming webhooks to prevent spoofed or replayed requests, which could otherwise trigger unauthorized actions or financial/logical abuse.
- Use zod to validate all incoming payloads, data, request bodies, headers, query params, etc.
- Enable Dependabot/GitHub security alerts.
- Consider logging certain user actions, perhaps with Vercel Logging, so that there's an audit trail for certain things
- Use RBAC properly by implementing guards

## Drizzle Improvements

- indexes
  - https://orm.drizzle.team/docs/indexes-constraints#indexes
- "check" constraints?
- varchar limits
