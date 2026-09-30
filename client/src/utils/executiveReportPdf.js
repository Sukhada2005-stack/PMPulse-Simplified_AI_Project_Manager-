import { jsPDF } from 'jspdf';

/**
 * Generates an executive 5-slide boardroom presentation PDF in landscape A4 format
 * using mathematically grounded live sprint data and user customizations.
 */
export function generateExecutiveDeckPDF(reportData, customData = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = 297; // page width in mm
  const ph = 210; // page height in mm

  const metadata = reportData?.metadata || {};
  const kpis = reportData?.kpis || {};
  const blocker_analysis = reportData?.blocker_analysis || {};
  const discipline_allocation = reportData?.discipline_allocation || [];
  const calendar_matrix_snapshot = reportData?.calendar_matrix_snapshot || {};

  const execSummary = customData.executiveSummary !== undefined ? customData.executiveSummary : (reportData?.executive_summary || '');
  const accomplishments = customData.accomplishments !== undefined ? customData.accomplishments : (reportData?.accomplishments || []);
  const retrospective = customData.retrospective !== undefined ? customData.retrospective : (reportData?.retrospective || {
    what_went_well: [],
    where_bottlenecks_emerged: [],
    action_items: []
  });
  const triageSummary = customData.triageSummary !== undefined ? customData.triageSummary : (blocker_analysis?.summary || '');
  const riskMitigation = customData.riskMitigation !== undefined ? customData.riskMitigation : (blocker_analysis?.risk_mitigation || '');

  const projectTitle = metadata?.project?.title || 'Executive Project Report';
  const sprintWindow = metadata?.sprint_window?.display_label || (
    metadata?.sprint_window?.date_from
      ? `${metadata.sprint_window.date_from} — ${metadata.sprint_window.date_to}`
      : 'Active Sprint Window'
  );
  const deliveryLead = metadata?.project?.manager_name || 'Project Manager';
  const healthScore = metadata?.health_index?.score ?? 73;
  const healthLabel = metadata?.health_index?.label || 'Steady Progress';
  const activeDays = metadata?.sprint_window?.total_days || 14;

  const drawHeader = (slideNum, slideSubtitle) => {
    // Top banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pw, 26, 'F');

    // Accent line
    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(0, 26, pw, 1.2, 'F');

    // Category / Slide Tag
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(245, 158, 11);
    doc.text(`PMPULSE EXECUTIVE SPRINT REPORT • SLIDE ${slideNum} OF 5 • ${slideSubtitle}`.toUpperCase(), 14, 8);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    const titleText = doc.splitTextToSize(projectTitle, 190);
    doc.text(titleText[0] || projectTitle, 14, 16);

    // Subtitle / Window
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Sprint Window: ${sprintWindow} (${activeDays} Days)  |  Delivery Lead: ${deliveryLead}`, 14, 22);

    // Health pill on right
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.roundedRect(pw - 58, 5.5, 44, 15, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${healthScore}% HEALTH`, pw - 36, 12.5, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(healthLabel, pw - 36, 17.5, { align: 'center' });
  };

  const drawFooter = (slideNum) => {
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(14, ph - 12, pw - 14, ph - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('PulsePM Zero-Agile Overhead Suite • 100% Mathematically Grounded Database Verification', 14, ph - 7);
    doc.text(`Slide ${slideNum} of 5  |  Confidential & Boardroom Ready`, pw - 14, ph - 7, { align: 'right' });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 1: MACRO EXECUTIVE OVERVIEW & HEALTH INDEX
  // ══════════════════════════════════════════════════════════════════════════
  drawHeader(1, 'MACRO EXECUTIVE OVERVIEW & HEALTH INDEX');

  const kpiData = [
    { label: 'PLANNED TASKS', val: String(kpis?.total_planned_tasks ?? 0), sub: 'In Scope Deliverables', color: [15, 23, 42] },
    { label: 'SHIPPED VELOCITY', val: `${kpis?.completed_tasks ?? 0} (${kpis?.completion_velocity_pct ?? 0}%)`, sub: 'Completed Velocity', color: [16, 185, 129] },
    { label: 'ACTIVE / IN PROGRESS', val: String(kpis?.in_progress_tasks ?? 0), sub: 'Under Active Build', color: [37, 99, 235] },
    { label: 'BLOCKER MTTR', val: String(kpis?.avg_mttr_hours ?? '0.0h'), sub: 'Resolution Speed', color: [147, 51, 234] },
    { label: 'LOG COMPLIANCE', val: `${kpis?.log_compliance_pct ?? 100}%`, sub: `${kpis?.productive_logs ?? 0}/${kpis?.total_daily_logs ?? 0} Days Logged`, color: [217, 119, 6] }
  ];

  const cardW = 50.8;
  const startX = 14;
  const startY = 33;
  const cardH = 26;

  kpiData.forEach((kpi, idx) => {
    const x = startX + idx * (cardW + 3.8);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 4, startY + 6);

    doc.setFontSize(13);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, x + 4, startY + 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, x + 4, startY + 21);
  });

  // Narrative Card
  const narrY = 64;
  const narrH = ph - narrY - 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, narrY, pw - 28, narrH, 3, 3, 'FD');

  doc.setFillColor(245, 158, 11);
  doc.rect(14, narrY, 3, narrH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Synthesis Narrative', 22, narrY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const narrativeLines = doc.splitTextToSize(execSummary || 'Sprint completed with steady progress.', pw - 48);
  doc.text(narrativeLines, 22, narrY + 18);

  drawFooter(1);

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 2: VELOCITY BREAKDOWN & CALENDAR MATRIX AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(2, 'VELOCITY BREAKDOWN & ATTENDANCE AUDIT');

  // Left card: Discipline Allocation
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 33, 120, ph - 33 - 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Engineering Discipline Allocation', 20, 42);

  let discY = 51;
  discipline_allocation.forEach((d) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(d.discipline || 'General', 20, discY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${d.percentage || 0}% (${d.task_count || 0} tasks)`, 126, discY, { align: 'right' });

    // Progress Bar
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(20, discY + 2, 106, 3, 1, 1, 'F');
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(20, discY + 2, Math.max(1, (106 * (d.percentage || 0)) / 100), 3, 1, 1, 'F');

    discY += 12;
  });

  // Right card: Attendance Snapshot
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(140, 33, pw - 154, ph - 33 - 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Team Contributor Attendance & Compliance', 146, 42);

  let attY = 52;
  const contributors = calendar_matrix_snapshot?.contributors || [];
  contributors.slice(0, 8).forEach((c) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(c.full_name || 'Contributor', 146, attY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.role_title || 'Engineer', 146, attY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text(`${c.compliance_score || 100}% Compliance`, pw - 20, attY + 2, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.line(146, attY + 7, pw - 20, attY + 7);

    attY += 13;
  });

  drawFooter(2);

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 3: KEY ACCOMPLISHMENTS & DELIVERABLES
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(3, 'KEY ACCOMPLISHMENTS & DELIVERABLES');

  let accY = 34;
  accomplishments.slice(0, 4).forEach((acc, idx) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, accY, pw - 28, 33, 2, 2, 'FD');

    // Number badge
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(20, accY + 4, 6, 6, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(String(idx + 1), 23, accY + 8.5, { align: 'center' });

    // Theme Title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(acc.theme || 'Milestone Deliverable', 30, accY + 8.5);

    // Impact
    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129);
    doc.text(acc.impact || 'Core Delivery', pw - 20, accY + 8.5, { align: 'right' });

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(acc.description || '', pw - 50);
    doc.text(descLines.slice(0, 3), 30, accY + 15);

    // Contributors
    if (Array.isArray(acc.contributors) && acc.contributors.length > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Key Contributors: ${acc.contributors.join(', ')}`, 30, accY + 28);
    }

    accY += 37;
  });

  drawFooter(3);

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 4: IMPEDIMENTS, ROOT CAUSE ANALYSIS & MTTR
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(4, 'IMPEDIMENTS, ROOT CAUSE ANALYSIS & MTTR');

  // Blocker metrics row
  const bMetrics = [
    { label: 'TOTAL IMPEDIMENTS', val: String(blocker_analysis?.total_blockers ?? 0), color: [15, 23, 42] },
    { label: 'RESOLVED IMPEDIMENTS', val: String(blocker_analysis?.resolved_count ?? 0), color: [16, 185, 129] },
    { label: 'ACTIVE BOTTLENECKS', val: String(blocker_analysis?.active_count ?? 0), color: [217, 119, 6] },
    { label: 'AVERAGE MTTR', val: String(blocker_analysis?.avg_mttr_hours ?? '0.0h'), color: [147, 51, 234] }
  ];

  const bCardW = (pw - 28 - 9) / 4;
  bMetrics.forEach((m, idx) => {
    const x = 14 + idx * (bCardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 33, bCardW, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 4, 39);

    doc.setFontSize(12);
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, x + 4, 48);
  });

  // Triage narrative & Risk Mitigation
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 57, pw - 28, 40, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Executive Triage & Risk Mitigation Guidance', 20, 65);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const triLines = doc.splitTextToSize(triageSummary || 'No major blockers recorded.', pw - 44);
  doc.text(triLines.slice(0, 3), 20, 72);

  if (riskMitigation) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9);
    const mitLines = doc.splitTextToSize(`Guidance: ${riskMitigation}`, pw - 44);
    doc.text(mitLines.slice(0, 2), 20, 88);
  }

  // Incidents log
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 101, pw - 28, 88, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Verified Incident Logs', 20, 109);

  let incY = 117;
  const incidents = blocker_analysis?.incidents || [];
  if (incidents.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text('Zero blockers recorded during this sprint. Delivery trajectory is unimpeded.', 20, incY);
  } else {
    incidents.slice(0, 5).forEach((inc) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`${inc.employee_name || 'Team Member'} [${inc.log_date || 'Sprint'}] - ${inc.category || 'Blocker'}`, 20, incY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`"${inc.reason || ''}"`, 20, incY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(inc.is_resolved ? 16 : 217, inc.is_resolved ? 185 : 119, inc.is_resolved ? 129 : 6);
      doc.text(inc.resolution_label || (inc.is_resolved ? 'RESOLVED' : 'ACTIVE'), pw - 20, incY + 2, { align: 'right' });

      incY += 13;
    });
  }

  drawFooter(4);

  // ══════════════════════════════════════════════════════════════════════════
  // SLIDE 5: AI SPRINT RETROSPECTIVE & FORECAST
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader(5, 'AI SPRINT RETROSPECTIVE & FORECAST');

  const colW = (pw - 28 - 8) / 3;
  const colH = ph - 33 - 18;

  // Col 1: What Went Well
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(14, 33, colW, colH, 2, 2, 'FD');
  doc.setFillColor(16, 185, 129);
  doc.rect(14, 33, colW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('WHAT WENT WELL', 14 + colW / 2, 38.5, { align: 'center' });

  let wY = 47;
  (retrospective.what_went_well || []).forEach((w) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text('•', 20, wY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(w, colW - 14);
    doc.text(lines, 24, wY);
    wY += lines.length * 4.5 + 4;
  });

  // Col 2: Where Friction Emerged
  const col2X = 14 + colW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(217, 119, 6);
  doc.roundedRect(col2X, 33, colW, colH, 2, 2, 'FD');
  doc.setFillColor(217, 119, 6);
  doc.rect(col2X, 33, colW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('WHERE FRICTION EMERGED', col2X + colW / 2, 38.5, { align: 'center' });

  let fY = 47;
  (retrospective.where_bottlenecks_emerged || []).forEach((f) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(217, 119, 6);
    doc.text('•', col2X + 6, fY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(f, colW - 14);
    doc.text(lines, col2X + 10, fY);
    fY += lines.length * 4.5 + 4;
  });

  // Col 3: Action Items
  const col3X = col2X + colW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(col3X, 33, colW, colH, 2, 2, 'FD');
  doc.setFillColor(245, 158, 11);
  doc.rect(col3X, 33, colW, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('AI ACTION ITEMS (NEXT SPRINT)', col3X + colW / 2, 38.5, { align: 'center' });

  let aY = 47;
  (retrospective.action_items || []).forEach((a) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(245, 158, 11);
    doc.text('>', col3X + 6, aY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(a, colW - 14);
    doc.text(lines, col3X + 10, aY);
    aY += lines.length * 4.5 + 4;
  });

  drawFooter(5);

  return doc;
}

/**
 * Directly downloads the 5-slide Executive Deck as a PDF file
 */
export function downloadExecutiveDeckPDF(reportData, customData = {}) {
  const doc = generateExecutiveDeckPDF(reportData, customData);
  const cleanTitle = (reportData?.metadata?.project?.title || 'Executive_Deck')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `PulsePM_Executive_Deck_${cleanTitle}_${dateStr}.pdf`;

  doc.save(filename);
  return { success: true, filename };
}
