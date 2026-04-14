import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { mock } from "bun:test";

// Register happy-dom for component tests
GlobalRegistrator.register();

// Only mock Prisma for unit tests (not integration tests)
// Integration tests set INTEGRATION_TEST=1 to skip this
if (!process.env.INTEGRATION_TEST) {
  mock.module("@prisma/client", () => ({
    PrismaClient: class MockPrismaClient {},
  }));

  mock.module("@/lib/db", () => ({
    db: {
      user: { findUnique: async () => null, create: async () => ({}) },
      list: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({}),
        update: async () => ({}),
        delete: async () => ({}),
      },
      task: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async () => ({}),
        update: async () => ({}),
        delete: async () => ({}),
      },
    },
  }));

  mock.module("next/cache", () => ({
    revalidatePath: () => {},
  }));

  mock.module("@/lib/auth", () => ({
    auth: async () => ({ user: { id: "test-user" } }),
    getUserId: async () => "test-user",
    signIn: async () => {},
    signOut: async () => {},
  }));

  // Mock authorization helpers — default to allowing everything in unit tests
  mock.module("@/lib/authorization", () => ({
    isOwner: async () => true,
    canEdit: async () => true,
    canView: async () => true,
    requireOwner: async () => "test-user",
    requireEdit: async () => "test-user",
    requireView: async () => "test-user",
  }));

  const mockPublish = mock(() => {});
  mock.module("@/lib/event-hub", () => ({
    eventHub: {
      subscribe: () => () => {},
      publish: mockPublish,
      getPresence: () => [],
      getConnectionCount: () => 0,
      reset: () => {},
    },
    resetEventHub: () => {},
  }));

  mock.module("@/lib/errors", () => ({
    ConflictError: class ConflictError extends Error {
      currentVersion: number;
      constructor(msg: string, v: number) {
        super(msg);
        this.name = "ConflictError";
        this.currentVersion = v;
      }
    },
  }));

  mock.module("@/lib/realtime-config", () => ({
    REALTIME_CONFIG: {
      keepaliveIntervalMs: 30000,
      presenceTimeoutMs: 60000,
      reconnectBaseMs: 1000,
      reconnectMaxMs: 30000,
      deduplicationSetSize: 200,
      maxConnectionsPerUserPerList: 5,
    },
  }));
}
