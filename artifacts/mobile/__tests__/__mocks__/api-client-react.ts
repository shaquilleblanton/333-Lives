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

// Pulse state
let _pulsePosts: any[] = [];

// Shop state
let _shopProducts: any[] = [];
let _shopError = false;

// Memories state
let _collections: any[] = [];
let _collectionItems: any[] = [];
let _vaultItems: any[] = [];
let _people: any[] = [];

// Timeline state
let _lifeEvents: any[] = [];

// Calendar events state
let _events: any[] = [];

// Family tree state
let _familyMembers: any[] = [];
let _familyMoments: any[] = [];

// Mutation spies — rebuilt on __reset so call counts are clean each test
let _createMutateAsync: jest.Mock;
let _updateMutate: jest.Mock;
let _deleteMutate: jest.Mock;

// Pulse mutation spies
let _deletePost: jest.Mock;
let _reactToPost: jest.Mock;
let _unreactPost: jest.Mock;
let _createPost: jest.Mock;

// Shop mutation spies
let _createCheckout: jest.Mock;

// Memories mutation spies
let _deleteCollection: jest.Mock;
let _createCollection: jest.Mock;
let _updateCollection: jest.Mock;
let _deleteCollectionItem: jest.Mock;
let _createCollectionItem: jest.Mock;
let _updateCollectionItem: jest.Mock;

// Timeline mutation spies
let _createLifeEvent: jest.Mock;
let _updateLifeEvent: jest.Mock;
let _deleteLifeEvent: jest.Mock;

// Family tree mutation spies
let _createMember: jest.Mock;
let _updateMember: jest.Mock;
let _deleteMember: jest.Mock;
let _createMoment: jest.Mock;
let _deleteMoment: jest.Mock;

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

  // Pulse
  _deletePost = jest.fn();
  _reactToPost = jest.fn();
  _unreactPost = jest.fn();
  _createPost = jest.fn();

  // Shop
  _createCheckout = jest.fn();

  // Memories
  _deleteCollection = jest.fn();
  _createCollection = jest.fn();
  _updateCollection = jest.fn();
  _deleteCollectionItem = jest.fn();
  _createCollectionItem = jest.fn();
  _updateCollectionItem = jest.fn();

  // Timeline
  _createLifeEvent = jest.fn();
  _updateLifeEvent = jest.fn();
  _deleteLifeEvent = jest.fn();

  // Family tree
  _createMember = jest.fn();
  _updateMember = jest.fn();
  _deleteMember = jest.fn();
  _createMoment = jest.fn(async () => ({ id: Date.now() }));
  _deleteMoment = jest.fn();
}

// ---------------------------------------------------------------------------
// Public test helpers
// ---------------------------------------------------------------------------

export function __reset() {
  _intentions = [];
  _history = { currentStreak: 0, longestStreak: 0, completedDays: [] };
  _createError = null;
  _pulsePosts = [];
  _shopProducts = [];
  _shopError = false;
  _collections = [];
  _collectionItems = [];
  _vaultItems = [];
  _people = [];
  _events = [];
  _lifeEvents = [];
  _familyMembers = [];
  _familyMoments = [];
  buildMutations();
}

export function __setIntentions(intentions: Intention[]) { _intentions = intentions; }
export function __setHistory(h: typeof _history) { _history = h; }
export function __setCreateError(err: Error | null) { _createError = err; buildMutations(); }
export function __setPulsePosts(posts: any[]) { _pulsePosts = posts; }
export function __setShopProducts(products: any[]) { _shopProducts = products; }
export function __setShopError(v: boolean) { _shopError = v; }
export function __setCollections(c: any[]) { _collections = c; }
export function __setCollectionItems(items: any[]) { _collectionItems = items; }
export function __setVaultItems(items: any[]) { _vaultItems = items; }
export function __setPeople(people: any[]) { _people = people; }
export function __setEvents(events: any[]) { _events = events; }
export function __setLifeEvents(events: any[]) { _lifeEvents = events; }
export function __setFamilyMembers(members: any[]) { _familyMembers = members; }
export function __setFamilyMoments(moments: any[]) { _familyMoments = moments; }

// Expose mutation spies for assertions
export function __getDeletePost() { return _deletePost; }
export function __getReactToPost() { return _reactToPost; }
export function __getUnreactPost() { return _unreactPost; }
export function __getCreatePost() { return _createPost; }
export function __getCreateCheckout() { return _createCheckout; }
export function __getDeleteCollection() { return _deleteCollection; }
export function __getDeleteCollectionItem() { return _deleteCollectionItem; }
export function __getUpdateCollectionItem() { return _updateCollectionItem; }
export function __getCreateLifeEvent() { return _createLifeEvent; }
export function __getUpdateLifeEvent() { return _updateLifeEvent; }
export function __getDeleteLifeEvent() { return _deleteLifeEvent; }
export function __getDeleteMember() { return _deleteMember; }
export function __getDeleteMoment() { return _deleteMoment; }
export function __getCreateMoment() { return _createMoment; }

// ---------------------------------------------------------------------------
// Query key helpers (exported so component imports resolve)
// ---------------------------------------------------------------------------

