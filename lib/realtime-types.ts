export const EVENT_TYPES = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  LIST_UPDATED: "list:updated",
  MEMBER_ADDED: "member:added",
  MEMBER_REMOVED: "member:removed",
  PRESENCE_CHANGED: "presence:changed",
} as const;

export type HubEvent =
  | { type: typeof EVENT_TYPES.TASK_CREATED; data: TaskPayload }
  | { type: typeof EVENT_TYPES.TASK_UPDATED; data: TaskPayload }
  | { type: typeof EVENT_TYPES.TASK_DELETED; data: TaskPayload }
  | { type: typeof EVENT_TYPES.LIST_UPDATED; data: ListPayload }
  | { type: typeof EVENT_TYPES.MEMBER_ADDED; data: MemberAddedPayload }
  | { type: typeof EVENT_TYPES.MEMBER_REMOVED; data: MemberRemovedPayload }
  | { type: typeof EVENT_TYPES.PRESENCE_CHANGED; data: PresencePayload };

export interface TaskPayload {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: string;
  dueDate: string | null;
  listId: string;
  version: number;
}

export interface ListPayload {
  id: string;
  name: string;
  version: number;
}

export interface MemberAddedPayload {
  userId: string;
  userName: string;
  role: string;
  listId: string;
}

export interface MemberRemovedPayload {
  userId: string;
  listId: string;
}

export interface PresencePayload {
  viewers: { userId: string; userName: string }[];
}

export interface HubEventEnvelope {
  id: string;
  userId: string;
  version: number;
  timestamp: number;
  event: HubEvent;
}
