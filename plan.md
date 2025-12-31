# Implementation Plan - Test Results Backend Integration

## Context

User wants to populate the "Test Results" table in `test-run-client.tsx` with data fetched from the backend (Jobs API) so that data persists across page reloads.

## Technical Approach

1.  **Data Fetching**: Use the existing `useAllJobs` hook (or create a specific one) to fetch `RUN_TESTS` jobs from the backend.
2.  **Data Mapping**: Transform the raw `Job` objects into the `TestCreation` interface used by `TestResultsTable`.
    - `Job` -> `TestCreation`
    - Parse `job.result.logs` -> `TestItem[]` using `parseLogsToDashboardData`.
3.  **State Management**:
    - Initialize `testCreations` state with the fetched data.
    - Maintain `Socket.io` subscriptions for _active_ updates.
    - Merge fetched historical data with live socket updates.

## Files to Modify

- `src/app/(protected)/test-run/test-run-client.tsx`: Main integration point.
- `src/lib/use-job.ts`: Ensure `useAllJobs` is correctly implemented and exported.

## Dependencies

- `parseLogsToDashboardData` (already implemented in `src/lib/log-parser.ts`)
