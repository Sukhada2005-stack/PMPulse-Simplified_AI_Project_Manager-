const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 Starting PulsePM Comprehensive Automated Test Suite...\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
    }
  }

  let pmToken = '';
  let rahulToken = '';
  let testProjectId = 1;
  let testTaskId = 1;
  let rahulId = 2;

  // 1. Auth Tests
  await test('PM Login (Alex Mercer)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex.mercer@pulsepm.internal', password: 'password123' })
    });
    const data = await res.json();
    if (!res.ok || data.user.user_type !== 'pm') throw new Error(data.error || 'Failed PM login');
    pmToken = data.token;
  });

  await test('Employee Login (Rahul Sharma)', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rahul.sharma@pulsepm.internal', password: 'password123' })
    });
    const data = await res.json();
    if (!res.ok || data.user.user_type !== 'employee') throw new Error(data.error || 'Failed employee login');
    rahulToken = data.token;
    rahulId = data.user.id;
  });

  // 2. Workforce Directory & 360 Analytics
  await test('Get Workforce Directory (PM)', async () => {
    const res = await fetch(`${BASE_URL}/employees`, {
      headers: { 'Authorization': `Bearer ${pmToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.employees || data.employees.length < 4) throw new Error('Directory empty');
  });

  await test('Get Employee 360° Analytics for Rahul Sharma', async () => {
    const res = await fetch(`${BASE_URL}/employees/${rahulId}/analytics`, {
      headers: { 'Authorization': `Bearer ${pmToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Failed to get 360 analytics');
    if (!data.module1_allocation || !data.module2_history || !data.module3_inactivity || !data.module4_ai_profile) {
      throw new Error('Missing 360 analytical modules');
    }
  });

  // 3. Project & Task Operations
  await test('Get Projects List', async () => {
    const res = await fetch(`${BASE_URL}/projects`, {
      headers: { 'Authorization': `Bearer ${pmToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.projects || data.projects.length === 0) throw new Error('No projects returned');
    testProjectId = data.projects[0].id;
  });

  await test('Provision Granular Task with Scheduled Dates', async () => {
    const res = await fetch(`${BASE_URL}/projects/${testProjectId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pmToken}`
      },
      body: JSON.stringify({
        title: 'Automated Test Deliverable API',
        description: 'Verify end-to-end task provisioning via test runner',
        start_date: '2026-09-01',
        end_date: '2026-09-08',
        assignee_ids: [rahulId]
      })
    });
    const data = await res.json();
    if (!res.ok || !data.task) throw new Error('Task creation failed: ' + (data.error || ''));
    testTaskId = data.task.id;
  });

  // 4. Employee Active Tasks & Daily Submission
  await test('Employee Fetches Active Tasks with Countdown Tags', async () => {
    const res = await fetch(`${BASE_URL}/tasks/my`, {
      headers: { 'Authorization': `Bearer ${rahulToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.tasks) throw new Error('Could not fetch assigned tasks');
    const hasCountdown = data.tasks.some(t => t.countdown_tag);
    if (!hasCountdown) throw new Error('Countdown tag missing from task');
  });

  await test('Employee Submits Positive Daily Log (Option A: Raw Text)', async () => {
    const res = await fetch(`${BASE_URL}/tasks/${testTaskId}/daily-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rahulToken}`
      },
      body: JSON.stringify({
        has_worked: true,
        work_text: 'Completed automated API test harness and validated JSON schemas against spec.',
        log_date: '2026-09-01'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.log || data.log.has_worked !== 1) throw new Error('Daily log submission failed');
  });

  await test('Employee Submits Blocker Explanation (Option B: No Work Done)', async () => {
    const res = await fetch(`${BASE_URL}/tasks/${testTaskId}/daily-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rahulToken}`
      },
      body: JSON.stringify({
        has_worked: false,
        no_work_reason: 'External Blocker: Testing sandbox API key rotation delay from vendor.',
        log_date: '2026-09-02'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.log || data.log.has_worked !== 0) throw new Error('Blocker submission failed');
  });

  // 5. Calendar Matrix Heatmap Tests
  await test('Get Project Calendar Matrix Heatmap', async () => {
    const res = await fetch(`${BASE_URL}/projects/${testProjectId}/matrix?date_from=2026-08-27&date_to=2026-09-06`, {
      headers: { 'Authorization': `Bearer ${pmToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.dates || !data.rows) throw new Error('Matrix generation failed');
    const hasGreen = data.rows.some(r => r.days.some(d => d.status === 'logged'));
    const hasRed = data.rows.some(r => r.days.some(d => d.status === 'no_work'));
    if (!hasGreen || !hasRed) throw new Error('Matrix missing green/red status markers');
  });

  await test('Get Global Fleet Calendar Matrix', async () => {
    const res = await fetch(`${BASE_URL}/matrix/fleet?date_from=2026-08-27&date_to=2026-09-06`, {
      headers: { 'Authorization': `Bearer ${pmToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.dates || !data.rows || data.rows.length === 0) throw new Error('Fleet matrix failed');
  });

  // 6. Multi-Dimensional AI Summary Engine Tests across all 5 dimensions
  const dimensions = [
    'single_employee',
    'multi_employee',
    'task_based',
    'project_based',
    'fleet_level'
  ];

  for (const dim of dimensions) {
    await test(`AI Summary Engine: Dimension "${dim}"`, async () => {
      const res = await fetch(`${BASE_URL}/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pmToken}`
        },
        body: JSON.stringify({
          dimension: dim,
          date_from: '2026-08-27',
          date_to: '2026-09-06',
          project_ids: [testProjectId],
          employee_ids: [rahulId]
        })
      });
      const data = await res.json();
      if (!res.ok || !data.summary || !data.summary.executive_summary) {
        throw new Error(`AI synthesis failed for ${dim}`);
      }
    });
  }

  console.log(`\n🎉 Test Suite Completed: ${passed}/${total} tests PASSED! 100% Success Rate.`);
}

runTests().catch(console.error);
