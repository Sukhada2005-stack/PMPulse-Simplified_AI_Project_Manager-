import db from '../db/database.js';

/**
 * Server-side Gemini API Caller
 * Uses process.env.GEMINI_API_KEY with 25s timeout and graceful fallbacks.
 * The API key is NEVER exposed to the client.
 */
export const callGeminiAPI = async (systemInstruction, contextData, userMessage, history = []) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        return "⚠️ Gemini API key is not configured on the server. Please set GEMINI_API_KEY in server/.env.";
    }

    const fullSystemInstruction = `${systemInstruction}\n\n=== VERIFIED GROUNDING DATA CONTEXT (READ-ONLY) ===\n${JSON.stringify(contextData, null, 2)}`;

    // Build multi-turn contents array
    const contents = [];

    // Add sanitized history (up to last 6 turns)
    if (Array.isArray(history) && history.length > 0) {
        const recentHistory = history.slice(-6);
        for (const item of recentHistory) {
            if (item && item.text && (item.role === 'user' || item.role === 'model')) {
                // Ensure no two consecutive turns have the same role
                const lastRole = contents.length > 0 ? contents[contents.length - 1].role : null;
                const currentRole = item.role === 'model' ? 'model' : 'user';
                if (currentRole !== lastRole) {
                    contents.push({
                        role: currentRole,
                        parts: [{ text: String(item.text).slice(0, 2000) }]
                    });
                }
            }
        }
    }

    // Ensure history doesn't end with 'user' before adding current user prompt
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        contents.pop();
    }

    // Append latest user message
    contents.push({
        role: 'user',
        parts: [{ text: String(userMessage || '').trim().slice(0, 2000) }]
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
        const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: fullSystemInstruction }]
                },
                contents,
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 1200
                }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            console.error(`[Copilot Gemini API Error] ${response.status}: ${errBody.slice(0, 300)}`);
            if (response.status === 429) {
                return "⚠️ The AI service is currently experiencing high demand. Please wait a moment and try again.";
            }
            return `⚠️ Unable to generate AI response (Status ${response.status}). Please try again shortly.`;
        }

        const resData = await response.json();
        const candidate = resData?.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text;

        if (rawText && typeof rawText === 'string') {
            return rawText.trim();
        }

        return "I processed your request, but was unable to produce a response from the available data.";
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            console.error('[Copilot Gemini API] Request timed out after 25s');
            return "⚠️ The AI request timed out. Please try asking a more specific question.";
        }
        console.error('[Copilot Gemini API] Error:', err.message);
        return "⚠️ An unexpected network error occurred while communicating with the AI service. Please try again.";
    }
};

/**
 * 1. Employee Dashboard Copilot Handler
 * Strictly scoped to authenticated employee (req.user.id)
 */
export const handleEmployeeCopilot = async (req, res) => {
    try {
        if (!req.user || req.user.user_type !== 'employee') {
            return res.status(403).json({ error: 'Access restricted to Employee role only' });
        }

        const userId = req.user.id;
        const { message, history } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // 1. Employee Profile
        const profile = db.prepare(`
            SELECT id, full_name, email, role_title, status
            FROM users
            WHERE id = ?
        `).get(userId) || { id: userId, full_name: 'Employee', role_title: 'Contributor' };

        // 2. Assigned Tasks
        const tasks = db.prepare(`
            SELECT t.id, t.title, t.description, t.start_date, t.end_date, t.status, t.priority, t.due_date, t.task_key,
                   p.id as project_id, p.title as project_title, p.status as project_status
            FROM task_assignees ta
            JOIN tasks t ON ta.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            WHERE ta.user_id = ?
            ORDER BY t.end_date ASC
            LIMIT 60
        `).all(userId);

        // 3. Assigned Projects (Basic Info)
        const projects = db.prepare(`
            SELECT p.id, p.title, p.description, p.status, p.priority, p.category, p.start_date, p.end_date
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ?
            ORDER BY p.created_at DESC
        `).all(userId);

        // 4. Personal Daily Logs (Recent 30)
        const dailyLogs = db.prepare(`
            SELECT dl.log_date, dl.has_worked, dl.work_text, dl.no_work_reason, dl.created_at,
                   t.title as task_title, p.title as project_title
            FROM daily_logs dl
            JOIN tasks t ON dl.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            WHERE dl.user_id = ?
            ORDER BY dl.log_date DESC
            LIMIT 30
        `).all(userId);

        // 5. Active Warnings
        const warnings = db.prepare(`
            SELECT w.message, w.created_at, p.title as project_title
            FROM employee_warnings w
            JOIN projects p ON w.project_id = p.id
            WHERE w.user_id = ?
            ORDER BY w.created_at DESC
        `).all(userId);

        const contextData = {
            current_date: new Date().toISOString().split('T')[0],
            employee_profile: profile,
            assigned_projects: projects,
            assigned_tasks: tasks,
            recent_daily_logs: dailyLogs,
            active_warnings: warnings
        };

        const systemInstruction = `You are PulsePM Employee Copilot, an AI assistant dedicated exclusively to helping the authenticated team member: ${profile.full_name} (${profile.role_title}).
You have access to their assigned deliverables, work logs, project deadlines, and personal task status.

CRITICAL DATA BOUNDARY & BEHAVIOR RULES:
1. You can ONLY discuss ${profile.full_name}'s own assigned deliverables, their own daily logs, and basic info of projects they are members of.
2. You have NO visibility into other team members' tasks, performance, or private logs. If asked about other team members, other PM projects, or superuser matters, politely decline and clarify your scope.
3. Answer inquiries accurately, concisely, and helpfully based strictly on the provided verified data.
4. Format your responses with clean Markdown (use bullet points, bold key terms, short paragraphs).
5. If the user asks about deadlines, overdue tasks, or blockers, highlight them clearly with actionable guidance.`;

        const reply = await callGeminiAPI(systemInstruction, contextData, message, history);

        res.json({
            success: true,
            reply
        });
    } catch (err) {
        console.error('[Employee Copilot Error]:', err);
        res.status(500).json({ error: 'Internal error processing Copilot inquiry' });
    }
};

