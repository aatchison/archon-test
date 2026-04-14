export type HubEvent =
  | { type: "task:created"; data: TaskPayload }
  | { type: "task:updated"; data: TaskPayload }
  | { type: "task:deleted"; data: TaskPayload }
  | { type: "list:updated"; data: ListPayload }
  | { type: "member:added"; data: MemberAddedPayload }
  | { type: "member:removed"; data: MemberRemovedPayload }
  | { type: "presence:changed"; data: PresencePayload };

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
