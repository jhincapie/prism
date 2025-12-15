# AI Agent Guidelines for PRISM

This document provides instructions and context for AI agents working on the PRISM codebase.

## Project Overview
PRISM is a React-based financial portfolio simulator that uses Monte Carlo simulations to project future net worth. It runs entirely in the browser using Vite.

## Architecture
The project follows a standard React architecture with a focus on separating domain logic from UI.

### Directory Structure
*   `models/`: Domain entities (e.g., `Bucket` classes). All business logic related to specific assets should live here.
*   `services/`: Stateless logic (e.g., Monte Carlo simulation, math helpers, crypto).
*   `components/`: React UI components. Keep these focused on rendering.
*   `hooks/`: Custom React hooks for stateful logic (e.g., simulation runner, persistence).
*   `App.tsx`: The main entry point. Should be a high-level orchestrator, not a logic dump.

## Coding Standards

### 1. Small, Focused Files
*   **Avoid Monoliths:** If a file exceeds 200-300 lines, consider splitting it.
*   **One Component Per File:** Generally, keep one major React component per file.
*   **Separation of Concerns:** Move complex `useEffect` or state logic into custom hooks.

### 2. Typing
*   Use TypeScript Strict Mode.
*   Avoid `any`. Define explicit interfaces in `types.ts` or alongside the component if local.

### 3. State Management
*   Prefer local state or custom hooks over global state libraries unless necessary.
*   Pass data down via props, but avoid excessive drilling (more than 3 levels).

### 4. Refactoring
*   **Tactical Refactoring:** When touching a large file (like `App.tsx`), try to extract at least one logical chunk into a separate file.
*   **Models:** Keep the `models/` directory clean. If adding a new asset type, verify if it fits the `Bucket` hierarchy.

## Key Workflows
*   **Simulation:** Triggered via `useSimulation` hook. Runs in a web worker or async function to avoid blocking UI (currently async in main thread, future optimization target).
*   **Persistence:** URL-based (encrypted) and LocalStorage. Handled by `useAppPersistence`.

## Testing
*   Currently, there are no automated tests.
*   *Verification:* Always run `npm run build` to check for type errors before submitting.
