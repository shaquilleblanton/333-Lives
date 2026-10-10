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

// History loading/null state
let _historyLoading = false;
let _historyNull = false;

// Intentions loading state
let _intentionsLoading = false;

// Habits state
let _habits: any[] = [];
let _habitsLoading = false;
let _checkInError: Error | null = null;

// Mutation spies — rebuilt on __reset so call counts are clean each test
let _createMutateAsync: jest.Mock;
let _updateMutate: jest.Mock;
let _deleteMutate: jest.Mock;
let _deleteAccountMutateAsync: jest.Mock;

// Pulse mutation spies
let _deletePost: jest.Mock;
let _reactToPost: jest.Mock;
let _unreactPost: jest.Mock;
let _createPost: jest.Mock;
let _createFeedback: jest.Mock;

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

// Habits mutation spies
let _checkInHabit: jest.Mock;
let _createHabit: jest.Mock;
let _deleteHabit: jest.Mock;

// Habits error state
let _createHabitError: Error | null = null;

// ── isError state for each screen's primary hook ───────────────────────────
let _intentionsError = false;
let _memosError = false;
let _habitsError = false;
let _memoriesError = false;
let _lifeEventsError = false;
let _familyMembersError = false;
let _peopleError = false;
let _tasksError = false;
let _communityEventsError = false;
let _legacyLettersError = false;
let _gratitudeError = false;
let _messagesError = false;
let _eventsError = false;

// ── Data state for newly added hooks ──────────────────────────────────────
let _memos: any[] = [];
let _tasks: any[] = [];
let _communityEvents: any[] = [];
let _legacyLetters: any[] = [];
let _gratitudeEntries: any[] = [];
let _todayGratitudeEntry: any = null;
let _messages: any[] = [];
let _relationshipMoments: any[] = [];

// ── Refetch spies — rebuilt on __reset so call counts are clean each test ─
let _intentionsRefetch: jest.Mock;
let _memosRefetch: jest.Mock;
let _habitsRefetch: jest.Mock;
let _memoriesRefetch: jest.Mock;
let _lifeEventsRefetch: jest.Mock;
let _familyMembersRefetch: jest.Mock;
let _peopleRefetch: jest.Mock;
let _tasksRefetch: jest.Mock;
let _communityEventsRefetch: jest.Mock;
let _legacyLettersRefetch: jest.Mock;
let _gratitudeRefetch: jest.Mock;
let _messagesRefetch: jest.Mock;
let _eventsRefetch: jest.Mock;

function buildRefetchSpies() {
  _intentionsRefetch = jest.fn(() => Promise.resolve());
  _memosRefetch = jest.fn(() => Promise.resolve());
  _habitsRefetch = jest.fn(() => Promise.resolve());
  _memoriesRefetch = jest.fn(() => Promise.resolve());
  _lifeEventsRefetch = jest.fn(() => Promise.resolve());
  _familyMembersRefetch = jest.fn(() => Promise.resolve());
  _peopleRefetch = jest.fn(() => Promise.resolve());
  _tasksRefetch = jest.fn(() => Promise.resolve());
  _communityEventsRefetch = jest.fn(() => Promise.resolve());
  _legacyLettersRefetch = jest.fn(() => Promise.resolve());
  _gratitudeRefetch = jest.fn(() => Promise.resolve());
  _messagesRefetch = jest.fn(() => Promise.resolve());
  _eventsRefetch = jest.fn(() => Promise.resolve());
}

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
  _deleteAccountMutateAsync = jest.fn(async () => {});

  // Pulse
  _deletePost = jest.fn();
  _createFeedback = jest.fn();
  _reactToPost = jest.fn();
  _unreactPost = jest.fn();
  _createPost = jest.fn();

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

  // Habits
  _checkInHabit = jest.fn();
  _createHabit = jest.fn();
  _deleteHabit = jest.fn();
}

// ---------------------------------------------------------------------------
// Public test helpers
// ---------------------------------------------------------------------------

