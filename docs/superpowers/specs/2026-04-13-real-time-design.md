# Sub-project 4: Real-time — Design Spec

**Goal:** Add live updates across users and tabs, optimistic UI for instant feedback, version-based conflict detection, and user presence indicators.

**Architecture:** In-memory pub/sub EventHub fans out mutations to SSE-connected clients. React 19 `useOptimistic` provides instant local feedback. `BroadcastChannel` syncs optimistic updates across tabs. Version fields on Task and List models detect concurrent edits.

**Tech Stack:** Next.js 16 Route Handlers (SSE), React 19 (`useOptimistic`), Node EventEmitter, BroadcastChannel API, Prisma 7 (version fields).

---

## 1. Transport: Server-Sent Events

SSE via a Next.js Route Handler at `app/api/events/lists/[id]/route.ts`.

- `GET` handler returns a `ReadableStream` with `Content-Type: text/event-stream`
- Authenticates via `auth()`, checks `canView(listId)` — rejects unauthorized connections
- Rate limit: max 5 SSE connections per user per list (prevents resource exhaustion)
- Subscribes to the EventHub for the given list ID
- Streams events as `data: <JSON>\n\n` format
- Sends `:keepalive\n\n` comment every 30 seconds to prevent proxy/browser timeout
- Cleans up subscription on `request.signal.abort` (client disconnect)
- On `member:removed` event for the connected user, closes the SSE stream (re-checks authorization)

Custom client-side implementation using `fetch` + `ReadableStream` instead of native `EventSource` for:
- Exponential backoff on reconnect (1s → 2s → 4s → ... → max 30s)
- Auth header support (session cookie passthrough)
- Structured event parsing with error handling

## 2. Pub/Sub Hub

Singleton module at `lib/event-hub.ts` using Node's `EventEmitter`.

### API

```typescript
interface EventHub {
  subscribe(listId: string, userId: string, userName: string, callback: (event: HubEvent) => void): () => void;
  publish(listId: string, event: HubEvent): void;
  getPresence(listId: string): { userId: string; userName: string }[];
}
```

### Channels

Keyed by list ID. Each list is an independent channel. Subscribers are SSE connections.

### Event Types

All entity events include the full object (consistent payload shape for all operations):

| Event | Payload | Trigger |
|-------|---------|---------|
| `task:created` | Full task object | createTask action |
| `task:updated` | Full task object with new version | toggleDone, updateTask actions |
| `task:deleted` | Full task object (last known state) | deleteTask action |
| `list:updated` | Full list object with new version | updateList action |
| `member:added` | `{ userId, userName, role, listId }` | addMember action |
| `member:removed` | `{ userId, listId }` | removeMember action |
| `presence:changed` | `{ viewers: [{userId, userName}] }` | subscribe/unsubscribe |

### Event Type Definition

```typescript
type HubEvent =
  | { type: "task:created"; data: Task }
  | { type: "task:updated"; data: Task }
  | { type: "task:deleted"; data: Task }
  | { type: "list:updated"; data: List }
  | { type: "member:added"; data: { userId: string; userName: string; role: string; listId: string } }
  | { type: "member:removed"; data: { userId: string; listId: string } }
  | { type: "presence:changed"; data: { viewers: { userId: string; userName: string }[] } };

interface HubEventEnvelope {
  id: string;          // UUID for deduplication
  userId: string;      // originator (so they can ignore their own events)
  version: number;     // entity version after mutation
  timestamp: number;   // server timestamp
  event: HubEvent;
}
```

### Event Metadata

Every event is wrapped in a `HubEventEnvelope` containing:
- `id` — unique event ID (UUID) for deduplication
- `userId` — the user who triggered the event (so originator can ignore it)
- `version` — entity version after mutation (for ordering)
- `timestamp` — server timestamp

### Presence

- On `subscribe()`: add user to list's presence set, publish `presence:changed`
- On unsubscribe (cleanup function called): remove user, publish `presence:changed`
- Stale presence cleanup: if a connection goes silent for 60s without keepalive acknowledgment, remove from presence

## 3. Schema Changes

Add `version` integer field to `Task` and `List` models for conflict detection.

```prisma
model List {
  // ... existing fields
  version   Int      @default(0)
}

model Task {
  // ... existing fields
  version   Int      @default(0)
}
```

Migration: `ALTER TABLE List ADD COLUMN version INTEGER DEFAULT 0` and same for Task.

No new tables — presence is in-memory only.

## 4. Server Action Changes

All mutation actions in `actions/tasks.ts`, `actions/lists.ts`, `actions/members.ts` get two additions:

