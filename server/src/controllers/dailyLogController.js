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

        if (!task.is_assigned && req.user.user_type !== 'pm') {
            return res.status(403).json({ error: 'You are not assigned to this task' });
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

// Retrieve Date Grid Matrix (Calendar Heatmap) for PM Dashboard
export const getProjectMatrix = (req, res) => {
    try {
        const projectId = req.params.id;
        const { date_from, date_to } = req.query;

        // Fetch project and its tasks
        const project = db.prepare('SELECT * FROM projects WHERE id = ? AND manager_id = ?').get(projectId, req.user.id);
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
                startDate = '2026-08-27';
                endDate = '2026-09-06';
            }
        }

        // Generate full array of calendar days between startDate and endDate
        const dayList = [];
        const curr = new Date(startDate);
        const end = new Date(endDate);
        while (curr <= end) {
            dayList.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        // Build matrix rows: each row represents a combination of (Employee + Task)
        const rows = [];

        tasks.forEach(task => {
            const assignees = db.prepare(`
                SELECT u.id, u.full_name, u.role_title, u.avatar_url, u.email
                FROM task_assignees ta
                JOIN users u ON ta.user_id = u.id
                WHERE ta.task_id = ?
            `).all(task.id);

            assignees.forEach(emp => {
                // Fetch all daily logs for this employee and task
                const logs = db.prepare(`
                    SELECT log_date, work_text, has_worked, no_work_reason, created_at
                    FROM daily_logs
                    WHERE task_id = ? AND user_id = ?
                `).all(task.id, emp.id);

                const logMap = {};
                logs.forEach(l => {
                    logMap[l.log_date] = l;
                });

                const dayStatuses = dayList.map(dateStr => {
                    const isWithinTaskWindow = dateStr >= task.start_date && dateStr <= task.end_date;
                    const log = logMap[dateStr];

                    if (!isWithinTaskWindow) {
                        return {
                            date: dateStr,
                            status: 'na', // Not applicable / outside task dates
                            label: 'N/A',
                            log: null
                        };
                    }

                    if (log) {
                        if (log.has_worked === 1) {
                            return {
                                date: dateStr,
                                status: 'logged', // 🟢 Green
                                label: 'Logged',
                                text: log.work_text,
                                log: log
                            };
                        } else {
                            return {
                                date: dateStr,
                                status: 'no_work', // 🔴 Amber/Red
                                label: 'No Work',
                                reason: log.no_work_reason,
                                log: log
                            };
                        }
                    } else {
                        // Pending or missed
                        const todayStr = new Date().toISOString().split('T')[0];
                        if (dateStr > todayStr) {
                            return {
                                date: dateStr,
                                status: 'pending', // ⚪ Future pending
                                label: 'Pending',
                                log: null
                            };
                        } else {
                            return {
                                date: dateStr,
                                status: 'missed', // ⚪ Past missed
                                label: 'Missed',
                                log: null
                            };
                        }
                    }
                });

                rows.push({
                    employee: emp,
                    task: {
                        id: task.id,
                        project_id: project.id,
                        project_title: project.title,
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

        // Also include project members who are part of the project team but don't have task assignments yet
        const memberIdsWithTasks = new Set();
        rows.forEach(r => {
            if (r.employee?.id) memberIdsWithTasks.add(r.employee.id);
        });

        const projectMembers = db.prepare(`
            SELECT u.id, u.full_name, u.role_title, u.avatar_url, u.email
            FROM project_members pm
            JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = ?
            ORDER BY u.full_name ASC
        `).all(projectId);

        projectMembers.forEach(emp => {
            if (!memberIdsWithTasks.has(emp.id)) {
                const dayStatuses = dayList.map(dateStr => ({
                    date: dateStr,
                    status: 'na',
                    label: 'N/A',
                    log: null
                }));

                rows.push({
                    employee: emp,
                    task: {
                        id: `unallocated-${emp.id}`,
                        project_id: project.id,
                        project_title: project.title,
                        title: 'Team Member (Ready for Deliverable Assignment)',
                        description: `${emp.full_name} is an active contributor on ${project.title}. Provision a specific deliverable in Project Dashboard to schedule daily logs.`,
                        start_date: startDate,
                        end_date: endDate,
                        status: 'in_progress'
                    },
                    days: dayStatuses
                });
            }
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
        const { date_from = '2026-08-27', date_to = '2026-09-06' } = req.query;

        // Generate full array of calendar days
        const dayList = [];
        const curr = new Date(date_from);
        const end = new Date(date_to);
        while (curr <= end) {
            dayList.push(curr.toISOString().split('T')[0]);
            curr.setDate(curr.getDate() + 1);
        }

        const tasks = db.prepare(`
            SELECT t.*, p.title as project_title, p.id as project_id
            FROM tasks t
            JOIN projects p ON t.project_id = p.id
            WHERE p.manager_id = ?
            ORDER BY p.title ASC, t.start_date ASC
        `).all(req.user.id);

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
                    const todayStr = new Date().toISOString().split('T')[0];
                    return {
                        date: dateStr,
                        status: dateStr > todayStr ? 'pending' : 'missed',
                        label: dateStr > todayStr ? 'Pending' : 'Missed',
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