/**
 * 2. PM Dashboard Copilot Handler
 * Strictly scoped to projects and employees under the authenticated PM (req.user.id)
 */
export const handlePMCopilot = async (req, res) => {
    try {
        if (!req.user || req.user.user_type !== 'pm') {
            return res.status(403).json({ error: 'Access restricted to Project Manager role only' });
        }

        const pmId = req.user.id;
        const { message, history } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // 1. PM Profile
        const profile = db.prepare(`
            SELECT id, full_name, email, role_title
            FROM users
            WHERE id = ?
        `).get(pmId) || { id: pmId, full_name: 'Project Manager', role_title: 'Project Manager' };

        // 2. Managed Projects
        const projects = db.prepare(`
            SELECT p.id, p.title, p.description, p.status, p.priority, p.category, p.start_date, p.end_date,
                   (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND LOWER(TRIM(t.status)) IN ('in progress', 'in_progress')) as active_task_count
            FROM projects p
            WHERE p.manager_id = ?
            ORDER BY p.created_at DESC
        `).all(pmId);

        // 3. Managed Project Tasks (Active & Recent)
        const tasks = db.prepare(`
            SELECT t.id, t.title, t.status, t.priority, t.type, t.due_date, t.start_date, t.end_date, t.task_key,
                   p.id as project_id, p.title as project_title,
                   (SELECT GROUP_CONCAT(u.full_name, ', ') FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id) as assignees
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE p.manager_id = ?
            ORDER BY t.created_at DESC
            LIMIT 100
        `).all(pmId);

        // 4. Team Members under this PM
        const teamMembers = db.prepare(`
            SELECT u.id, u.email, u.full_name, u.role_title, u.status,
                   (SELECT COUNT(*) FROM project_members pm JOIN projects p ON pm.project_id = p.id WHERE pm.user_id = u.id AND p.manager_id = ?) as project_count,
                   (SELECT COUNT(*) FROM task_assignees ta JOIN tasks t ON ta.task_id = t.id JOIN projects p2 ON t.project_id = p2.id WHERE ta.user_id = u.id AND p2.manager_id = ? AND LOWER(TRIM(t.status)) NOT IN ('completed', 'done', 'archived', 'closed', 'remove')) as active_task_count
            FROM users u
            WHERE u.manager_id = ? AND u.user_type = 'employee'
            ORDER BY u.full_name ASC
        `).all(pmId, pmId, pmId);

        // 5. Team Daily Logs (Recent 50 from this PM's projects)
        const teamLogs = db.prepare(`
            SELECT dl.log_date, dl.has_worked, dl.work_text, dl.no_work_reason, dl.created_at,
                   u.full_name as employee_name, t.title as task_title, p.title as project_title
            FROM daily_logs dl
            JOIN users u ON dl.user_id = u.id
            JOIN tasks t ON dl.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            WHERE p.manager_id = ?
            ORDER BY dl.log_date DESC
            LIMIT 50
        `).all(pmId);

        const contextData = {
            current_date: new Date().toISOString().split('T')[0],
            pm_profile: profile,
            managed_projects: projects,
            managed_tasks: tasks,
            team_members: teamMembers,
            recent_team_daily_logs: teamLogs
        };

        const systemInstruction = `You are PulsePM Project Manager Copilot, an AI management assistant for Project Manager: ${profile.full_name}.
You have visibility into projects, sprint tasks, team members, daily logs, blockers, and deliverables under this PM's management.

CRITICAL DATA BOUNDARY & BEHAVIOR RULES:
1. You can ONLY answer about projects, employees, tasks, and daily logs under ${profile.full_name}'s management.
2. You have NO visibility into other Project Managers' teams or workspaces, nor superuser administrative data. If asked about other PMs or superuser fleet operations, politely decline.
3. Answer inquiries about project health, sprint status, workload distribution, blockers, and deliverables accurately based strictly on the verified data provided.
4. Format your responses with clean Markdown (use bullet points, bold headers, concise structured summaries).
5. When asked about blockers or workload bottlenecks, highlight the affected employee, task, and project clearly.`;

        const reply = await callGeminiAPI(systemInstruction, contextData, message, history);

        res.json({
            success: true,
            reply
        });
    } catch (err) {
        console.error('[PM Copilot Error]:', err);
        res.status(500).json({ error: 'Internal error processing Copilot inquiry' });
    }
};