### Version Check (Tasks and Lists)

Update operations use optimistic locking:

```typescript
const result = await db.task.updateMany({
  where: { id: taskId, version: expectedVersion },
  data: { done: !task.done, version: { increment: 1 } },
});
if (result.count === 0) {
  throw new ConflictError("Task was modified by another user");
}
```

A `force` parameter bypasses the version check (used by the "Overwrite" option in conflict dialog).

### Event Publishing

After successful mutation, publish to the EventHub:

```typescript
eventHub.publish(listId, {
  id: crypto.randomUUID(),
  type: "task:updated",
  data: updatedTask,
  userId: session.user.id,
  version: updatedTask.version,
  timestamp: Date.now(),
});
```

### ConflictError

New error class in `lib/errors.ts`. Server Actions catch and return it as a typed error so the client can show the conflict dialog.

## 5. Client-Side Hooks

### `lib/sse-transport.ts`

Low-level SSE transport layer (not a hook — pure class).

- Connects to a URL via `fetch` + `ReadableStream`
- Parses SSE `data:` lines into typed `HubEventEnvelope` objects
- Calls a single `onEvent` callback with parsed events
- Auto-reconnects with exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
- Exposes `connect()`, `disconnect()`, `status` getter
- On reconnect, calls `onReconnect` callback so consumer can fetch fresh state

### `lib/use-event-source.ts`

React hook wrapping `SseTransport` with sync logic.

- Creates/destroys `SseTransport` on mount/unmount for `/api/events/lists/[id]`
- Routes events to registered handlers by event type
- On receiving an event, broadcasts via `BroadcastChannel("todo-sync")` with source tab ID
- Listens on `BroadcastChannel` — ignores messages from own tab ID (prevents echo loops)
- Deduplicates by event `id` (maintains a small Set of recent IDs, max 200)
- Filters out events where `userId === currentUserId` (already handled by optimistic update)
- Ignores events with `version <= currentVersion` to prevent stale overwrites
- Returns `{ status: 'connecting' | 'connected' | 'disconnected' }`

### `lib/use-presence.ts`

Subscribes to `presence:changed` events from the EventSource hook.

- Returns `{ viewers: Array<{userId: string, userName: string}>, isConnected: boolean }`
- Filters out current user from the viewers list

### `lib/use-task-list.ts`

React Context + provider that holds the live task list state.

- Initialized from server component props (initial render data)
- Updated by SSE events (`task:created` adds to list, `task:updated` replaces in list, `task:deleted` removes)
- Integrates with `useOptimistic` for local mutations
- Provides `optimisticToggle(taskId)`, `optimisticDelete(taskId)`, `optimisticCreate(task)` functions
- On version conflict from server, sets `conflictTask` state to trigger conflict dialog

## 6. Client-Side Components

### New Components

**`components/presence-indicator.tsx`** — Avatar dots showing who's viewing the list. Renders in the list header. Shows up to 3 avatars + "+N" overflow. Empty when user is alone. Accessibility: `role="status"`, `aria-live="polite"`, `aria-label="N users viewing"`.

**`components/connection-status.tsx`** — Small colored dot in the list header. Green when connected, yellow pulse when reconnecting, hidden after 3s of stable connection. Accessibility: `aria-live="polite"`, visually hidden text describing state ("Connected", "Reconnecting...").

