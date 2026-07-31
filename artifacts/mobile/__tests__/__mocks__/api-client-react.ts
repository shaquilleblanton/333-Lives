/**
 * Manual mock for @workspace/api-client-react.
 *
 * Query hooks are plain functions (not jest.fn) that read module-level state
 * at call time — no mockImplementation() needed, so they are immune to
 * jest.clearAllMocks() / jest.resetAllMocks() between tests.
 *
 * Mutation hooks ARE jest.fn() spies so tests can assert on their calls.
 * They are recreated in __reset() so call counts are always fresh.
 */

import type { Intention } from "@workspace/api-client-react";

// ---------------------------------------------------------------------------
// Mutable module state — set by test helpers before render
// ---------------------------------------------------------------------------

let _intentions: Intention[] = [];
let _history = { currentStreak: 0, longestStreak: 0, completedDays: [] as string[] };
let _createError: Error | null = null;

// Mutation spies — rebuilt on __reset so call counts are clean each test
let _createMutateAsync: jest.Mock;
let _updateMutate: jest.Mock;
let _deleteMutate: jest.Mock;

function buildMutations() {
  _createMutateAsync = jest.fn(async (args: any) => {
    if (_createError) throw _createError;
    return {
      id: Date.now(),
      text: args.data.text,
      order: args.data.order,
      isCompleted: false,
    };
  });
  _updateMutate = jest.fn();
  _deleteMutate = jest.fn();
}

// ---------------------------------------------------------------------------
// Public test helpers
// ---------------------------------------------------------------------------

export function __reset() {
  _intentions = [];
  _history = { currentStreak: 0, longestStreak: 0, completedDays: [] };
  _createError = null;
  buildMutations();
}

export function __setIntentions(intentions: Intention[]) {
  _intentions = intentions;
}

export function __setHistory(h: typeof _history) {
  _history = h;
}

export function __setCreateError(err: Error | null) {
  _createError = err;
  buildMutations(); // rebuild so the new error is closed over
}

// ---------------------------------------------------------------------------
// Query key helpers (exported so component imports resolve)
// ---------------------------------------------------------------------------

export const getGetIntentionsQueryKey = () => ["intentions"];
export const getGetDashboardQueryKey = () => ["dashboard"];
export const getGetIntentionHistoryQueryKey = () => ["intentionHistory"];

// ---------------------------------------------------------------------------
// Query hooks — plain functions, always read current state at call time
// ---------------------------------------------------------------------------

export function useGetIntentions() {
  return {
    data: _intentions,
    isLoading: false,
    refetch: () => Promise.resolve(),
    isRefetching: false,
  };
}

export function useGetDashboard() {
  return {
    data: { intentionsStreak: _history.currentStreak, userName: "Test" },
  };
}

export function useGetIntentionHistory() {
  return {
    data: _history,
    isLoading: false,
    refetch: () => Promise.resolve(),
    isRefetching: false,
  };
}

export function useGetPeopleReminders() {
  return { data: { upcomingEvents: [], overdueConnections: [] } };
}

// ---------------------------------------------------------------------------
// Mutation hooks — jest.fn() spies backed by the current mutation references
// ---------------------------------------------------------------------------

export const useCreateIntention = jest.fn(() => ({
  mutateAsync: _createMutateAsync,
  isPending: false,
}));

export const useUpdateIntention = jest.fn(() => ({
  mutate: _updateMutate,
  isPending: false,
  variables: undefined,
}));

export const useDeleteIntention = jest.fn(() => ({
  mutate: _deleteMutate,
  isPending: false,
  variables: undefined,
}));

// Initialize
__reset();
