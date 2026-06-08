# AI SOP Builder Agent Workspace UX Specification

Feature: AI SOP Builder  
Focus: Premium agentic drafting interface before tenancy/package billing  
Date: June 2026

## 1. Product Direction

The current AI SOP Builder interface should be expanded into a cleaner, more familiar agent workspace.

The user experience should feel close to modern AI workspaces such as Claude Web and ChatGPT:

- Calm, spacious interface
- Large central conversation/work area
- Clear message flow between user and agent
- Document preview shown as a secondary working view that can be toggled to show and go off
- Minimal clutter
- Strong focus on the current task
- Smooth transitions between thinking, drafting, revising, and final output

The builder should not feel like a compact admin form. It should feel like a professional document-generation assistant.

## 2. Core UX Principle

The AI SOP Builder should behave like an agent working with the user on a document.

The user should feel that they are:

1. Briefing the agent.
2. Reviewing what the agent produced.
3. Highlighting parts of the draft that need changes.
4. Giving revision instructions naturally.
5. Asking the agent to revise.
6. Generating the final Word file only when satisfied.

The interface should support this workflow directly.

## 3. Main Layout

Use a two-view agent workspace.

### Main view: Agent Chat

The main view is the main conversation area.

It should contain:

- Agent messages
- User messages
- Clarification questions
- Agent status updates
- Revision summaries
- Action cards when the agent has produced something

This should feel similar to Claude/ChatGPT conversation flow.

Recommended behavior:

- Messages are vertically stacked.
- User messages align visually distinct from agent messages.
- Agent messages are readable and spacious.
- Long messages should not feel cramped.
- The latest message should remain easy to find.
- The input composer should stay at the bottom.

### Second View: Document Workspace

The Second view is the secondary view.

It should show either:

- Markdown Draft View
- Word Preview View

The user should be able to toggle between the two views 

This is similar to how Claude can show generated artifacts beside the chat, or how ChatGPT can show a working document/code canvas.

## 4. View Modes

The document workspace should support two primary modes.

### 4.1 Markdown Draft View

This is the main working view.

The AI generates the SOP into Markdown first. This view is used while the document is still being drafted and revised.

The Markdown view should support:

- SOP title
- Section headings
- Tables
- Numbered procedure steps
- Draft warning banner
- Confirmation flags
- Revision summary
- Highlight-to-comment interaction

This view should be clean and document-like, not a textarea.

The user should be able to:

- Read the SOP quickly.
- Select/highlight text.
- Add a comment or revision instruction to the selected text.
- See comments anchored to the selected section or text.
- Ask the agent to revise using those comments.

### 4.2 Word Preview View

This view is used after the user clicks **Generate Word File**.

The Word view is not the main editing surface. It is the final document preview.

The Word preview should:

- Use the existing SOP read-view pattern.
- Show the generated `.docx`.
- Keep the draft warning visible in the app.
- Provide download action.
- Confirm that the Word file is ready.

The Word view should not replace the Markdown draft workflow. It is the final output review.

## 5. Recommended Screen Structure

### Top Bar

The top bar should be simple and informative.

It should show:

- SOP title
- Draft status
- Current version
- Department
- View switcher: Markdown / Word
- Primary action button

Primary action changes based on state:

- Generate Outline
- Generate Draft
- Revise Draft
- Generate Word File
- Download Word File

Avoid filling the top bar with too many buttons.

### Main  Chat Area

The chat area should include:

- Agent welcome/intake summary
- Clarification messages
- User replies
- Generation progress
- Revision summaries
- Final-ready notices

The bottom composer should support:

- Free-form instruction
- Send button
- Optional quick actions

Recommended quick actions:

- Ask clarification
- Improve this section
- Make it more compliant
- Add more detail
- Simplify language
- Generate Word file

Quick actions should be subtle, not heavy cards.

### Second Document Area

The document area should include:

- View tabs or segmented control: Markdown / Word
- Draft warning banner
- Current version selector
- Document canvas
- Comment markers or comment drawer

The document canvas should have enough width and breathing room.

## 6. Highlight-to-Comment UX

The Markdown view should allow the user to highlight text and create an AI revision comment.

Recommended interaction:

1. User selects text in the Markdown draft.
2. A small floating action appears: **Comment**.
3. User clicks Comment.
4. A comment box opens with:
   - Selected text captured automatically
   - Section heading detected if possible
   - Instruction textarea
5. User writes what the agent should change.
6. Comment appears in the comment drawer.
7. User clicks **Revise Draft**.
8. Agent receives:
   - Current draft JSON/Markdown
   - Selected text
   - Section heading
   - User instruction
   - Any chat instruction

