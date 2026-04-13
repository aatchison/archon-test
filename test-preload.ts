import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { mock } from "bun:test";

// Register happy-dom for component tests
GlobalRegistrator.register();

// Mock Prisma client to prevent initialization errors in test environment
mock.module("@prisma/client", () => ({
  PrismaClient: class MockPrismaClient {},
}));

// Mock lib/db to export a stub
mock.module("@/lib/db", () => ({
  db: {
    user: { findUnique: async () => null, create: async () => ({}) },
    list: { findMany: async () => [], findUnique: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) },
    task: { findMany: async () => [], findUnique: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) },
  },
}));

// Mock next/cache
mock.module("next/cache", () => ({
  revalidatePath: () => {},
}));

// Mock auth
mock.module("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "test-user" } }),
  signIn: async () => {},
  signOut: async () => {},
}));
