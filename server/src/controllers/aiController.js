import db from '../db/database.js';
import { callGeminiAPI } from './copilotController.js';

// Multi-Dimensional AI Summary Engine
export const generateSummary = async (req, res) => {
    try {
        const {
            dimension = 'project_based', // 'single_employee', 'multi_employee', 'task_based', 'project_based', 'fleet_level'
            employee_ids = [],
            project_ids = [],
            task_ids = [],
            date_from = '2026-09-01',
            date_to = '2026-09-30',
            status_filter = 'all', // 'all', 'green_only', 'worked_only', 'blockers_only'
            user_prompt = ''
        } = req.body;

        // 1. Build dynamic SQL query to gather the exact corpus of daily logs and context
        let query = `
            SELECT 
                dl.id as log_id,
                dl.log_date,
                dl.work_text,
                dl.has_worked,
                dl.no_work_reason,
                dl.created_at as log_timestamp,
                u.id as user_id,
                u.full_name as employee_name,
                u.role_title as employee_role,
                t.id as task_id,
                t.title as task_title,
                t.description as task_desc,
                t.start_date as task_start,
                t.end_date as task_end,
                t.status as task_status,
                p.id as project_id,
                p.title as project_title,
                p.status as project_status,
                p.manager_id as project_manager_id
            FROM daily_logs dl
            JOIN users u ON dl.user_id = u.id
            JOIN tasks t ON dl.task_id = t.id
            JOIN projects p ON t.project_id = p.id
            WHERE dl.log_date >= ? AND dl.log_date <= ?
        `;

        const params = [date_from, date_to];

        // Scope strictly to authenticated Project Manager to ensure tenant isolation
        if (req.user?.user_type === 'pm') {
            query += ` AND p.manager_id = ?`;
            params.push(req.user.id);
        }

        if (Array.isArray(employee_ids) && employee_ids.length > 0) {
            const placeholders = employee_ids.map(() => '?').join(',');
            query += ` AND dl.user_id IN (${placeholders})`;
            params.push(...employee_ids);
        }

        if (Array.isArray(project_ids) && project_ids.length > 0) {
            const placeholders = project_ids.map(() => '?').join(',');
            query += ` AND p.id IN (${placeholders})`;
            params.push(...project_ids);
        }

        if (Array.isArray(task_ids) && task_ids.length > 0) {
            const placeholders = task_ids.map(() => '?').join(',');
            query += ` AND t.id IN (${placeholders})`;
            params.push(...task_ids);
        }

        if (status_filter === 'green_only' || status_filter === 'worked_only') {
            query += ` AND dl.has_worked = 1`;
        } else if (status_filter === 'blockers_only') {
            query += ` AND dl.has_worked = 0`;
        }

        query += ` ORDER BY dl.log_date ASC, dl.created_at ASC`;

        const rawLogs = db.prepare(query).all(...params);

        // Calculate quantitative metrics from live database records
        const totalLogs = rawLogs.length;
        const greenLogs = rawLogs.filter(l => l.has_worked === 1);
        const blockerLogs = rawLogs.filter(l => l.has_worked === 0);
        const consistencyRate = totalLogs > 0 ? Math.round((greenLogs.length / totalLogs) * 100) : 100;

        const uniqueEmployees = Array.from(new Set(rawLogs.map(l => l.employee_name)));
        const uniqueProjects = Array.from(new Set(rawLogs.map(l => l.project_title)));
        const uniqueTasks = Array.from(new Set(rawLogs.map(l => l.task_title)));

        // Handle empty corpus gracefully
        if (totalLogs === 0) {
            let emptyScopeName = 'the selected criteria';
            if (dimension === 'fleet_level') {
                emptyScopeName = 'all managed projects';
            } else if (project_ids.length > 0) {
                const prj = db.prepare('SELECT title FROM projects WHERE id = ?').get(project_ids[0]);
                emptyScopeName = prj ? `project "${prj.title}"` : `project ID ${project_ids[0]}`;
            }

            const emptyResult = {
                dimension: getDimensionName(dimension),
                title: `Executive Report: ${emptyScopeName}`,
                timeframe: `${date_from} to ${date_to}`,
                metrics: {
                    total_active_projects: 0,
                    total_tracked_tasks: 0,
                    total_contributors: 0,
                    consistency_score: 'N/A (0 logs)',
                    blocker_ratio: '0%'
                },
                executive_summary: `No daily work logs or blocker reports were recorded for ${emptyScopeName} between ${date_from} and ${date_to}. Ensure team members submit their daily updates in the Employee Dashboard for active sprint deliverables.`,
                key_accomplishments: ['No progress submissions recorded in this date window.'],
                critical_impediments: ['No active blockers reported in this date window.'],
                delivery_forecast: 'Awaiting team submissions to establish milestone velocity and trajectory.'
            };

            return res.json({
                success: true,
                summary: emptyResult,
                corpus_stats: {
                    total_logs_analyzed: 0,
                    green_logs: 0,
                    blocker_logs: 0,
                    unique_contributors: 0,
                    unique_projects: 0,
                    unique_tasks: 0,
                    filters_applied: {
                        dimension,
                        date_from,
                        date_to,
                        status_filter,
                        employee_count: employee_ids.length,
                        project_count: project_ids.length,
                        task_count: task_ids.length
                    }
                }
            });
        }

        // 2. Synthesize dynamically based on requested Dimension
        let synthesisResult = {};

        switch (dimension) {
            case 'single_employee': {
                const targetEmp = rawLogs[0]?.employee_name || 'Selected Contributor';
                const targetRole = rawLogs[0]?.employee_role || 'Contributor';
                const blockers = blockerLogs.map(l => `[${l.log_date}] (${l.task_title}): ${l.no_work_reason}`);

                const completedTasks = Array.from(new Set(
                    rawLogs.filter(l => ['completed', 'done', 'Done'].includes(l.task_status)).map(l => l.task_title)
                ));

                const descriptiveAchievements = [];
                if (completedTasks.length > 0) {
                    descriptiveAchievements.push(`Completed deliverables: ${completedTasks.join(', ')}.`);
                }
                if (greenLogs.length > 0) {
                    descriptiveAchievements.push(`Maintained consistent cadence with ${greenLogs.length} daily progress log(s) across active sprint deliverables.`);
                    const recentWork = Array.from(new Set(greenLogs.map(l => `[${l.log_date}]: ${l.work_text}`))).slice(-4);
                    if (recentWork.length > 0) {
                        recentWork.forEach(w => descriptiveAchievements.push(w));
                    }
                }

                synthesisResult = {
                    dimension: 'Single Employee Summary (Individual Drilldown)',
                    title: `Executive Contributor Profile: ${targetEmp} (${targetRole})`,
                    timeframe: `${date_from} to ${date_to}`,
                    metrics: {
                        active_days_logged: greenLogs.length,
                        blocker_days: blockerLogs.length,
                        consistency_score: `${consistencyRate}%`,
                        compliance_rating: consistencyRate >= 85 ? 'High (Exemplary)' : consistencyRate >= 65 ? 'Moderate (Nominal)' : 'Attention Needed'
                    },
                    executive_summary: `This executive synthesis highlights the contributions of ${targetEmp} (${targetRole}) from ${date_from} to ${date_to}. Across ${totalLogs} logged day(s), they achieved an on-time consistency score of ${consistencyRate}% with ${greenLogs.length} successful progress update(s) and ${blockerLogs.length} reported blocker(s). Technical focus was dedicated to: ${uniqueTasks.slice(0, 3).join(', ') || 'assigned tasks'}.`,
                    key_achievements: descriptiveAchievements.length > 0 ? descriptiveAchievements : ['No positive work logs recorded in this period.'],
                    logged_blockers: blockers.length > 0 ? blockers : ['Zero blockers recorded.'],
                    technical_trajectory: blockerLogs.length > 0 
                        ? `Encountered ${blockerLogs.length} impediment(s) requiring coordination. Proactively flagged blockers for PM review.`
                        : `Clear trajectory with sustained daily submissions and zero blockers.`,
                    actionable_recommendations: blockerLogs.length > 0
                        ? `PM Action: Review reported blocker(s): ${blockerLogs.map(b => b.no_work_reason).slice(0, 2).join('; ')}.`
                        : `Contributor is operating smoothly on schedule.`
                };
                break;
            }

            case 'multi_employee': {
                const employeeBreakdown = {};
                uniqueEmployees.forEach(name => {
                    const empLogs = rawLogs.filter(l => l.employee_name === name);
                    const empGreen = empLogs.filter(l => l.has_worked === 1);
                    const empBlockers = empLogs.filter(l => l.has_worked === 0);
                    const empRole = empLogs[0]?.employee_role || 'Contributor';
                    employeeBreakdown[name] = {
                        role: empRole,
                        total_submissions: empLogs.length,
                        green_count: empGreen.length,
                        blocker_count: empBlockers.length,
                        score: empLogs.length > 0 ? Math.round((empGreen.length / empLogs.length) * 100) : 100,
                        latest_update: empGreen[empGreen.length - 1]?.work_text || 'No progress updates',
                        recent_blocker: empBlockers[0]?.no_work_reason || null
                    };
                });

                const teamAccomplishments = greenLogs.slice(-6).map(g => `• [${g.employee_name}]: ${g.work_text}`);
                const teamBlockers = blockerLogs.map(b => `• ${b.employee_name} (${b.employee_role}): ${b.no_work_reason}`);

                synthesisResult = {
                    dimension: 'Multiple Employees Comparative Summary (Team Cohort)',
                    title: `Team Output & Velocity Cohort Analysis (${uniqueEmployees.length} Contributors)`,
                    timeframe: `${date_from} to ${date_to}`,
                    metrics: {
                        total_team_submissions: totalLogs,
                        aggregate_consistency: `${consistencyRate}%`,
                        total_blockers: blockerLogs.length,
                        active_contributors: uniqueEmployees.length
                    },
                    cohort_breakdown: employeeBreakdown,
                    executive_summary: `Cohort analysis across ${uniqueEmployees.length} contributor(s) shows ${totalLogs} total submission(s) with an aggregate ${consistencyRate}% consistency rate. ${greenLogs.length} active progress report(s) and ${blockerLogs.length} impediment(s) were logged from ${date_from} to ${date_to}.`,
                    cross_functional_dependencies: teamAccomplishments.length > 0 
                        ? teamAccomplishments 
                        : ['No positive submissions recorded in this period.'],
                    shared_impediments: teamBlockers.length > 0
                        ? teamBlockers
                        : ['Zero shared impediments identified across team members.'],
                    workload_balance_insight: `Workforce participation includes ${uniqueEmployees.join(', ')}. Logging distribution reflects active engagement across assigned sprint deliverables.`
                };
                break;
            }

            case 'task_based': {
                const targetTask = uniqueTasks[0] || 'Selected Deliverable';
                const taskLogs = rawLogs.filter(l => l.task_title === targetTask);
                const taskGreen = taskLogs.filter(l => l.has_worked === 1);
                const taskBlockers = taskLogs.filter(l => l.has_worked === 0);
                const taskStatus = taskLogs[0]?.task_status || 'In Progress';

                let calculatedProgress = 'In Progress';
                if (['completed', 'done', 'Done'].includes(taskStatus)) {
                    calculatedProgress = '100% (Completed)';
                } else if (taskStatus.toLowerCase() === 'in_review') {
                    calculatedProgress = '80% (In Review)';
                } else {
                    const dynamicPct = Math.min(25 + taskGreen.length * 15, 85);
                    calculatedProgress = `${dynamicPct}% (${taskStatus})`;
                }

                synthesisResult = {
                    dimension: 'Task-Based Summary (Granular Milestone Tracking)',
                    title: `Milestone Deep-Dive: ${targetTask}`,
                    timeframe: `${date_from} to ${date_to}`,
                    metrics: {
                        milestone_progress: calculatedProgress,
                        assignees_involved: Array.from(new Set(taskLogs.map(l => l.employee_name))).join(', ') || 'Assigned Personnel',
                        logged_updates_count: taskLogs.length,
                        risk_level: taskBlockers.length > 0 ? 'Elevated (Blocker Logged)' : 'Nominal (On Schedule)'
                    },
                    executive_summary: `Milestone "${targetTask}" recorded ${taskLogs.length} update(s) from assignees (${Array.from(new Set(taskLogs.map(l => l.employee_name))).join(', ') || 'Team'}). Current status is "${taskStatus}" with ${taskGreen.length} progress update(s) and ${taskBlockers.length} active blocker(s).`,
                    solved_subtasks: taskGreen.map(g => `[${g.employee_name}]: ${g.work_text}`).slice(-4),
                    unresolved_bugs_and_blockers: taskBlockers.length > 0
                        ? taskBlockers.map(b => `[${b.employee_name}]: ${b.no_work_reason}`)
                        : ['No active blockers on this milestone.'],
                    delivery_forecast: taskBlockers.length > 0
                        ? 'Requires blocker resolution before staging sign-off.'
                        : 'Tracking positively towards verification and completion.'
                };
                break;
            }

            case 'project_based': {
                const targetProject = uniqueProjects[0] || 'Managed Project';
                const projectAccomplishments = greenLogs.slice(-6).map(g => `• [${g.log_date}] ${g.employee_name}: ${g.work_text}`);
                const projectBlockers = blockerLogs.map(b => `• [${b.log_date}] ${b.employee_name} (${b.task_title}): ${b.no_work_reason}`);

                const healthStatus = blockerLogs.length === 0 
                    ? 'Green (Healthy)' 
                    : (blockerLogs.length <= 2 ? 'Amber (Attention Needed)' : 'Red (Critical Blockers)');

                synthesisResult = {
                    dimension: 'Project-Based Summary (Project Health & Status Report)',
                    title: `Executive Health & Status Report: ${targetProject}`,
                    timeframe: `${date_from} to ${date_to}`,
                    metrics: {
                        project_health: healthStatus,
                        active_milestones: uniqueTasks.length,
                        team_size: uniqueEmployees.length,
                        sprint_consistency: `${consistencyRate}%`,
                        overall_consistency: `${consistencyRate}%`
                    },
                    executive_summary: `Project "${targetProject}" recorded ${totalLogs} daily update(s) (${greenLogs.length} progress logs, ${blockerLogs.length} blocker(s)) across ${uniqueEmployees.length} team member(s) between ${date_from} and ${date_to}. Team consistency stands at ${consistencyRate}% across ${uniqueTasks.length} active deliverable(s).`,
                    milestone_review: uniqueTasks.map(t => {
                        const tLogs = rawLogs.filter(l => l.task_title === t);
                        const tGreen = tLogs.filter(l => l.has_worked === 1);
                        const tStatus = tLogs[0]?.task_status || 'In Progress';
                        return `• ${t}: ${tGreen.length} progress update(s), status: ${tStatus}`;
                    }),
                    cumulative_blocker_analysis: projectBlockers.length > 0
                        ? projectBlockers
                        : ['• Zero unresolved blockers across project timeline.'],
                    key_accomplishments: projectAccomplishments.length > 0
                        ? projectAccomplishments
                        : ['No progress updates logged in this date range.'],
                    critical_impediments: projectBlockers.length > 0
                        ? projectBlockers
                        : ['Zero active blockers reported in this date range.'],
                    delivery_forecast: blockerLogs.length > 0
                        ? `${blockerLogs.length} blocker(s) logged; PM resolution required to maintain projected delivery.`
                        : 'On track for scheduled milestone deliverables and sprint goals.'
                };
                break;
            }

            case 'fleet_level':
            default: {
                const fleetAccomplishments = greenLogs.slice(-6).map(g => `• [${g.project_title}] ${g.employee_name}: ${g.work_text}`);
                const fleetBlockers = blockerLogs.map(b => `• [${b.project_title}] ${b.employee_name}: ${b.no_work_reason}`);

                synthesisResult = {
                    dimension: 'Overall / Fleet-Level Summary (Company-Wide Overview)',
                    title: 'Fleet-Wide Executive Digest & Macro Productivity Report',
                    timeframe: `${date_from} to ${date_to}`,
                    metrics: {
                        total_active_projects: uniqueProjects.length,
                        total_tracked_tasks: uniqueTasks.length,
                        total_contributors: uniqueEmployees.length,
                        fleet_consistency_index: `${consistencyRate}%`,
                        blocker_ratio: `${((blockerLogs.length / Math.max(totalLogs, 1)) * 100).toFixed(1)}%`
                    },
                    executive_summary: `Fleet-wide review covers ${uniqueProjects.length} managed project(s) and ${totalLogs} daily update(s) recorded across ${uniqueEmployees.length} personnel from ${date_from} to ${date_to}. The fleet maintained a ${consistencyRate}% consistency rate with ${greenLogs.length} active progress updates and ${blockerLogs.length} reported blockers.`,
                    macro_productivity_trends: [
                        `${greenLogs.length} daily progress submission(s) logged across ${uniqueProjects.length} project initiative(s).`,
                        `${uniqueEmployees.length} active team contributor(s) actively reporting status.`,
                        blockerLogs.length > 0 
                            ? `${blockerLogs.length} blocker(s) recorded across deliverables: ${Array.from(new Set(blockerLogs.map(b => b.task_title))).slice(0, 2).join(', ')}.`
                            : 'Zero active blockers reported across the fleet.'
                    ],
                    high_performing_initiatives: uniqueProjects.map(p => {
                        const pLogs = rawLogs.filter(l => l.project_title === p);
                        const pGreen = pLogs.filter(l => l.has_worked === 1);
                        return `• ${p} (${pGreen.length} progress update(s), ${Math.round((pGreen.length / Math.max(pLogs.length, 1)) * 100)}% consistency)`;
                    }),
                    organizational_bottlenecks: fleetBlockers.length > 0
                        ? fleetBlockers
                        : ['Zero organizational bottlenecks reported.'],
                    key_accomplishments: fleetAccomplishments.length > 0 
                        ? fleetAccomplishments 
                        : ['No progress updates logged in this date range.'],
                    critical_impediments: fleetBlockers.length > 0 
                        ? fleetBlockers 
                        : ['Zero active blockers reported across the fleet.'],
                    weekly_executive_digest: blockerLogs.length > 0
                        ? `PM Action Recommended: Triage ${blockerLogs.length} logged blocker(s) across active projects to maintain team velocity.`
                        : `All initiatives running with nominal cadence. Daily log compliance is steady across teams.`
                };
                break;
            }
        }

        // 3. Optional Gemini AI Executive Narrative Enhancement (if API key is available)
        if (process.env.GEMINI_API_KEY && totalLogs > 0) {
            try {
                const aiContext = {
                    dimension,
                    timeframe: `${date_from} to ${date_to}`,
                    projects: uniqueProjects,
                    tasks: uniqueTasks,
                    contributors: uniqueEmployees,
                    metrics: synthesisResult.metrics,
                    recent_accomplishments: greenLogs.slice(-5).map(g => ({ contributor: g.employee_name, task: g.task_title, log: g.work_text })),
                    active_blockers: blockerLogs.slice(-5).map(b => ({ contributor: b.employee_name, task: b.task_title, blocker: b.no_work_reason }))
                };

                const prompt = `You are PulsePM's Executive PM AI Assistant. Based strictly on the provided real daily logs and quantitative metrics, write a concise, professional, high-level executive summary narrative (1 paragraph, max 4 sentences). Do NOT invent features or modules not present in the grounding data. Return ONLY the narrative text.`;

                const aiNarrative = await Promise.race([
                    callGeminiAPI(prompt, aiContext, "Generate executive synthesis narrative"),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('AI generation timeout')), 4000))
                ]);

                if (aiNarrative && typeof aiNarrative === 'string' && !aiNarrative.startsWith('⚠️') && !aiNarrative.startsWith('Error')) {
                    synthesisResult.executive_summary = aiNarrative.trim();
                }
            } catch (aiErr) {
                // Non-blocking: fallback seamlessly to the deterministic synthesis
                console.log('Gemini summary enhancement skipped/fallback:', aiErr.message);
            }
        }

        res.json({
            success: true,
            summary: synthesisResult,
            corpus_stats: {
                total_logs_analyzed: totalLogs,
                green_logs: greenLogs.length,
                blocker_logs: blockerLogs.length,
                unique_contributors: uniqueEmployees.length,
                unique_projects: uniqueProjects.length,
                unique_tasks: uniqueTasks.length,
                filters_applied: {
                    dimension,
                    date_from,
                    date_to,
                    status_filter,
                    employee_count: employee_ids.length,
                    project_count: project_ids.length,
                    task_count: task_ids.length
                }
            }
        });
    } catch (err) {
        console.error('generateSummary error:', err);
        res.status(500).json({ error: err.message });
    }
};

function getDimensionName(dimId) {
    switch (dimId) {
        case 'single_employee': return 'Single Employee Drilldown';
        case 'multi_employee': return 'Team Cohort Analysis';
        case 'task_based': return 'Task & Milestone Tracking';
        case 'project_based': return 'Project Health & Status';
        case 'fleet_level': return 'Fleet-Level Macro Overview';
        default: return 'Executive Summary';
    }
}

