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

- Background mode for reasoning models??
  - https://platform.openai.com/docs/guides/background
- cron job to delete expired rows from the sessions table
- cron job to delete orphan files from vercel blob storage, and then delete the orphan rows
- warn the user when deleting a folder that all canvases within will be deleted if they don't manually transfer them
- Expose an Iterative Canvas API!!! And possibly leverage the OpenAI batch API for this.
- "Cancel Request" feature
- Auto-Refine Mode - A toggle to let the model iterate on its own until a passing grade is achieved, within user-defined limits (e.g., max 3 iterations)
- Canvas Marketplace - Users can publish their canvases to a marketplace. Other users can clone them to their account.
- Persona-based prompting - Allow users to swap out the requirements module with a set of personas ("Socratic teacher", "Startup CTO", "Technical copywriter") that critique the response
- Requirement Voting - If, for example, votes = 3, then when a requirement is run it will be evaluated three times and the average score will be used. Or a different strategy could be configured where the lowest score is used.
- Interactive Guided Tour - Plays the first time the user opens a canvas

-- user_roles table
CREATE TABLE user_roles (
  user_id INT NOT NULL REFERENCES users(id),
  role_id INT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)                             <---- THIS IS MISSING IN SUPABASE, ADD IT! REMOVE `id serial PRIMARY KEY`
);

-- role_permissions table
CREATE TABLE role_permissions (
  role_id INT NOT NULL REFERENCES roles(id),
  permission_id INT NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)                       <---- THIS IS MISSING IN SUPABASE, ADD IT! REMOVE `id serial PRIMARY KEY`
);



////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////    POLAR           ///////////////////////////
////////////////////////////////////////////////////////////////////////
//////////////////      USER SETTINGS     //////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////         EMAILS               //////////////////////////
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