The prompt package should include comments in a structured format:

```text
COMMENT 1
Section: 4. Procedure
Selected text: "Verify that the equipment is clean."
Instruction: Add a clear check for cleaning log verification before use.
```

This keeps the agent focused and avoids vague revisions.

## 7. Comment Drawer

The comment drawer should sit inside or beside the document panel.

It should show:

- Open comments
- Resolved comments
- Target section
- Selected text
- User instruction
- Resolved by version

Comments should be treated as AI revision instructions, not approval comments.

Statuses:

- Open
- Resolved
- Dismissed

After a revision, the app should mark addressed comments as resolved and link them to the new draft version.

## 8. Agentic Process States

The UI should make the agent process clear.

Recommended states:

### Intake Ready

The user has created a session but no outline exists.

UI should show:

- Agent message summarizing the intake
- Button: Generate Outline
- Empty document panel with guidance

### Clarifying

The agent needs more information.

UI should show:

- Agent questions in chat
- Composer focused for answers
- Document panel may show outline placeholder

### Outline Ready

The agent has generated an outline.

UI should show:

- Outline in the document panel
- Agent message asking user to approve or adjust
- Buttons: Generate Draft / Ask for outline changes

### Draft Ready

The Markdown draft is ready.

UI should show:

- Markdown document in Second view
- Chat message summarizing the draft
- Commenting enabled
- Button: Revise Draft
- Button: Generate Word File

### Revising

The agent is applying comments.

UI should show:

- Progress state in chat
- Document panel remains readable
- Revision action disabled while running
- No full page reload

### Word Generated

The Word file is ready.

UI should show:

- Word view available
- Download button enabled
- Markdown view still accessible
- Agent message confirming final draft file generation

## 9. Visual Style

The interface should feel premium, calm, and familiar.

Recommended style:

- White/slate document canvas
- Quiet borders
- Soft contrast
- Clear typography
- Spacious message layout
- No oversized decorative hero section
- No heavy cards inside cards
- No dense dashboard feel

The workspace should feel like a professional AI document studio.

Avoid:

- Compact admin panels
- Too many buttons grouped together
- Small cramped sidebars
- Dense cards for every section
- Marketing-style decoration
- Heavy gradients

## 10. Responsive Behavior

Desktop:

- Two-panel layout
- Chat Main 
- Document Second
- Resizable or balanced columns if possible

Tablet:

- Two-column layout can remain if space allows
- Comment drawer may collapse

Mobile:

- Use tabs:
  - Chat
  - Draft
  - Comments
  - Word
- Composer fixed near bottom
- Document view scrolls independently

No text or buttons should overflow on small screens.

## 11. Data Handling

The app should continue storing:

- Session intake
- Chat messages
- Draft versions
- Markdown content
- Structured SOP JSON
- Comments
- Word file path
- Export records

For the improved UX, the Markdown selection/comment event should store:

- `quoted_text`
- `section_heading`
- `comment_text`
- `draft_id`
- `session_id`
- `created_by`

The agent revision prompt should use the structured comment records.

## 12. Word Generation Flow

The Word file should only be generated when the user intentionally requests it.

Recommended flow:

1. User reviews Markdown.
2. User adds comments and revisions until satisfied.
3. User clicks **Generate Word File**.
4. App creates `.docx` from structured content and template.
5. Word view becomes available.
6. User previews the Word file.
7. User downloads the Word file.

This prevents unnecessary Word generation during every AI revision.

## 13. Interface Build Changes Needed

To align the current implementation with this UX, the next build should:

1. Replace the compact workspace layout with a spacious two-panel agent workspace.
2. Make chat the primary Main -side experience.
3. Move Markdown/Word document views into a dedicated Second-side canvas.
4. Add a Markdown / Word view switcher.
5. Add highlight-to-comment support in Markdown view.
6. Add a floating comment action after text selection.
7. Improve the comment drawer for open/resolved comments.
8. Simplify top actions into state-aware primary actions.
9. Add clear agent process states.
10. Improve loading/progress states for AI operations.
11. Preserve draft version history without crowding the main UI.
12. Keep the existing Word read-view integration for generated `.docx` files.

## 14. My Recommendation

This direction is correct.

The AI SOP Builder should not look like the rest of the operational dashboard because the task is different. SOP generation is a focused agentic workflow, not a table-management task.

The best product shape is:

- Chat-first on the Main 
- Document canvas on the Second
- Markdown as the live working draft
- Highlighted comments as structured AI instructions
- Word preview only after generation
- Strong draft-only compliance boundary

This will make the feature easier for users to understand because it follows a pattern they already know from ChatGPT and Claude, while still fitting QMS-MANAJA's compliance requirements.