export const getGetEventsQueryKey = () => ["events"];
export const getGetIntentionsQueryKey = () => ["intentions"];
export const getGetDashboardQueryKey = () => ["dashboard"];
export const getGetIntentionHistoryQueryKey = () => ["intentionHistory"];
export const getGetPulseFeedQueryKey = () => ["pulseFeed"];
export const getGetMemoryCollectionsQueryKey = () => ["memoryCollections"];
export const getGetCollectionItemsQueryKey = (id?: number) => ["collectionItems", id];
export const getGetLifeEventsQueryKey = () => ["lifeEvents"];
export const getGetFamilyMembersQueryKey = () => ["familyMembers"];
export const getGetFamilyMemberMomentsQueryKey = (id?: number) => ["familyMoments", id];

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

export const requestUploadUrl = jest.fn(async ({ name }: any) => ({
  uploadURL: "https://example.com/upload",
  objectPath: `/uploads/${name}`,
}));

// ---------------------------------------------------------------------------
// Query hooks — plain functions, always read current state at call time
// ---------------------------------------------------------------------------

export function useGetEvents() {
  return { data: _events, isLoading: false, refetch: () => Promise.resolve(), isRefetching: false };
}

export function useGetIntentions() {
  return { data: _intentions, isLoading: false, refetch: () => Promise.resolve(), isRefetching: false };
}

export function useGetDashboard() {
  return { data: { intentionsStreak: _history.currentStreak, userName: "Test" } };
}

export function useGetIntentionHistory() {
  return { data: _history, isLoading: false, refetch: () => Promise.resolve(), isRefetching: false };
}

export function useGetPeopleReminders() {
  return { data: { upcomingEvents: [], overdueConnections: [] } };
}

export function useGetPulseFeed() {
  return { data: _pulsePosts, isLoading: false, refetch: () => Promise.resolve(), isRefetching: false };
}

export function useGetShopProducts() {
  return {
    data: _shopProducts,
    isLoading: false,
    isError: _shopError,
    refetch: () => Promise.resolve(),
    isRefetching: false,
  };
}

export function useGetMemoryCollections() {
  return { data: _collections, isLoading: false, refetch: () => Promise.resolve() };
}

export function useGetCollectionItems(_id: number) {
  return { data: _collectionItems, isLoading: false, refetch: () => Promise.resolve() };
}

export function useGetVaultItems() {
  return { data: _vaultItems, isLoading: false };
}

export function useGetPeople() {
  return { data: _people };
}

export function useGetLifeEvents() {
  return { data: _lifeEvents, isLoading: false };
}

export function useGetFamilyMembers() {
  return {
    data: _familyMembers,
    isLoading: false,
    refetch: () => Promise.resolve(),
    isRefetching: false,
  };
}

export function useGetFamilyMemberMoments(_memberId: number, _opts?: any) {
  return { data: _familyMoments, isLoading: false };
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

// Pulse mutations
export const useCreatePulsePost = jest.fn(() => ({ mutate: _createPost, isPending: false }));
export const useDeletePulsePost = jest.fn(() => ({ mutate: _deletePost, isPending: false }));
export const useReactToPulsePost = jest.fn(() => ({ mutate: _reactToPost, isPending: false }));
export const useRemovePulseReaction = jest.fn(() => ({ mutate: _unreactPost, isPending: false }));

// Shop mutations
export const useCreateShopCheckout = jest.fn(() => ({ mutate: _createCheckout, isPending: false }));

// Memories mutations
export const useDeleteMemoryCollection = jest.fn(() => ({ mutate: _deleteCollection, isPending: false }));
export const useCreateMemoryCollection = jest.fn(() => ({ mutate: _createCollection, isPending: false }));
export const useUpdateMemoryCollection = jest.fn(() => ({ mutate: _updateCollection, isPending: false }));
export const useDeleteCollectionItem = jest.fn(() => ({ mutate: _deleteCollectionItem, isPending: false }));
export const useCreateCollectionItem = jest.fn(() => ({ mutate: _createCollectionItem, isPending: false }));
export const useUpdateCollectionItem = jest.fn(() => ({ mutate: _updateCollectionItem, isPending: false }));

// Timeline mutations
export const useCreateLifeEvent = jest.fn(() => ({ mutate: _createLifeEvent, isPending: false }));
export const useUpdateLifeEvent = jest.fn(() => ({ mutate: _updateLifeEvent, isPending: false }));
export const useDeleteLifeEvent = jest.fn(() => ({ mutate: _deleteLifeEvent, isPending: false }));

// Family tree mutations
export const useCreateFamilyMember = jest.fn(() => ({
  mutateAsync: jest.fn(async () => ({ id: 1 })),
  isPending: false,
}));
export const useUpdateFamilyMember = jest.fn(() => ({
  mutateAsync: jest.fn(async () => {}),
  isPending: false,
}));
// useDeleteFamilyMember exposes both mutate and mutateAsync so tests can
// configure either calling convention (mutateAsync is used in confirmDelete).
export const useDeleteFamilyMember = jest.fn(() => ({ mutate: _deleteMember, mutateAsync: _deleteMember, isPending: false }));
export const useCreateFamilyMemberMoment = jest.fn(() => ({
  mutateAsync: _createMoment,
  isPending: false,
}));
export const useDeleteFamilyMemberMoment = jest.fn(() => ({ mutate: _deleteMoment, isPending: false }));

// Initialize
__reset();