/**
 * 3. Superuser Dashboard Copilot Handler
 * Scoped to organization-wide PM directory, fleet projects, and high-level allocation
 */
export const handleSuperuserCopilot = async (req, res) => {
    try {
        if (!req.user || req.user.user_type !== 'superuser') {
            return res.status(403).json({ error: 'Access restricted to Superuser role only' });
        }

        const superId = req.user.id;
        const { message, history } = req.body;

        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        // 1. Superuser Profile
        const profile = db.prepare(`
            SELECT id, full_name, email, role_title
            FROM users
            WHERE id = ?
        `).get(superId) || { id: superId, full_name: 'Superuser Admin', role_title: 'Superuser' };

        // 2. All Project Managers
        const pms = db.prepare(`
            SELECT u.id, u.full_name, u.email, u.role_title, u.status, u.created_at,
                   (SELECT COUNT(*) FROM projects p WHERE p.manager_id = u.id) as project_count,
                   (SELECT COUNT(*) FROM users e WHERE e.manager_id = u.id AND e.user_type = 'employee') as employee_count
            FROM users u
            WHERE u.user_type = 'pm'
            ORDER BY u.full_name ASC
        `).all();

        // 3. Fleet Projects Overview
        const fleetProjects = db.prepare(`
            SELECT p.id, p.title, p.status, p.priority, p.category, p.start_date, p.end_date,
                   u.full_name as manager_name,
                   (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as total_tasks,
                   (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND LOWER(TRIM(t.status)) IN ('in progress', 'in_progress')) as active_tasks
            FROM projects p
            LEFT JOIN users u ON p.manager_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50
        `).all();

        // 4. Aggregate Fleet Telemetry
        const fleetStats = db.prepare(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE user_type = 'pm') as total_pms,
                (SELECT COUNT(*) FROM users WHERE user_type = 'employee') as total_employees,
                (SELECT COUNT(*) FROM projects) as total_projects,
                (SELECT COUNT(*) FROM tasks) as total_tasks,
                (SELECT COUNT(*) FROM daily_logs WHERE log_date >= date('now', '-7 days')) as logs_last_7_days
        `).get();

        const contextData = {
            current_date: new Date().toISOString().split('T')[0],
            superuser_profile: profile,
            fleet_metrics: fleetStats,
            project_managers: pms,
            fleet_projects: fleetProjects
        };

        const systemInstruction = `You are PulsePM Executive Fleet Copilot, an executive AI assistant for the PulsePM Superuser Administrator: ${profile.full_name}.
You have high-level visibility across all Project Managers, active project portfolios, workforce allocations, and cross-project health.

CRITICAL DATA BOUNDARY & BEHAVIOR RULES:
1. Provide high-level executive insights, portfolio distribution, PM workload allocation, and fleet-level operational trends.
2. Never disclose system passwords, cryptographic secrets, or internal auth tokens.
3. Answer user inquiries accurately and concisely based strictly on the verified organizational data provided.
4. Format your responses with clean Markdown (use bullet points, executive tables/lists, concise strategic summaries).`;

        const reply = await callGeminiAPI(systemInstruction, contextData, message, history);

        res.json({
            success: true,
            reply
        });
    } catch (err) {
        console.error('[Superuser Copilot Error]:', err);
        res.status(500).json({ error: 'Internal error processing Copilot inquiry' });
    }
};