**`components/conflict-dialog.tsx`** — Modal dialog shown on version conflict. Displays: "This item was edited by someone else." Two actions:
- "Refresh" — calls `router.refresh()` to get latest server state
- "Overwrite" — retries the Server Action with `force: true` flag
- Accessibility: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby`, focus trap, return focus on close

### Modified Components

**`task-item.tsx`** — Wrap toggle and delete with `useOptimistic`. Accept `version` prop, pass to Server Actions. On conflict error, trigger conflict dialog.

**`task-form.tsx`** — Optimistic insert: show new task in list immediately with pending styling. Confirm or remove on Server Action completion.

**`app/(app)/lists/[id]/page.tsx`** — Wrap content with `TaskListProvider`. Add `useEventSource` and `usePresence` hooks. Render `PresenceIndicator` and `ConnectionStatus` in header. This page becomes a client component wrapper around the server-fetched initial data.

## 7. Configuration

All timing constants live in `lib/realtime-config.ts`:

```typescript
export const REALTIME_CONFIG = {
  keepaliveIntervalMs: 30_000,       // SSE keepalive ping
  presenceTimeoutMs: 60_000,         // stale presence cleanup
  reconnectBaseMs: 1_000,            // initial reconnect delay
  reconnectMaxMs: 30_000,            // max reconnect delay
  deduplicationSetSize: 200,         // max event IDs to track
  maxConnectionsPerUserPerList: 5,   // SSE rate limit
};
```

## 8. Cross-Tab Sync

Each tab opens its own SSE connection (no leader election — simpler and more reliable).

`BroadcastChannel("todo-sync")` is used for optimistic update propagation only:
- When a user performs an action in Tab 1, the optimistic update is broadcast so Tab 2 shows it instantly (before the SSE event roundtrip)
- SSE events arrive independently to each tab and are deduplicated by event ID

This means tabs are consistent even if one loses its SSE connection temporarily.

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| SSE connection drops | Auto-reconnect with exponential backoff. On reconnect, fetch fresh state from server to catch missed events. |
| Server Action fails | `useOptimistic` automatically reverts. Error toast shown. |
| Version conflict | Conflict dialog with Refresh/Overwrite options. |
| Auth expired during SSE | SSE returns 401 → redirect to login. |
| EventHub has no subscribers | Events are silently dropped (no persistence needed). |
| Server restart | All SSE connections close. Clients reconnect. EventHub is empty but clients fetch fresh state on reconnect. |

## 10. Testing Strategy

### Unit Tests

| File | Tests |
|------|-------|
| `lib/event-hub.test.ts` | subscribe/publish/unsubscribe, presence tracking, fan-out to multiple subscribers, cleanup on disconnect, stale presence cleanup |
| `lib/sse-transport.test.ts` | connect/disconnect lifecycle, SSE parsing, exponential backoff, reconnect callback |
| `lib/use-event-source.test.ts` | BroadcastChannel relay, echo prevention via tab ID, event deduplication, version filtering, userId filtering |
| `lib/use-presence.test.ts` | presence state from events, filters current user |
| `lib/use-task-list.test.ts` | optimistic toggle/delete/create, SSE event application, version ordering, conflict state |
| `components/conflict-dialog.test.tsx` | render, refresh action, overwrite action with force flag |
| `components/presence-indicator.test.tsx` | renders viewers, empty state, overflow count |
| `components/connection-status.test.tsx` | connected/reconnecting/hidden states |

### Integration Tests

| Test | Validates |
|------|-----------|
| Version conflict on Task update | Update with stale version → ConflictError thrown |
| Version conflict on List update | Same for List model |
| SSE endpoint auth | Unauthenticated → 401, unauthorized → 403 |
| SSE event delivery | Connect → publish event via hub → verify event arrives on stream |
| Full mutation flow | Create task → verify SSE event published → verify payload shape |
| Optimistic rollback | Server Action throws → verify useOptimistic reverts state |
| Reconnection state sync | Disconnect → reconnect → verify client fetches fresh state |

### Not Testing (Out of Scope)

- BroadcastChannel (browser API — mocked in unit tests)
- Multi-user E2E scenarios (would need Playwright with multiple browser contexts)
- Network partition scenarios

## 11. File Structure

### New Files

```
lib/realtime-config.ts                     # Timing constants
lib/realtime-types.ts                     # HubEvent, HubEventEnvelope types
lib/event-hub.ts                          # Pub/sub singleton
lib/event-hub.test.ts                     # EventHub unit tests
lib/errors.ts                             # ConflictError class
lib/sse-transport.ts                      # Low-level SSE transport class
lib/sse-transport.test.ts                 # Transport tests
lib/use-event-source.ts                   # SSE sync hook (wraps transport)
lib/use-event-source.test.ts              # SSE hook tests
lib/use-presence.ts                       # Presence hook
lib/use-presence.test.ts                  # Presence tests
lib/use-task-list.ts                      # Task list context + optimistic state
lib/use-task-list.test.ts                 # Task list tests
app/api/events/lists/[id]/route.ts        # SSE endpoint
components/presence-indicator.tsx          # Viewer avatars
components/presence-indicator.test.tsx     # Presence UI tests
components/connection-status.tsx           # Connection dot
components/connection-status.test.tsx      # Connection UI tests
components/conflict-dialog.tsx             # Version conflict modal
components/conflict-dialog.test.tsx        # Conflict dialog tests
```

### Modified Files

```
prisma/schema.prisma                      # Add version fields
actions/tasks.ts                          # Version check + event publishing
actions/lists.ts                          # Version check + event publishing
actions/members.ts                        # Event publishing (no version)
app/(app)/lists/[id]/page.tsx             # Add hooks, presence, connection status
components/task-item.tsx                  # useOptimistic, version prop
components/task-form.tsx                  # Optimistic insert
```
