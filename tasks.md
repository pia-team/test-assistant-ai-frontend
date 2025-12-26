# Implementation Tasks

## Phase 1: Backend Integration
- [ ] Verify and update `useAllJobs` hook in `src/lib/use-job.ts` to ensure it fetches required fields. <!-- id: 1 -->
- [ ] Update `test-run-client.tsx` to fetch jobs using `useAllJobs`. <!-- id: 2 -->
- [ ] Implement data transformation logic (Job -> TestCreation) including log parsing. <!-- id: 3 -->
- [ ] Integrate mapped data into `testCreations` state, merging with real-time socket updates. <!-- id: 4 -->