export function __reset() {
  _intentions = [];
  _history = { currentStreak: 0, longestStreak: 0, completedDays: [] };
  _createError = null;
  _pulsePosts = [];
  _collections = [];
  _collectionItems = [];
  _vaultItems = [];
  _people = [];
  _events = [];
  _lifeEvents = [];
  _familyMembers = [];
  _familyMoments = [];
  _historyLoading = false;
  _historyNull = false;
  _intentionsLoading = false;
  _habits = [];
  _habitsLoading = false;
  _checkInError = null;
  _createHabitError = null;
  // isError flags
  _intentionsError = false;
  _memosError = false;
  _habitsError = false;
  _memoriesError = false;
  _lifeEventsError = false;
  _familyMembersError = false;
  _peopleError = false;
  _tasksError = false;
  _communityEventsError = false;
  _legacyLettersError = false;
  _gratitudeError = false;
  _messagesError = false;
  _eventsError = false;
  // data for new hooks
  _memos = [];
  _tasks = [];
  _communityEvents = [];
  _legacyLetters = [];
  _gratitudeEntries = [];
  _todayGratitudeEntry = null;
  _messages = [];
  _relationshipMoments = [];
  buildMutations();
  buildRefetchSpies();
  requestUploadUrl.mockReset().mockImplementation(async ({ name }: any) => ({
    uploadURL: "https://example.com/upload",
    objectPath: `/uploads/${name}`,
  }));
  cleanupLegacyLetterUpload.mockReset().mockResolvedValue({ success: true });
}

export function __setIntentions(intentions: Intention[]) { _intentions = intentions; }
export function __setHistory(h: typeof _history) { _history = h; }
export function __setCreateError(err: Error | null) { _createError = err; buildMutations(); }
export function __setPulsePosts(posts: any[]) { _pulsePosts = posts; }
export function __setCollections(c: any[]) { _collections = c; }
export function __setCollectionItems(items: any[]) { _collectionItems = items; }
export function __setVaultItems(items: any[]) { _vaultItems = items; }
export function __setPeople(people: any[]) { _people = people; }
export function __setEvents(events: any[]) { _events = events; }
export function __setLifeEvents(events: any[]) { _lifeEvents = events; }
export function __setFamilyMembers(members: any[]) { _familyMembers = members; }
export function __setFamilyMoments(moments: any[]) { _familyMoments = moments; }
export function __setHistoryLoading(v: boolean) { _historyLoading = v; }
export function __setHistoryNull(v: boolean) { _historyNull = v; }
export function __setIntentionsLoading(v: boolean) { _intentionsLoading = v; }
export function __setHabits(habits: any[]) { _habits = habits; }
export function __setHabitsLoading(v: boolean) { _habitsLoading = v; }
export function __setCheckInError(err: Error | null) { _checkInError = err; buildMutations(); }
export function __setCreateHabitError(err: Error | null) { _createHabitError = err; buildMutations(); }

// ── isError setters ────────────────────────────────────────────────────────
export function __setIntentionsError(v: boolean) { _intentionsError = v; }
export function __setMemosError(v: boolean) { _memosError = v; }
export function __setHabitsError(v: boolean) { _habitsError = v; }
export function __setMemoriesError(v: boolean) { _memoriesError = v; }
export function __setLifeEventsError(v: boolean) { _lifeEventsError = v; }
export function __setFamilyMembersError(v: boolean) { _familyMembersError = v; }
export function __setPeopleError(v: boolean) { _peopleError = v; }
export function __setTasksError(v: boolean) { _tasksError = v; }
export function __setCommunityEventsError(v: boolean) { _communityEventsError = v; }
export function __setLegacyLettersError(v: boolean) { _legacyLettersError = v; }
export function __setGratitudeError(v: boolean) { _gratitudeError = v; }
export function __setMessagesError(v: boolean) { _messagesError = v; }
export function __setEventsError(v: boolean) { _eventsError = v; }

// Data setters for new hooks
export function __setMemos(memos: any[]) { _memos = memos; }
export function __setTasks(tasks: any[]) { _tasks = tasks; }
export function __setCommunityEvents(events: any[]) { _communityEvents = events; }
export function __setLegacyLetters(letters: any[]) { _legacyLetters = letters; }
export function __setGratitudeEntries(entries: any[]) { _gratitudeEntries = entries; }
export function __setTodayGratitudeEntry(entry: any) { _todayGratitudeEntry = entry; }
export function __setMessages(messages: any[]) { _messages = messages; }
export function __setRelationshipMoments(moments: any[]) { _relationshipMoments = moments; }

