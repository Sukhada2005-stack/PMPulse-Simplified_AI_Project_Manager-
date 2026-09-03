import bcrypt from 'bcryptjs';
import db from './database.js';

export function seedDatabase() {
    console.log('🌱 Seeding PulsePM database...');

    // Clear existing records in correct foreign key order
    db.exec(`
        DELETE FROM daily_logs;
        DELETE FROM task_assignees;
        DELETE FROM tasks;
        DELETE FROM project_members;
        DELETE FROM projects;
        DELETE FROM users;
    `);

    const defaultPasswordHash = bcrypt.hashSync('password123', 10);

    // 1. Insert Users (PM and Team)
    const insertUser = db.prepare(`
        INSERT INTO users (email, password_hash, full_name, role_title, user_type, status, avatar_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const pm = insertUser.run(
        'alex.mercer@pulsepm.internal',
        defaultPasswordHash,
        'Alex Mercer',
        'Senior Project Director',
        'pm',
        'active',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    );

    const rahul = insertUser.run(
        'rahul.sharma@pulsepm.internal',
        defaultPasswordHash,
        'Rahul Sharma',
        'Senior Frontend Developer',
        'employee',
        'active',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
    );

    const ananya = insertUser.run(
        'ananya.patel@pulsepm.internal',
        defaultPasswordHash,
        'Ananya Patel',
        'Principal Backend Engineer',
        'employee',
        'active',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
    );

    const vikram = insertUser.run(
        'vikram.verma@pulsepm.internal',
        defaultPasswordHash,
        'Vikram Verma',
        'Lead QA Automation Engineer',
        'employee',
        'active',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
    );

    const sneha = insertUser.run(
        'sneha.roy@pulsepm.internal',
        defaultPasswordHash,
        'Sneha Roy',
        'Staff UI/UX Designer',
        'employee',
        'active',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
    );

    const david = insertUser.run(
        'david.kim@pulsepm.internal',
        defaultPasswordHash,
        'David Kim',
        'Cloud & DevOps Architect',
        'employee',
        'active',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
    );

    const pmId = pm.lastInsertRowid;
    const rahulId = rahul.lastInsertRowid;
    const ananyaId = ananya.lastInsertRowid;
    const vikramId = vikram.lastInsertRowid;
    const snehaId = sneha.lastInsertRowid;
    const davidId = david.lastInsertRowid;

    // 2. Insert Projects
    const insertProject = db.prepare(`
        INSERT INTO projects (title, description, created_by, status)
        VALUES (?, ?, ?, ?)
    `);

    const p1 = insertProject.run(
        'E-Commerce Mobile App & Web Redesign',
        'Comprehensive multi-platform overhaul featuring high-converting checkout flows, modern glassmorphism UI, Razorpay & Stripe integration, and sub-second catalog latency.',
        pmId,
        'active'
    );

    const p2 = insertProject.run(
        'Fintech Payment Gateway & Webhook Infrastructure',
        'Zero-trust payment reconciliation engine, idempotent webhook listeners, multi-currency processing, and PCI-DSS compliant vault tokenization.',
        pmId,
        'active'
    );

    const p3 = insertProject.run(
        'AI Customer Intelligence & Analytics Hub',
        'Next-gen semantic log analysis, automated cohort retention models, and executive insight generation for real-time fleet visibility.',
        pmId,
        'active'
    );

    const p1Id = p1.lastInsertRowid;
    const p2Id = p2.lastInsertRowid;
    const p3Id = p3.lastInsertRowid;

    // 3. Project Members
    const insertMember = db.prepare(`INSERT INTO project_members (project_id, user_id) VALUES (?, ?)`);
    [rahulId, ananyaId, vikramId, snehaId].forEach(uid => insertMember.run(p1Id, uid));
    [ananyaId, davidId, vikramId].forEach(uid => insertMember.run(p2Id, uid));
    [rahulId, snehaId, davidId].forEach(uid => insertMember.run(p3Id, uid));

    // 4. Tasks with explicit scheduled date ranges
    const insertTask = db.prepare(`
        INSERT INTO tasks (project_id, title, description, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const t1 = insertTask.run(
        p1Id,
        'Payment UI Flow & Responsive Checkout Form',
        'Build reactive React/Tailwind card components with client-side validation, Apple Pay tokenization integration, and loading skeletons.',
        '2026-08-27',
        '2026-09-04',
        'in_progress'
    );

    const t2 = insertTask.run(
        p1Id,
        'Payment Gateway Webhook & Event Handlers',
        'Implement resilient Express event dispatcher, signature verification, and database idempotency locks for async payment confirmations.',
        '2026-08-27',
        '2026-09-05',
        'in_progress'
    );

    const t3 = insertTask.run(
        p1Id,
        'Checkout Polish & Micro-Interaction Design System',
        'Craft smooth spring animations, glassmorphic toast notifications, and dark/light contrast parity across all screens.',
        '2026-08-28',
        '2026-09-06',
        'in_progress'
    );

    const t4 = insertTask.run(
        p1Id,
        'Staging Integration & End-to-End Test Suite',
        'Automate Playwright and Jest matrix tests across mock gateway responses, edge cases, and network drop recovery.',
        '2026-08-29',
        '2026-09-06',
        'in_progress'
    );

    const t5 = insertTask.run(
        p2Id,
        'PCI-Compliant Token Vault & KMS Encryption',
        'Setup envelope encryption via cloud KMS, rotate master salts, and verify SQL parameterization safety.',
        '2026-08-30',
        '2026-09-08',
        'in_progress'
    );

    const t6 = insertTask.run(
        p3Id,
        'Executive Trend Aggregation Engine',
        'Vectorized embeddings for daily raw developer updates, anomaly detector for recurring blockers, and automated digest builder.',
        '2026-08-31',
        '2026-09-07',
        'in_progress'
    );

    const t1Id = t1.lastInsertRowid;
    const t2Id = t2.lastInsertRowid;
    const t3Id = t3.lastInsertRowid;
    const t4Id = t4.lastInsertRowid;
    const t5Id = t5.lastInsertRowid;
    const t6Id = t6.lastInsertRowid;

    // 5. Task Assignees
    const insertAssignee = db.prepare(`INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)`);
    insertAssignee.run(t1Id, rahulId);
    insertAssignee.run(t2Id, ananyaId);
    insertAssignee.run(t3Id, snehaId);
    insertAssignee.run(t4Id, vikramId);
    insertAssignee.run(t5Id, ananyaId);
    insertAssignee.run(t5Id, davidId);
    insertAssignee.run(t6Id, rahulId);
    insertAssignee.run(t6Id, snehaId);

    // 6. Daily Logs (Realistic sample logs matching the specification matrix)
    const insertLog = db.prepare(`
        INSERT INTO daily_logs (task_id, user_id, log_date, work_text, has_worked, no_work_reason)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Rahul Sharma logs for Task 1 (Payment UI Flow)
    insertLog.run(t1Id, rahulId, '2026-08-27', 'Scaffolded payment component hierarchy; added card brand auto-detection logic (Visa, MC, Amex).', 1, null);
    insertLog.run(t1Id, rahulId, '2026-08-28', 'Configured Stripe Elements iframe integration; refactored field error feedback states.', 1, null);
    insertLog.run(t1Id, rahulId, '2026-08-29', 'Hooked up state management for billing address synchronization and discount code applicator.', 1, null);
    insertLog.run(t1Id, rahulId, '2026-08-30', 'Optimized mobile viewport layout, fixed keyboard dismissal bug on iOS Chrome.', 1, null);
    insertLog.run(t1Id, rahulId, '2026-08-31', 'Tested 3D Secure 2 modal popover and handling of customer auth cancellation.', 1, null);
    insertLog.run(t1Id, rahulId, '2026-09-01', null, 0, 'UI asset approval delay: Waiting on final SVG iconography bundle from design leads.');

    // Ananya Patel logs for Task 2 (Payment Gateway Webhook)
    insertLog.run(t2Id, ananyaId, '2026-08-27', null, 0, 'Blocked: Awaiting payment gateway API documentation and sandbox credentials.');
    insertLog.run(t2Id, ananyaId, '2026-08-28', null, 0, 'Blocked: Dependency on staging environment TLS certificate provisioning.');
    insertLog.run(t2Id, ananyaId, '2026-08-29', null, 0, 'External Blocker: Sandbox webhook gateway timeout; reached out to provider engineering support.');
    insertLog.run(t2Id, ananyaId, '2026-08-30', null, 0, 'Blocked: Redis queue cluster staging unreachable; waiting on infrastructure team restart.');
    insertLog.run(t2Id, ananyaId, '2026-08-31', null, 0, 'Blocked: Inbound webhook signature verification test suite failing due to outdated mock payloads.');
    insertLog.run(t2Id, ananyaId, '2026-09-01', 'Integrated refund event handler and partial settlement reconciliation routines.', 1, null);

    // Sneha Roy logs for Task 3 (Checkout Polish)
    insertLog.run(t3Id, snehaId, '2026-08-28', 'Drafted 8 high-fidelity variant tokens for dark mode checkout cards in Figma and CSS variables.', 1, null);
    insertLog.run(t3Id, snehaId, '2026-08-29', 'Coded smooth CSS micro-interactions on form inputs and success celebration states.', 1, null);
    insertLog.run(t3Id, snehaId, '2026-08-30', 'Audited contrast ratios against WCAG AAA guidelines, tweaked muted text opacity.', 1, null);
    insertLog.run(t3Id, snehaId, '2026-08-31', 'Exported optimized SVG asset bundle and delivered icon set to frontend repo.', 1, null);
    insertLog.run(t3Id, snehaId, '2026-09-01', 'Reviewed responsive breakpoint transitions at 375px, 768px, and 1280px.', 1, null);

    // Vikram Verma logs for Task 4 (Staging Integration)
    insertLog.run(t4Id, vikramId, '2026-08-29', 'Authored initial Playwright suite covering successful single-item checkout journey.', 1, null);
    insertLog.run(t4Id, vikramId, '2026-08-30', 'Added edge cases for card decline, insufficient funds, and expired expiry dates.', 1, null);
    insertLog.run(t4Id, vikramId, '2026-08-31', null, 0, 'Internal Dependency: Staging database seed script broke on foreign key constraint; waiting for fix.');
    insertLog.run(t4Id, vikramId, '2026-09-01', 'Staging DB fixed. Executed 45 automated test scenarios, 43 passed, 2 minor CSS quirks logged.', 1, null);

    // 6. Insert Project Messages & Discussions (Team Chat & Meeting Schedules)
    const insertMessage = db.prepare(`
        INSERT INTO project_messages (project_id, user_id, message, message_type, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Project 1: Next-Gen Checkout Flow Discussions
    insertMessage.run(
        p1Id,
        pmId,
        'Team, let’s ensure all webhook latency issues and third-party sandbox dependencies are logged on daily check-ins so we can coordinate vendor escalations.',
        'text',
        null,
        '2026-08-30 09:30:00'
    );

    insertMessage.run(
        p1Id,
        pmId,
        'Sprint Blocker Triage & Payment Gateway Sync',
        'meeting',
        JSON.stringify({
            topic: 'Sprint Blocker Triage & Gateway Sandbox Sync',
            date: '2026-09-03',
            time: '10:00 AM IST',
            duration: '30 mins',
            link: 'https://meet.google.com/pulse-checkout-sync',
            location: 'Virtual / Room A-102'
        }),
        '2026-08-30 10:00:00'
    );

    insertMessage.run(
        p1Id,
        ananyaId,
        'Thanks Alex. I have logged the sandbox timeout errors with provider engineering support and am preparing the idempotency test suite.',
        'text',
        null,
        '2026-08-30 11:15:00'
    );

    insertMessage.run(
        p1Id,
        rahulId,
        'Frontend Apple Pay tokenization and 3D Secure 2 modal popover components are ready and passing local unit tests.',
        'text',
        null,
        '2026-08-31 14:20:00'
    );

    insertMessage.run(
        p1Id,
        snehaId,
        'Updated Figma design tokens with high-contrast WCAG AAA compliance for dark mode cards. Asset bundle is available in repo.',
        'text',
        null,
        '2026-09-01 16:45:00'
    );

    // Project 3: MedRAG with LlamaIndex Discussions
    insertMessage.run(
        p3Id,
        pmId,
        'Welcome team to the MedRAG project! Let’s align on document parsing pipelines, embedding chunk sizes, and vector retrieval accuracy.',
        'text',
        null,
        '2026-08-31 09:00:00'
    );

    insertMessage.run(
        p3Id,
        pmId,
        'MedRAG Architecture & Pipeline Kickoff Meeting',
        'meeting',
        JSON.stringify({
            topic: 'MedRAG Architecture & Vector Indexing Kickoff',
            date: '2026-09-04',
            time: '02:30 PM IST',
            duration: '45 mins',
            link: 'https://meet.google.com/medrag-arch-kickoff',
            location: 'Engineering Hub - Hall 3'
        }),
        '2026-08-31 09:30:00'
    );

    insertMessage.run(
        p3Id,
        rahulId,
        'Setting up the document upload UI with progress indicators and real-time response streaming.',
        'text',
        null,
        '2026-09-01 11:00:00'
    );

    insertMessage.run(
        p3Id,
        vikramId,
        'Setting up automated Playwright test benchmarks for medical QA evaluation datasets.',
        'text',
        null,
        '2026-09-01 15:30:00'
    );

    console.log('✅ Seed complete! Users, Projects, Tasks, Daily Logs, and Chat Discussions populated.');
}

// If run directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
    seedDatabase();
}

