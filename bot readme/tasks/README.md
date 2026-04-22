# Task Description File Template

This document provides the standard structure for creating task description files that agents will use to manage and execute tasks. Each task file should be self-contained and enable any agent to cold-start and take over a task.

## File Naming Convention

Task files should follow this format. Use the cureent date when creating a file:
```
yyyy-MM-dd_<task-description-with-hyphens>.md
```

Examples:
- `2024-01-15_implement-user-authentication.md`
- `2024-01-20_fix-database-connection-issue.md`
- `2024-01-25_refactor-order-processing-logic.md`

## Task File Structure

### 1. Task Identity
```markdown
# Task ID: TASK-001
**Created Date:** 2024-01-15
**Last Modified:** 2024-01-15
**Current Agent:** [Agent Name or "Unassigned"]
**Task Type:** Feature/Bug/Refactor/Setup/Other
```

### 2. Objective & Success
```markdown
## Objective & Success

**Primary Objective:** [One-sentence description of what needs to be accomplished]

**Success Criteria:**
- [Specific, measurable outcome 1]
- [Specific, measurable outcome 2]
- [Specific, measurable outcome 3]

**Definition of Done:**
- [ ] [Completion criteria 1]
- [ ] [Completion criteria 2]
- [ ] [Completion criteria 3]
```

### 3. Current State Analysis
```markdown
## Current State Analysis

**What Exists Now:** [Description of current implementation status]

**Code Locations:**
- [File/Path]: [Purpose/Description]
- [File/Path]: [Purpose/Description]

**Database Schema:** [Current data structure if applicable]

**Configuration:** [Current settings, environment variables]

**Known Issues:** [What's broken or incomplete]
```

### 4. Implementation Roadmap
```markdown
## Implementation Roadmap

### Phase 1: [Phase Name] - [Brief Description]
**Dependencies:** [What must be completed before this phase]

**Sub-tasks:**
- **1.1** [Specific Action] - [Acceptance Criteria]
- **1.2** [Specific Action] - [Acceptance Criteria]

### Phase 2: [Phase Name] - [Brief Description]
**Dependencies:** [What must be completed before this phase]

**Sub-tasks:**
- **2.1** [Specific Action] - [Acceptance Criteria]
- **2.2** [Specific Action] - [Acceptance Criteria]
```

### 5. Progress Tracking
```markdown
## Progress Tracking

**Overall Progress:** X/Y phases completed
**Current Phase:** [What's being worked on now]

**Phase Status:**
- Phase 1: ✅ Complete
- Phase 2: 🔄 In Progress (Sub-tasks 2.1, 2.2 complete)
- Phase 3: ⏳ Pending

**Last Activity:** [What was accomplished in last session]
**Last Updated:** [Date of last progress update]
```

### 6. Technical Context
```markdown
## Technical Context

**Architecture Overview:** [High-level system design]

**Key Technologies:** [Frameworks, libraries, tools used]

**File Structure:** [Relevant directories and their purpose]

**Entry Points:** [How to run/test the current implementation]

**Environment Setup:** [How to get development environment running]
```

### 7. Validation & Testing
```markdown
## Validation & Testing

**Automated Tests:** [What tests exist and how to run them]

**Manual Testing:** [Step-by-step verification procedures]

**Test Data:** [Sample data or fixtures needed]

**Edge Cases:** [Special scenarios to consider]
```

### 8. Deployment & Cleanup
```markdown
## Deployment & Cleanup

**Deployment Checklist:**
- [ ] [Deployment step 1]
- [ ] [Deployment step 2]

**Documentation Updates:** [What needs to be documented]

**Cleanup Tasks:** [Temporary files, debug code to remove]

**Handoff Notes:** [What the next agent needs to know]
```

### 9. Agent Notes
```markdown
## Agent Notes

**Decisions Made:** [Important architectural/design decisions]

**Challenges Encountered:** [Problems solved and how]

**Alternative Approaches:** [What was considered but rejected]

**Next Agent Instructions:** [Specific guidance for the next person]
```

## Usage Guidelines

### For Agents Creating New Tasks
1. Copy this template structure
2. Fill in all sections with relevant information
3. Use clear, specific language
4. Include file paths and code references
5. Set initial status to "Unassigned"

### For Agents Taking Over Tasks
1. Read the entire task file first
2. Update "Current Agent" field
3. Review "Current State Analysis" and "Technical Context"
4. Check "Progress Tracking" to understand current status
5. Begin with the next incomplete phase/sub-task

### For Agents Updating Progress
1. Update "Progress Tracking" section after each session
2. Document decisions and challenges in "Agent Notes"
3. Update "Last Modified" and "Last Activity" timestamps
4. Provide clear handoff information for next agent

## Example Task File

See `examples/` folder for complete examples of task files following this template.

## Best Practices

- **Be Specific**: Use exact file paths, function names, and error messages
- **Keep Updated**: Update progress after each working session
- **Document Decisions**: Explain why certain approaches were chosen
- **Think Ahead**: Consider what the next agent will need to know
- **Use Markdown**: Proper formatting makes files easier to read
- **Version Control**: Commit task file updates with code changes

## Questions or Issues

If you have questions about this template or need clarification on any section, please update the task file with your questions in the "Agent Notes" section.
