-- Create FTS5 virtual table for task search
CREATE VIRTUAL TABLE task_fts USING fts5(
  task_id UNINDEXED,
  title,
  description
);

-- Trigger: sync on INSERT
CREATE TRIGGER task_fts_ai AFTER INSERT ON "Task" BEGIN
  INSERT INTO task_fts(task_id, title, description)
  VALUES (new.id, new.title, COALESCE(new.description, ''));
END;

-- Trigger: sync on UPDATE (title or description changed)
CREATE TRIGGER task_fts_au AFTER UPDATE OF title, description ON "Task" BEGIN
  DELETE FROM task_fts WHERE task_id = old.id;
  INSERT INTO task_fts(task_id, title, description)
  VALUES (new.id, new.title, COALESCE(new.description, ''));
END;

-- Trigger: sync on DELETE
CREATE TRIGGER task_fts_ad AFTER DELETE ON "Task" BEGIN
  DELETE FROM task_fts WHERE task_id = old.id;
END;

-- Backfill existing tasks
INSERT INTO task_fts(task_id, title, description)
SELECT id, title, COALESCE(description, '') FROM "Task";
