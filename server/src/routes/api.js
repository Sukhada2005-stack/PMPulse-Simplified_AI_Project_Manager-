import express from 'express';
import { login, getMe, listAllUsers, checkRole, changePassword, setPermanentPassword } from '../controllers/authController.js';
import { createEmployee, getEmployees, getEmployeeAnalytics, deleteEmployee, sendWarning, getMyWarnings } from '../controllers/employeeController.js';
import { createProject, getProjects, getProjectById, createTask, getMyTasks, addProjectMember, updateProject, deleteProject, removeProjectMember, getProjectTasks, getAllProjectsTasks, createWorkspaceTask, updateWorkspaceTask, syncWorkspaceTasks, importProjectTasks, deleteProjectTasks, deleteWorkspaceTask, getProjectDocs, createProjectDoc, deleteProjectDoc } from '../controllers/projectController.js';
import { submitDailyLog, getMyDailyLogs, getProjectMatrix, getFleetMatrix, getActiveBlockers } from '../controllers/dailyLogController.js';
import { generateSummary } from '../controllers/aiController.js';
import { getProjectMessages, sendProjectMessage } from '../controllers/chatController.js';
import { createPM, getPMs, deletePM, updatePM, getPMProjects, getPMWorkforce } from '../controllers/superuserController.js';
import { handleEmployeeCopilot, handlePMCopilot, handleSuperuserCopilot } from '../controllers/copilotController.js';
import { authenticateToken, requirePM, requireSuperuser } from '../middleware/auth.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// --- Authentication & User Switcher ---
router.post('/auth/check-role', checkRole);
router.post('/auth/login', login);
router.post('/auth/set-permanent-password', setPermanentPassword);
router.post('/auth/change-password', authenticateToken, changePassword);
router.get('/auth/me', authenticateToken, getMe);
router.get('/auth/users', listAllUsers);

// --- Employee Management & 360° Analytics ---
router.post('/employees', authenticateToken, requirePM, createEmployee);
router.get('/employees', authenticateToken, getEmployees);
router.get('/employees/my/warnings', authenticateToken, getMyWarnings);
router.post('/employees/:id/warnings', authenticateToken, requirePM, sendWarning);
router.get('/employees/:id/analytics', authenticateToken, requirePM, getEmployeeAnalytics);
router.delete('/employees/:id', authenticateToken, requirePM, deleteEmployee);

// --- Superuser Operations ---
router.post('/pms', authenticateToken, requireSuperuser, createPM);
router.get('/pms', authenticateToken, requireSuperuser, getPMs);
router.get('/pms/:id/projects', authenticateToken, requireSuperuser, getPMProjects);
router.get('/pms/:id/workforce', authenticateToken, requireSuperuser, getPMWorkforce);
router.put('/pms/:id', authenticateToken, requireSuperuser, updatePM);
router.patch('/pms/:id', authenticateToken, requireSuperuser, updatePM);
router.delete('/pms/:id', authenticateToken, requireSuperuser, deletePM);

// --- Project Operations ---
router.post('/projects', authenticateToken, requirePM, createProject);
router.get('/projects', authenticateToken, getProjects);
router.get('/projects/all/tasks', authenticateToken, requirePM, getAllProjectsTasks);
router.get('/projects/:id', authenticateToken, getProjectById);
router.put('/projects/:id', authenticateToken, requirePM, updateProject);
router.delete('/projects/:id', authenticateToken, requirePM, deleteProject);

// --- Task Operations & Employee Feed ---
router.get('/workspaces/:id/tasks', authenticateToken, getProjectTasks);
router.post('/workspaces/:id/tasks', authenticateToken, createWorkspaceTask);
router.put('/workspaces/:id/tasks/:taskId', authenticateToken, updateWorkspaceTask);
router.post('/workspaces/:id/tasks/sync', authenticateToken, syncWorkspaceTasks);
router.post('/workspaces/:id/tasks/import', authenticateToken, requirePM, upload.single('file'), importProjectTasks);
router.delete('/workspaces/:id/tasks/:taskId', authenticateToken, requirePM, deleteWorkspaceTask);
router.delete('/workspaces/:id/tasks', authenticateToken, requirePM, deleteProjectTasks);

// --- Document Operations ---
router.get('/workspaces/:id/docs', authenticateToken, getProjectDocs);
router.post('/workspaces/:id/docs', authenticateToken, createProjectDoc);
router.delete('/workspaces/:id/docs/:docId', authenticateToken, deleteProjectDoc);

router.post('/projects/:id/tasks', authenticateToken, requirePM, createTask);
router.get('/tasks/my', authenticateToken, getMyTasks);
router.post('/projects/:id/members', authenticateToken, requirePM, addProjectMember);
router.delete('/projects/:id/members/:userId', authenticateToken, requirePM, removeProjectMember);
// --- Project Team Chat & Meeting Scheduler ---
router.get('/projects/:id/messages', authenticateToken, getProjectMessages);
router.post('/projects/:id/messages', authenticateToken, sendProjectMessage);

// --- Daily Submissions & Interactive Calendar Matrix ---
router.post('/tasks/:id/daily-log', authenticateToken, submitDailyLog);
router.get('/daily-logs/my', authenticateToken, getMyDailyLogs);
router.get('/daily-logs/active-blockers', authenticateToken, requirePM, getActiveBlockers);
router.get('/projects/:id/matrix', authenticateToken, requirePM, getProjectMatrix);
router.get('/matrix/fleet', authenticateToken, requirePM, getFleetMatrix);

// --- Multi-Dimensional AI Summary Engine ---
router.post('/ai/summarize', authenticateToken, requirePM, generateSummary);

// --- Role-Scoped Conversational AI Copilots ---
router.post('/copilot/employee', authenticateToken, handleEmployeeCopilot);
router.post('/copilot/pm', authenticateToken, requirePM, handlePMCopilot);
router.post('/copilot/superuser', authenticateToken, requireSuperuser, handleSuperuserCopilot);

export default router;
