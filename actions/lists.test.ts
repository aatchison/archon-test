import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createList, renameList, deleteList } from './lists';

const mockAuth = vi.fn();
const mockDb = {
  list: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
};
const mockRevalidatePath = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));
vi.mock('@/lib/db', () => ({
  db: mockDb,
}));
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

describe('List Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockReturnValue({ user: { id: 'user-1' } });
  });

  describe('createList', () => {
    it('throws if name is empty', async () => {
      await expect(createList('')).rejects.toThrow('Name is required');
    });

    it('creates and returns a list', async () => {
      const mockList = { id: 'list-1', name: 'My List', ownerId: 'user-1' };
      mockDb.list.create.mockResolvedValue(mockList);

      const result = await createList('My List');
      expect(result).toEqual(mockList);
      expect(mockDb.list.create).toHaveBeenCalledWith({
        data: { name: 'My List', ownerId: 'user-1' },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/lists');
    });
  });

  describe('renameList', () => {
    it('throws Not Found if wrong owner', async () => {
      mockDb.list.findUnique.mockResolvedValue({ id: 'list-1', ownerId: 'user-2' });
      await expect(renameList('list-1', 'New Name')).rejects.toThrow('Not found');
    });

    it('renames the list', async () => {
      mockDb.list.findUnique.mockResolvedValue({ id: 'list-1', ownerId: 'user-1' });
      const mockList = { id: 'list-1', name: 'New Name', ownerId: 'user-1' };
      mockDb.list.update.mockResolvedValue(mockList);

      const result = await renameList('list-1', 'New Name');
      expect(result).toEqual(mockList);
      expect(mockDb.list.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: { name: 'New Name' },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/lists');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/lists/list-1');
    });
  });

  describe('deleteList', () => {
    it('throws Not Found if wrong owner', async () => {
      mockDb.list.findUnique.mockResolvedValue({ id: 'list-1', ownerId: 'user-2' });
      await expect(deleteList('list-1')).rejects.toThrow('Not found');
    });

    it('deletes the list', async () => {
      mockDb.list.findUnique.mockResolvedValue({ id: 'list-1', ownerId: 'user-1' });
      mockDb.list.delete.mockResolvedValue({ id: 'list-1' });

      await deleteList('list-1');
      expect(mockDb.list.delete).toHaveBeenCalledWith({ where: { id: 'list-1' } });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/lists');
    });
  });
});