// Expose mutation spies for assertions
export function __getDeletePost() { return _deletePost; }
export function __getCreateFeedback() { return _createFeedback; }
export function __getReactToPost() { return _reactToPost; }
export function __getUnreactPost() { return _unreactPost; }
export function __getCreatePost() { return _createPost; }
export function __getDeleteCollection() { return _deleteCollection; }
export function __getDeleteCollectionItem() { return _deleteCollectionItem; }
export function __getUpdateCollectionItem() { return _updateCollectionItem; }
export function __getCreateLifeEvent() { return _createLifeEvent; }
export function __getUpdateLifeEvent() { return _updateLifeEvent; }
export function __getDeleteLifeEvent() { return _deleteLifeEvent; }
export function __getDeleteMember() { return _deleteMember; }
export function __getDeleteMoment() { return _deleteMoment; }
export function __getCreateMoment() { return _createMoment; }
export function __getCheckInHabit() { return _checkInHabit; }
export function __getCreateHabit() { return _createHabit; }
export function __getDeleteHabit() { return _deleteHabit; }
export function __getDeleteAccount() { return _deleteAccountMutateAsync; }

// ── Refetch spy getters (for error-path assertions) ────────────────────────
export function __getIntentionsRefetch() { return _intentionsRefetch; }
export function __getMemosRefetch() { return _memosRefetch; }
export function __getHabitsRefetch() { return _habitsRefetch; }
export function __getMemoriesRefetch() { return _memoriesRefetch; }
export function __getLifeEventsRefetch() { return _lifeEventsRefetch; }
export function __getFamilyMembersRefetch() { return _familyMembersRefetch; }
export function __getPeopleRefetch() { return _peopleRefetch; }
export function __getTasksRefetch() { return _tasksRefetch; }
export function __getCommunityEventsRefetch() { return _communityEventsRefetch; }
export function __getLegacyLettersRefetch() { return _legacyLettersRefetch; }
export function __getGratitudeRefetch() { return _gratitudeRefetch; }
export function __getMessagesRefetch() { return _messagesRefetch; }
export function __getEventsRefetch() { return _eventsRefetch; }

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
export const getGetHabitsQueryKey = () => ["habits"];
export const getGetVoiceMemosQueryKey = () => ["voiceMemos"];
export const getGetPeopleQueryKey = () => ["people"];
export const getGetRelationshipMomentsQueryKey = (id?: number) => ["relationshipMoments", id];
export const getGetTasksQueryKey = () => ["tasks"];
export const getGetCommunityEventsQueryKey = () => ["communityEvents"];
export const getGetLegacyLettersQueryKey = () => ["legacyLetters"];
export const getGetGratitudeEntriesQueryKey = () => ["gratitudeEntries"];
export const getGetTodayGratitudeEntryQueryKey = () => ["todayGratitudeEntry"];
export const getGetMessagesQueryKey = () => ["messages"];

// ---------------------------------------------------------------------------
// Utility exports
// ---------------------------------------------------------------------------

export const requestUploadUrl = jest.fn(async ({ name }: any) => ({
  uploadURL: "https://example.com/upload",
  objectPath: `/uploads/${name}`,
}));
export const cleanupLegacyLetterUpload = jest.fn(async () => ({ success: true }));

// ---------------------------------------------------------------------------
// Query hooks — plain functions, always read current state at call time
// ---------------------------------------------------------------------------

export function useGetEvents() {
  return {
    data: _eventsError ? undefined : _events,
    isLoading: false,
    isError: _eventsError,
    refetch: _eventsRefetch,
    isRefetching: false,
  };
}

export function useGetIntentions() {
  return {
    data: _intentionsLoading || _intentionsError ? undefined : _intentions,
    isLoading: _intentionsLoading,
    isError: _intentionsError,
    refetch: _intentionsRefetch,
    isRefetching: false,
  };
}

export function useGetDashboard() {
  return { data: { intentionsStreak: _history.currentStreak, userName: "Test" } };
}

export function useGetIntentionHistory() {
  return {
    data: _historyLoading || _historyNull ? undefined : _history,
    isLoading: _historyLoading,
    refetch: () => Promise.resolve(),
    isRefetching: false,
  };
}

export function useGetPeopleReminders() {
  return { data: { upcomingEvents: [], overdueConnections: [] } };
}

export function useGetPulseFeed() {
  return { data: _pulsePosts, isLoading: false, refetch: () => Promise.resolve(), isRefetching: false };
}

export function useGetMemoryCollections() {
  return {
    data: _memoriesError ? undefined : _collections,
    isLoading: false,
    isError: _memoriesError,
    refetch: _memoriesRefetch,
  };
}

export function useGetCollectionItems(_id: number) {
  return { data: _collectionItems, isLoading: false, refetch: () => Promise.resolve() };
}

