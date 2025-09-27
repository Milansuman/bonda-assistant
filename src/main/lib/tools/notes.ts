import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('bonda-assistant.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    name TEXT PRIMARY KEY,
    content TEXT
  )
`);

export const createNote = (name: string, content: string) => {
    const stmt = db.prepare('INSERT INTO notes (name, content) VALUES (?, ?)');
    stmt.run(name, content);
    return true;
};

export const getNote = (name: string) => {
    const stmt = db.prepare('SELECT content FROM notes WHERE name = ?');
    const result = stmt.get(name);
    return result ? result.content : null;
};

export const getAllNotes = () => {
    const stmt = db.prepare('SELECT name, content FROM notes');
    const result = stmt.all();
    return result.map((row: Record<string, unknown>) =>
        `${row['name']}: ${row['content']}`
    ).join('\n');
};

export const deleteNote = (name: string) => {
    const stmt = db.prepare('DELETE FROM notes WHERE name = ?');
    stmt.run(name);
    return true;
};