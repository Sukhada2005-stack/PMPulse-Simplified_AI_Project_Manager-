import db from '../db/database.js';

// Ensure table exists
db.exec(`
CREATE TABLE IF NOT EXISTS project_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_project_messages_project ON project_messages(project_id, created_at);
`);

// Get all messages for a specific project
export const getProjectMessages = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        if (!projectId) {
            return res.status(400).json({ error: 'Valid Project ID is required' });
        }

        const project = db.prepare('SELECT id, title, description, status FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const messages = db.prepare(`
            SELECT 
                pm.id,
                pm.project_id,
                pm.user_id,
                pm.message,
                pm.message_type,
                pm.metadata,
                pm.created_at,
                u.full_name as sender_name,
                u.role_title as sender_role,
                u.avatar_url as sender_avatar,
                u.user_type as sender_type,
                u.email as sender_email
            FROM project_messages pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY pm.created_at ASC, pm.id ASC
        `).all(projectId);

        // Parse metadata if present
        const parsedMessages = messages.map(m => {
            let meta = null;
            if (m.metadata) {
                try {
                    meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
                } catch {
                    meta = null;
                }
            }
            return {
                ...m,
                metadata: meta
            };
        });

        // Also fetch project members for context
        const members = db.prepare(`
            SELECT u.id, u.full_name, u.role_title, u.avatar_url, u.user_type
            FROM project_members pmem
            JOIN users u ON pmem.user_id = u.id
            WHERE pmem.project_id = ?
        `).all(projectId);

        res.json({
            project,
            members,
            messages: parsedMessages
        });
    } catch (err) {
        console.error('getProjectMessages error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Send a new message in a project chat
export const sendProjectMessage = (req, res) => {
    try {
        const projectId = parseInt(req.params.id, 10);
        const { message, message_type = 'text', metadata = null } = req.body;
        const userId = req.user.id;

        if (!projectId) {
            return res.status(400).json({ error: 'Valid Project ID is required' });
        }

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Message content cannot be empty' });
        }

        const project = db.prepare('SELECT id, title FROM projects WHERE id = ?').get(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Stringify metadata if object
        const metaStr = metadata ? (typeof metadata === 'object' ? JSON.stringify(metadata) : metadata) : null;

        const insert = db.prepare(`
            INSERT INTO project_messages (project_id, user_id, message, message_type, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `);

        const result = insert.run(projectId, userId, message.trim(), message_type, metaStr);
        const messageId = result.lastInsertRowid;

        const createdMessage = db.prepare(`
            SELECT 
                pm.id,
                pm.project_id,
                pm.user_id,
                pm.message,
                pm.message_type,
                pm.metadata,
                pm.created_at,
                u.full_name as sender_name,
                u.role_title as sender_role,
                u.avatar_url as sender_avatar,
                u.user_type as sender_type,
                u.email as sender_email
            FROM project_messages pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.id = ?
        `).get(messageId);

        let parsedMeta = null;
        if (createdMessage.metadata) {
            try {
                parsedMeta = JSON.parse(createdMessage.metadata);
            } catch {
                parsedMeta = null;
            }
        }

        res.status(201).json({
            message: {
                ...createdMessage,
                metadata: parsedMeta
            }
        });
    } catch (err) {
        console.error('sendProjectMessage error:', err);
        res.status(500).json({ error: err.message });
    }
};
