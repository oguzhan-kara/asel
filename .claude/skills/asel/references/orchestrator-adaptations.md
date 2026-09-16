# Orchestrator Adaptations — Scale and Project Type

Reference material for Planning Step 5 (architecture) and Step 6 (screens): how to split files as a
project grows, and what to focus on per project type.

## Scale-Adaptive File Structure

| Scale | Threshold | Approach |
|-------|-----------|----------|
| **Small** | < 10 screens, < 50 APIs, < 30 tables | Single file per artifact |
| **Medium** | 10-50 screens, 50-200 APIs, 30-100 tables | Domain-based splitting |
| **Large** | 50+ screens, 200+ APIs, 100+ tables | Domain + sub-domain splitting |

Architect and Screen Designer detect scale and split automatically. See phase files for details.

## Project Type Adaptations

| Type | Architecture Focus | Screen Focus | Test Focus | Deploy Focus |
|------|-------------------|--------------|------------|-------------|
| **web-app** | React component tree, state mgmt, routing, **mock adapter layer** | Full ASCII mockups, frontend-design skill. **Frontend-First: all screens with mocks first, backend later** | Playwright MCP tools (`{{playwrightPrefix}}__browser_*`) visual + API | Nginx + Node Docker |
| **mobile-app** | Navigation flow, platform APIs | Screen flows, gestures | Device-specific | Expo/RN build |
| **api-backend** | Endpoint design, data model, middleware | API documentation (no visual screens) | API contract tests | Node Docker |
| **cli-tool** | Command tree, I/O flow | Terminal output examples | CLI integration tests | Binary/Docker |
| **fullstack** | Client + Server architecture, **mock adapter layer** | Full mockups + API docs. **Frontend-First: all screens with mocks first, backend later** | End-to-end | Multi-container compose |