export function useGetVaultItems() {
  return { data: _vaultItems, isLoading: false };
}

export function useGetPeople() {
  return {
    data: _peopleError ? undefined : _people,
    isLoading: false,
    isError: _peopleError,
    refetch: _peopleRefetch,
    isRefetching: false,
  };
}

export function useGetRelationshipMoments(_personId: number, _opts?: any) {
  return { data: _relationshipMoments, isLoading: false, isError: false, refetch: jest.fn() };
}

export function useGetLifeEvents() {
  return {
    data: _lifeEventsError ? undefined : _lifeEvents,
    isLoading: false,
    isError: _lifeEventsError,
    refetch: _lifeEventsRefetch,
  };
}

export function useGetFamilyMembers() {
  return {
    data: _familyMembersError ? undefined : _familyMembers,
    isLoading: false,
    isError: _familyMembersError,
    refetch: _familyMembersRefetch,
    isRefetching: false,
  };
}

export function useGetFamilyMemberMoments(_memberId: number, _opts?: any) {
  return { data: _familyMoments, isLoading: false };
}

export function useGetHabits() {
  return {
    data: _habitsLoading || _habitsError ? undefined : _habits,
    isLoading: _habitsLoading,
    isError: _habitsError,
    refetch: _habitsRefetch,
    isRefetching: false,
  };
}

// ── New query hooks ────────────────────────────────────────────────────────

export function useGetVoiceMemos() {
  return {
    data: _memosError ? undefined : _memos,
    isLoading: false,
    isError: _memosError,
    refetch: _memosRefetch,
    isRefetching: false,
  };
}

export function useGetTasks() {
  return {
    data: _tasksError ? undefined : _tasks,
    isLoading: false,
    isError: _tasksError,
    refetch: _tasksRefetch,
    isRefetching: false,
  };
}

export function useGetCommunityEvents() {
  return {
    data: _communityEventsError ? undefined : _communityEvents,
    isLoading: false,
    isError: _communityEventsError,
    refetch: _communityEventsRefetch,
    isRefetching: false,
  };
}

export function useGetLegacyLetters() {
  return {
    data: _legacyLettersError ? undefined : _legacyLetters,
    isLoading: false,
    isError: _legacyLettersError,
    refetch: _legacyLettersRefetch,
    isRefetching: false,
  };
}

export function useGetGratitudeEntries() {
  return {
    data: _gratitudeError ? undefined : _gratitudeEntries,
    isLoading: false,
    isError: _gratitudeError,
    refetch: _gratitudeRefetch,
    isRefetching: false,
  };
}

export function useGetTodayGratitudeEntry() {
  return { data: _todayGratitudeEntry, isLoading: false };
}

export function useGetMessages() {
  return {
    data: _messagesError ? undefined : _messages,
    isLoading: false,
    isError: _messagesError,
    refetch: _messagesRefetch,
    isRefetching: false,
  };
}

export function useGetMe() {
  return {
    data: {
      id: 1,
      name: "Taylor",
      email: "taylor@example.com",
      avatarUrl: null,
      bio: null,
      streakDays: 0,
      messagesSent: 0,
      goalsActive: 0,
      isOwner: false,
      createdAt: new Date().toISOString(),
    },
    isLoading: false,
  };
}

export const getGetMeQueryKey = () => ["/api/users/me"];

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

export const useUpdateMe = jest.fn(() => ({
  mutateAsync: _updateMutate,
  isPending: false,
}));

export const useDeleteMe = jest.fn(() => ({
  mutateAsync: _deleteAccountMutateAsync,
  isPending: false,
}));

export const useDeleteIntention = jest.fn(() => ({
  mutate: _deleteMutate,
  isPending: false,
  variables: undefined,
}));

// Pulse mutations
export const useCreatePulsePost = jest.fn(() => ({ mutate: _createPost, isPending: false }));
export const useDeletePulsePost = jest.fn(() => ({ mutate: _deletePost, isPending: false }));
export const useCreateFeedback = jest.fn(() => ({ mutate: _createFeedback, isPending: false }));
export const useReactToPulsePost = jest.fn(() => ({ mutate: _reactToPost, isPending: false }));
export const useRemovePulseReaction = jest.fn(() => ({ mutate: _unreactPost, isPending: false }));

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

// Habits mutations
export const useCheckInHabit = jest.fn(() => ({
  mutate: (args: any, opts?: any) => {
    if (_checkInError) {
      opts?.onError?.(_checkInError);
    } else {
      _checkInHabit(args, opts);
      opts?.onSuccess?.();
    }
  },
  isPending: false,
  variables: undefined,
}));

