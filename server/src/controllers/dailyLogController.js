import db from '../db/database.js';

// Submit daily text update or 'no work' blocker reason (Employee only)
export const submitDailyLog = (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const { log_date, work_text, has_worked, no_work_reason } = req.body;

        const effectiveDate = log_date || new Date().toISOString().split('T')[0];

        // Verify task exists and employee is assigned
        const task = db.prepare(`
            SELECT t.*, ta.user_id as is_assigned
            FROM tasks t
            LEFT JOIN task_assignees ta ON t.id = ta.task_id AND ta.user_id = ?
            WHERE t.id = ?
        `).get(userId, taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const isMember = db.prepare(`
            SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?
        `).get(task.project_id, userId);

        if (!task.is_assigned && !isMember && req.user.user_type !== 'pm' && req.user.user_type !== 'superuser') {
            return res.status(403).json({ error: 'You are not assigned to or a member of this task/project' });
        }

        if (!task.is_assigned && (isMember || req.user.user_type === 'pm' || req.user.user_type === 'superuser')) {
            db.prepare(`INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)`).run(taskId, userId);
        }

        const isWorked = has_worked === true || has_worked === 1 || has_worked === '1';

        if (!isWorked && (!no_work_reason || no_work_reason.trim() === '')) {
            return res.status(400).json({ error: 'A clear blocker explanation or reason is mandatory when marking "No Work Done"' });
        }

        if (isWorked && (!work_text || work_text.trim() === '')) {
            return res.status(400).json({ error: 'Please enter what was achieved today (notes, bullet points, or commits)' });
        }

        const upsertLog = db.prepare(`
            INSERT INTO daily_logs (task_id, user_id, log_date, work_text, has_worked, no_work_reason, manager_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(task_id, user_id, log_date) DO UPDATE SET
                work_text = excluded.work_text,
                has_worked = excluded.has_worked,
                no_work_reason = excluded.no_work_reason,
                created_at = CURRENT_TIMESTAMP
        `);

        upsertLog.run(
            taskId,
            userId,
            effectiveDate,
            isWorked ? work_text.trim() : null,
            isWorked ? 1 : 0,
            !isWorked ? no_work_reason.trim() : null,
            task.manager_id
        );

        const savedLog = db.prepare(`
            SELECT dl.*, u.full_name, u.role_title, t.title as task_title
            FROM daily_logs dl
            JOIN users u ON dl.user_id = u.id
            JOIN tasks t ON dl.task_id = t.id
            WHERE dl.task_id = ? AND dl.user_id = ? AND dl.log_date = ?
        `).get(taskId, userId, effectiveDate);

        res.json({
            message: isWorked ? 'Daily progress recorded successfully! 🚀' : 'Blocker reason logged for PM review. ⚠️',
            log: savedLog
        });
    } catch (err) {
        console.error('Submit daily log error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Retrieve Daily Logs history for the authenticated employee (strictly scoped to req.user.id)
export const getMyDailyLogs = (req, res) => {
    try {
        const userId = req.user.id;
        const { projectId } = req.query;

        let query = `
            SELECT 
                dl.*,
                t.title as task_title,
                t.status as task_status,
                t.start_date as task_start_date,
                t.end_date as task_end_date,
                p.id as project_id,
                p.title as project_title,
                u.full_name,
                u.role_title
            FROM daily_logs dl
            JOIN tasks t ON dl.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            JOIN users u ON dl.user_id = u.id
            WHERE dl.user_id = ?
        `;
        const params = [userId];

        if (projectId && projectId !== 'all') {
            query += ` AND p.id = ?`;
            params.push(projectId);
        }

        query += ` ORDER BY dl.log_date DESC, dl.created_at DESC`;

        const logs = db.prepare(query).all(...params);

        // Calculate employee-specific summary metrics
        let totalLogged = 0;
        let totalProductive = 0;
        let totalBlockers = 0;

        logs.forEach(l => {
            totalLogged++;
            if (l.has_worked === 1) {
                totalProductive++;
            } else {
                totalBlockers++;
            }
        });

        res.json({
            logs,
            metrics: {
                totalLogged,
                totalProductive,
                totalBlockers,
                productivityRate: totalLogged > 0 ? Math.round((totalProductive / totalLogged) * 100) : 100
            }
        });
    } catch (err) {
        console.error('Get my daily logs error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Retrieve Date Grid Matrix (Calendar Heatmap) for PM Dashboard
export const getProjectMatrix = (req, res) => {
    try {
        const projectId = req.params.id;
        const { date_from, date_to } = req.query;

        // Fetch project and its tasks
        let project = db.prepare('SELECT * FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
        if (!project && (req.user.user_type === 'superuser' || req.user.user_type === 'pm')) {
            project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        }
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const tasks = db.prepare(`
            SELECT t.* 
            FROM tasks t
            WHERE t.project_id = ?
            ORDER BY t.start_date ASC
        `).all(projectId);

        // Determine date range for matrix columns
        let startDate = date_from;
        let endDate = date_to;

        if (!startDate || !endDate) {
            // Find min start_date and max end_date from tasks or default to current 10-day window
            if (tasks.length > 0) {
                const dates = tasks.flatMap(t => [t.start_date, t.end_date]).sort();
                startDate = startDate || dates[0] || '2026-08-27';
                endDate = endDate || dates[dates.length - 1] || '2026-09-06';
            } else {
                startDate = startDate || '2026-08-27';
                endDate = endDate || '2026-09-06';
            }
        }

        if (startDate > endDate) {
            const temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        // Generate full array of calendar days between startDate and endDate
        const dayList = [];
        const curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
            dayList.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        // Build matrix rows: each row represents a unique Contributor added in the workspace of this project
        const projectMembers = db.prepare(`
            SELECT u.id, u.full_name, u.role_title, u.avatar_url, u.email
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
        `).all(projectId);

        const taskAssignees = db.prepare(`
            SELECT DISTINCT u.id, u.full_name, u.role_title, u.avatar_url, u.email
            FROM task_assignees ta
            JOIN tasks t ON ta.task_id = t.id
            JOIN users u ON ta.user_id = u.id
            WHERE t.project_id = ?
        `).all(projectId);

        const memberMap = new Map();
        [...projectMembers, ...taskAssignees].forEach(emp => {
            if (emp && emp.id && !memberMap.has(emp.id)) {
                memberMap.set(emp.id, emp);
            }
        });

        const contributors = Array.from(memberMap.values()).sort((a, b) => 
            (a.full_name || '').localeCompare(b.full_name || '')
        );

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const rows = contributors.map(emp => {
            // All tasks allocated to this contributor in this project
            const empTasks = db.prepare(`
                SELECT t.*
                FROM tasks t
                JOIN task_assignees ta ON ta.task_id = t.id
                WHERE t.project_id = ? AND ta.user_id = ?
                ORDER BY t.start_date ASC, t.id ASC
            `).all(projectId, emp.id);

            // All daily logs submitted by this contributor for tasks in this project
            const empLogs = db.prepare(`
                SELECT dl.*, t.title as task_title, t.description as task_description,
                       t.start_date as task_start_date, t.end_date as task_end_date, t.status as task_status
                FROM daily_logs dl
                JOIN tasks t ON dl.task_id = t.id
                WHERE t.project_id = ? AND dl.user_id = ?
                ORDER BY dl.created_at DESC
            `).all(projectId, emp.id);

            const logByDate = new Map();
            empLogs.forEach(l => {
                const existing = logByDate.get(l.log_date);
                if (!existing || (existing.has_worked === 0 && l.has_worked === 1)) {
                    logByDate.set(l.log_date, l);
                }
            });

            const primaryTask = empTasks[0] || {
                id: `unallocated-${emp.id}`,
                project_id: project.id,
                project_title: project.title,
                title: 'Team Member (Ready for Deliverable Assignment)',
                description: `${emp.full_name} is an active contributor on ${project.title}. Provision a specific deliverable in Project Dashboard to schedule daily logs.`,
                start_date: startDate,
                end_date: endDate,
                status: 'in_progress'
            };

            const dayStatuses = dayList.map(dateStr => {
                const log = logByDate.get(dateStr);

                if (log) {
                    const taskInfo = {
                        id: log.task_id,
                        project_id: project.id,
                        project_title: project.title,
                        title: log.task_title,
                        description: log.task_description,
                        start_date: log.task_start_date,
                        end_date: log.task_end_date,
                        status: log.task_status
                    };

                    if (log.has_worked === 1) {
                        return {
                            date: dateStr,
                            status: 'logged',
                            label: 'Logged',
                            text: log.work_text,
                            task: taskInfo,
                            log: log
                        };
                    } else {
                        return {
                            date: dateStr,
                            status: 'no_work',
                            label: 'No Work',
                            reason: log.no_work_reason,
                            task: taskInfo,
                            log: log
                        };
                    }
                } else {
                    // Check if contributor has any assigned active deliverable for this date
                    const activeTask = empTasks.find(t => dateStr >= t.start_date && dateStr <= t.end_date) || (empTasks.length > 0 ? empTasks[0] : null);

                    if (activeTask) {
                        const taskInfo = {
                            id: activeTask.id,
                            project_id: project.id,
                            project_title: project.title,
                            title: activeTask.title,
                            description: activeTask.description,
                            start_date: activeTask.start_date,
                            end_date: activeTask.end_date,
                            status: activeTask.status
                        };

                        if (dateStr >= todayStr) {
                            return {
                                date: dateStr,
                                status: 'pending',
                                label: 'Pending',
                                task: taskInfo,
                                log: null
                            };
                        } else {
                            return {
                                date: dateStr,
                                status: 'missed',
                                label: 'Missed',
                                task: taskInfo,
                                log: null
                            };
                        }
                    } else {
                        return {
                            date: dateStr,
                            status: 'na',
                            label: 'N/A',
                            task: primaryTask,
                            log: null
                        };
                    }
                }
            });

            return {
                employee: emp,
                task: primaryTask,
                tasks: empTasks,
                days: dayStatuses
            };
        });

        res.json({
            project,
            dates: dayList,
            rows
        });
    } catch (err) {
        console.error('getProjectMatrix error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Global Fleet Matrix for all projects combined
export const getFleetMatrix = (req, res) => {
    try {
        let startDate = req.query.date_from || '2026-08-27';
        let endDate = req.query.date_to || '2026-09-06';

        if (startDate > endDate) {
            const temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        // Generate full array of calendar days
        const dayList = [];
        const curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
            dayList.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        let tasksQuery = `
            SELECT t.*, p.title as project_title, p.id as project_id
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
        `;
        const queryParams = [];
        if (req.user.user_type !== 'superuser') {
            tasksQuery += ' WHERE p.manager_id = ?';
            queryParams.push(req.user.id);
        }
        tasksQuery += ' ORDER BY p.title ASC, t.start_date ASC';

        const tasks = db.prepare(tasksQuery).all(...queryParams);

        const rows = [];

        tasks.forEach(task => {
            const assignees = db.prepare(`
                SELECT u.id, u.full_name, u.role_title, u.avatar_url, u.email
                FROM task_assignees ta
                JOIN users u ON ta.user_id = u.id
                WHERE ta.task_id = ?
            `).all(task.id);

            assignees.forEach(emp => {
                const logs = db.prepare(`
                    SELECT log_date, work_text, has_worked, no_work_reason
                    FROM daily_logs
                    WHERE task_id = ? AND user_id = ?
                `).all(task.id, emp.id);

                const logMap = {};
                logs.forEach(l => { logMap[l.log_date] = l; });

                const dayStatuses = dayList.map(dateStr => {
                    const isWithinTaskWindow = dateStr >= task.start_date && dateStr <= task.end_date;
                    const log = logMap[dateStr];

                    if (!isWithinTaskWindow) return { date: dateStr, status: 'na', label: 'N/A', log: null };
                    if (log) {
                        return log.has_worked === 1 
                            ? { date: dateStr, status: 'logged', label: 'Logged', text: log.work_text, log }
                            : { date: dateStr, status: 'no_work', label: 'No Work', reason: log.no_work_reason, log };
                    }
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    return {
                        date: dateStr,
                        status: dateStr >= todayStr ? 'pending' : 'missed',
                        label: dateStr >= todayStr ? 'Pending' : 'Missed',
                        log: null
                    };
                });

                rows.push({
                    employee: emp,
                    task: {
                        id: task.id,
                        project_id: task.project_id,
                        project_title: task.project_title,
                        title: task.title,
                        description: task.description,
                        start_date: task.start_date,
                        end_date: task.end_date,
                        status: task.status
                    },
                    days: dayStatuses
                });
            });
        });

        // Compute summary stats scoped to this PM's data only
        let totalLogged = 0, totalBlockers = 0, totalPending = 0, totalMissed = 0;
        rows.forEach(row => {
            row.days.forEach(d => {
                if (d.status === 'logged')   totalLogged++;
                else if (d.status === 'no_work') totalBlockers++;
                else if (d.status === 'pending') totalPending++;
                else if (d.status === 'missed')  totalMissed++;
            });
        });
        const totalTracked = totalLogged + totalBlockers + totalMissed;
        const compliancePct = totalTracked > 0 ? Math.round((totalLogged / totalTracked) * 100) : 0;

        res.json({ dates: dayList, rows, summary: { totalLogged, totalBlockers, totalPending, totalMissed, compliancePct } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Retrieve active / unresolved blockers for PM (Last 24-48h or active impediments)
export const getActiveBlockers = (req, res) => {
    try {
        const pmId = req.user.id;
        let query = `
            SELECT dl.*, 
                   u.full_name as employee_name, 
                   u.avatar_url, 
                   u.role_title,
                   t.title as task_title, 
                   t.status as task_status, 
                   p.title as project_title, 
                   p.id as project_id
            FROM daily_logs dl
            JOIN tasks t ON dl.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            JOIN users u ON dl.user_id = u.id
            WHERE dl.has_worked = 0
        `;
        const params = [];
        if (req.user.user_type !== 'superuser') {
            query += ` AND (p.manager_id = ? OR dl.manager_id = ? OR u.manager_id = ?)`;
            params.push(pmId, pmId, pmId);
        }
        query += ` ORDER BY dl.created_at DESC, dl.log_date DESC`;

        const allBlockers = db.prepare(query).all(...params);

        const isDone = (status) => ['done', 'completed', 'archived', 'closed', 'remove'].includes(String(status || '').trim().toLowerCase());

        const unresolved = allBlockers.filter(b => {
            if (isDone(b.task_status)) return false;

            // Check if there is any subsequent log for this task_id and user_id where has_worked = 1
            const newerLog = db.prepare(`
                SELECT 1 FROM daily_logs 
                WHERE task_id = ? AND user_id = ? AND has_worked = 1 AND (log_date > ? OR (log_date = ? AND created_at > ?))
            `).get(b.task_id, b.user_id, b.log_date, b.log_date, b.created_at);

            return !newerLog;
        });

        res.json({
            count: unresolved.length,
            blockers: unresolved
        });
    } catch (err) {
        console.error('getActiveBlockers error:', err);
        res.status(500).json({ error: err.message });
    }
};