export const useCreateHabit = jest.fn(() => ({
  mutate: (args: any, opts?: any) => {
    if (_createHabitError) {
      opts?.onError?.(_createHabitError);
    } else {
      _createHabit(args, opts);
      opts?.onSuccess?.();
    }
  },
  isPending: false,
}));

export const useDeleteHabit = jest.fn(() => ({
  mutate: _deleteHabit,
  isPending: false,
}));

// ── New mutation stubs (screens import these; stub with no-op jest.fn()) ───

// Voice memos
export const useCreateVoiceMemo = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useUpdateVoiceMemo = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useDeleteVoiceMemo = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));

// People / relationship moments
export const useCreatePerson = jest.fn(() => ({ mutateAsync: jest.fn(async () => ({ id: 1 })), isPending: false }));
export const useUpdatePerson = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useDeletePerson = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useCreateRelationshipMoment = jest.fn(() => ({ mutateAsync: jest.fn(async () => ({ id: 1 })), isPending: false }));

// Tasks
export const useCreateTask = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useUpdateTask = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useDeleteTask = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));

// Community events
export const useCreateCommunityEvent = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useUpdateCommunityEvent = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useDeleteCommunityEvent = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useRespondToCommunityEvent = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));

// Legacy letters
export const useCreateLegacyLetter = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useUpdateLegacyLetter = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useDeleteLegacyLetter = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useSealLegacyLetter = jest.fn(() => ({ mutateAsync: jest.fn(async () => {}), isPending: false }));
export const useUnsealLegacyLetter = jest.fn(() => ({ mutateAsync: jest.fn(async () => {}), isPending: false }));

// Gratitude entries
export const useCreateGratitudeEntry = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useUpdateGratitudeEntry = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));

// Future messages
export const useCreateMessage = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useUnlockMessage = jest.fn(() => ({ mutateAsync: jest.fn(async () => ({ content: "" })), isPending: false }));

// Calendar events
export const useCreateEvent = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));
export const useDeleteEvent = jest.fn(() => ({ mutate: jest.fn(), isPending: false }));

// Initialize
__reset();

// ── Habit update + AI affirmation (Today / Habits cleanup) ──────────────────
let _updateHabitSpy: jest.Mock = jest.fn();
let _updateHabitError: Error | null = null;
export function __setUpdateHabitError(err: Error | null) { _updateHabitError = err; }
export function __getUpdateHabitSpy() { return _updateHabitSpy; }
export function __resetHabitUpdate() { _updateHabitSpy = jest.fn(); _updateHabitError = null; }
export const useUpdateHabit = jest.fn(() => ({
  mutate: (args: any, opts?: any) => {
    _updateHabitSpy(args);
    if (_updateHabitError) opts?.onError?.(_updateHabitError);
    else opts?.onSuccess?.();
  },
  isPending: false,
}));
export function __getCreateHabitSpy() { return _createHabit; }
export function __getDeleteHabitSpy() { return _deleteHabit; }
export function __getCheckInHabitSpy() { return _checkInHabit; }

let _affirmationResult: { text: string } | Error = { text: "You are steady and you are enough." };
let _affirmationSpy: jest.Mock = jest.fn();
export function __setAffirmationResult(r: { text: string } | Error) { _affirmationResult = r; _affirmationSpy = jest.fn(); }
export function __getAffirmationSpy() { return _affirmationSpy; }
export const useGenerateAnthropicAffirmation = jest.fn(() => ({
  mutateAsync: () => {
    _affirmationSpy();
    return _affirmationResult instanceof Error ? Promise.reject(_affirmationResult) : Promise.resolve(_affirmationResult);
  },
  isPending: false,
}));

// Goals / journal (Growth Hub)
export const useGetGoals = () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false });
export const useCreateGoal = jest.fn(() => ({ mutateAsync: jest.fn(() => Promise.resolve({})), isPending: false }));
export const useUpdateGoal = jest.fn(() => ({ mutateAsync: jest.fn(() => Promise.resolve({})), isPending: false }));
export const getGetGoalsQueryKey = () => ["goals"];
export const useGetJournalEntries = () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn(), isRefetching: false });
export const useCreateJournalEntry = jest.fn(() => ({ mutateAsync: jest.fn(() => Promise.resolve({})), isPending: false }));
export const getGetJournalEntriesQueryKey = () => ["journal"];
