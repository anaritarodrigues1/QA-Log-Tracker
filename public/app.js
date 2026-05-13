// Switch to a tab and optionally pre-apply a status filter (used by metric card clicks)
function navigateTo(tabName, statusFilter = '') {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(tabName).classList.add('active');
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  if (tabName === 'bugs') {
    // Reset filters first, then apply the requested one
    document.getElementById('filter-priority').value = '';
    document.getElementById('filter-status').value = statusFilter;
    loadBugs();
  }
  if (tabName === 'logs') loadLogs();
  if (tabName === 'dashboard') loadDashboard();
}

// Global tooltip for bug descriptions — appended to body to escape table's overflow:hidden
const descTooltip = document.createElement('div');
descTooltip.id = 'desc-tooltip';
document.body.appendChild(descTooltip);

document.getElementById('bugs-table').addEventListener('mouseover', (e) => {
  const cell = e.target.closest('[data-full]');
  // Hide tooltip when no cell matched or the description is already expanded inline
  if (!cell || cell.querySelector('.desc-wrapper.expanded')) {
    descTooltip.style.display = 'none';
    return;
  }
  const fullText = cell.dataset.full;
  if (!fullText) { descTooltip.style.display = 'none'; return; }

  const rect = cell.getBoundingClientRect();
  descTooltip.textContent = fullText;
  descTooltip.style.display = 'block';
  descTooltip.style.top  = `${rect.bottom + window.scrollY + 8}px`;
  descTooltip.style.left = `${rect.left + window.scrollX}px`;
});

document.getElementById('bugs-table').addEventListener('mouseleave', () => {
  descTooltip.style.display = 'none';
});

// Toggle inline expansion of a bug description
function toggleDesc(btn) {
  const wrapper = btn.closest('.desc-wrapper');
  const isExpanded = wrapper.classList.toggle('expanded');
  btn.textContent = isExpanded ? '−' : '+';
  // Hide the hover tooltip while the description is expanded
  descTooltip.style.display = 'none';
}

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    // Remove active class from all tabs and buttons
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Add active class
    document.getElementById(tabName).classList.add('active');
    btn.classList.add('active');

    // Load data when switching tabs
    if (tabName === 'bugs') loadBugs();
    if (tabName === 'logs') loadLogs();
    if (tabName === 'dashboard') loadDashboard();
  });
});

// ===== BUG MANAGEMENT =====
document.getElementById('bug-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('bug-title').value;
  const description = document.getElementById('bug-description').value;
  const priority = document.getElementById('bug-priority').value;
  
  try {
    const response = await fetch('/api/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, priority })
    });
    
    const data = await response.json();
    if (response.ok) {
      alert('✅ Bug reported with success!');
      document.getElementById('bug-form').reset();
      loadBugs();
      loadDashboard();
    }
  } catch (error) {
    alert('❌ Error reporting bug: ' + error.message);
  }
});

async function loadBugs() {
  const priority = document.getElementById('filter-priority').value;
  const status = document.getElementById('filter-status').value;
  
  const params = new URLSearchParams();
  if (priority) params.append('priority', priority);
  if (status) params.append('status', status);
  
  try {
    const response = await fetch(`/api/bugs?${params}`);
    const bugs = await response.json();
    
    const tbody = document.querySelector('#bugs-table tbody');
    tbody.innerHTML = '';
    
    bugs.forEach(bug => {
      const row = document.createElement('tr');
      const priorityClass = `priority-${bug.priority.toLowerCase()}`;
      const statusClass = `status-${bug.status.toLowerCase().replace(' ', '-')}`;
      
      // Escape quotes so the data-full attribute stays valid
      const escapedDesc = (bug.description || '').replace(/"/g, '&quot;');
      const descHtml = bug.description
        ? `<div class="desc-wrapper">
             <span class="desc-text">${bug.description}</span>
             <button class="btn-expand-desc" onclick="toggleDesc(this)" title="Expand description">+</button>
           </div>`
        : '<span class="no-description">—</span>';

      row.innerHTML = `
        <td>${bug.id}</td>
        <td>${bug.title}</td>
        <td class="bug-description" data-full="${escapedDesc}">${descHtml}</td>
        <td><span class="${priorityClass}">${bug.priority}</span></td>
        <td><span class="${statusClass}">${bug.status}</span></td>
        <td>${new Date(bug.created_at).toLocaleDateString('en-GB')}</td>
        <td class="action-cell">
          <button class="btn-edit"
              data-id="${bug.id}"
              data-status="${bug.status}"
              data-priority="${bug.priority}"
              data-description="${escapedDesc}"
              onclick="editBug(this)">Edit</button>
          <button class="btn-delete" onclick="deleteBug(${bug.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error updating bugs:', error);
  }
}

async function deleteBug(id) {
  if (!confirm('Delete this bug? This action cannot be undone.')) return;
  try {
    const response = await fetch(`/api/bugs/${id}`, { method: 'DELETE' });
    if (response.ok) {
      loadBugs();
      loadDashboard();
    }
  } catch (error) {
    alert('❌ Error deleting bug: ' + error.message);
  }
}

function editBug(btn) {
  document.getElementById('edit-bug-id').value          = btn.dataset.id;
  document.getElementById('edit-bug-status').value      = btn.dataset.status;
  document.getElementById('edit-bug-priority').value    = btn.dataset.priority;
  document.getElementById('edit-bug-description').value = btn.dataset.description || '';
  document.getElementById('bugModal').classList.add('active');
}

document.getElementById('edit-bug-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id          = document.getElementById('edit-bug-id').value;
  const status      = document.getElementById('edit-bug-status').value;
  const priority    = document.getElementById('edit-bug-priority').value;
  const description = document.getElementById('edit-bug-description').value;

  try {
    const response = await fetch(`/api/bugs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, priority, description })
    });
    
    if (response.ok) {
      alert('✅ Bug updated!');
      document.getElementById('bugModal').classList.remove('active');
      loadBugs();
      loadDashboard();
    }
  } catch (error) {
    alert('❌ Error updating bug: ' + error.message);
  }
});

// ===== LOG MANAGEMENT =====
document.getElementById('log-form-file').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const file = document.getElementById('log-file').files[0];
  if (!file) return;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    if (response.ok) {
      alert(`✅ Log analyzed! ${data.errorCount} errors found.`);
      document.getElementById('log-form-file').reset();
      loadLogs();
      loadDashboard();
    }
  } catch (error) {
    alert('❌ Error uploading log: ' + error.message);
  }
});

document.getElementById('log-form-text').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const logText = document.getElementById('log-text').value;
  if (!logText.trim()) {
    alert('⚠️ Paste log content first');
    return;
  }
  
  try {
    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logText })
    });
    
    const data = await response.json();
    if (response.ok) {
      alert(`✅ Log analyzed! ${data.errorCount} errors found.`);
      document.getElementById('log-form-text').reset();
      loadLogs();
      loadDashboard();
    }
  } catch (error) {
    alert('❌ Error analyzing log: ' + error.message);
  }
});

async function loadLogs() {
  try {
    const response = await fetch('/api/logs');
    const logs = await response.json();
    
    const tbody = document.querySelector('#logs-table tbody');
    tbody.innerHTML = '';
    
    logs.forEach(log => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${log.id}</td>
        <td>${log.file_name}</td>
        <td><span style="color: #d32f2f; font-weight: bold;">${log.error_count}</span></td>
        <td>${new Date(log.created_at).toLocaleDateString('pt-PT')}</td>
        <td class="action-cell">
          <button class="btn-edit" onclick="viewLogDetails(${log.id})">View Details</button>
          <button class="btn-delete" onclick="deleteLog(${log.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading logs:', error);
  }
}

async function deleteLog(id) {
  if (!confirm('Delete this log? This action cannot be undone.')) return;
  try {
    const response = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
    if (response.ok) {
      loadLogs();
      loadDashboard();
    }
  } catch (error) {
    alert('❌ Error deleting log: ' + error.message);
  }
}

async function viewLogDetails(logId) {
  try {
    const response = await fetch(`/api/logs/${logId}`);
    const log = await response.json();
    
    const detailsDiv = document.getElementById('log-details');
    let html = `
      <p><strong>File:</strong> ${log.file_name}</p>
      <p><strong>Total Errors:</strong> <span style="color: #d32f2f; font-weight: bold;">${log.error_count}</span></p>
      <p><strong>Date:</strong> ${new Date(log.created_at).toLocaleString('en-GB')}</p>
    `;
    
    if (log.errorPatterns && log.errorPatterns.length > 0) {
      html += '<h4>Detected Error Patterns:</h4><div class="error-list">';
      log.errorPatterns.forEach(([pattern, count]) => {
        html += `<p>• <strong>${count}x</strong> - ${pattern}</p>`;
      });
      html += '</div>';
    }
    
    detailsDiv.innerHTML = html;
    document.getElementById('logModal').classList.add('active');
  } catch (error) {
    alert('❌ Error loading details: ' + error.message);
  }
}

// ===== DASHBOARD & CHARTS =====
let priorityChart, statusChart, trendChart, errorsChart;

async function loadDashboard() {
  try {
    const response = await fetch('/api/metrics');
    const metrics = await response.json();
    
    // Update metric cards
    document.getElementById('total-bugs').textContent = metrics.totalBugs;
    document.getElementById('total-logs').textContent = metrics.totalLogs;
    
    const openBugs = metrics.bugsByStatus.find(b => b.status === 'Open')?.count || 0;
    document.getElementById('open-bugs').textContent = openBugs;
    
    // Priority Chart
    if (priorityChart) priorityChart.destroy();
    const priorityCtx = document.getElementById('priorityChart').getContext('2d');
    priorityChart = new Chart(priorityCtx, {
      type: 'doughnut',
      data: {
        labels: metrics.bugsByPriority.map(b => b.priority),
        datasets: [{
          data: metrics.bugsByPriority.map(b => b.count),
          backgroundColor: ['#388e3c', '#fbc02d', '#f57c00', '#d32f2f'],
          borderColor: 'white',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
    
    // Status Chart
    if (statusChart) statusChart.destroy();
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: metrics.bugsByStatus.map(b => b.status),
        datasets: [{
          data: metrics.bugsByStatus.map(b => b.count),
          backgroundColor: ['#d32f2f', '#fbc02d', '#388e3c'],
          borderColor: 'white',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
    
    // Trend Chart — always show last 7 days so empty days render as 0
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const trendMap = Object.fromEntries(metrics.bugsTrend.map(b => [b.date, b.count]));
    const trendLabels = last7Days.map(date =>
      new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    );
    const trendData = last7Days.map(date => trendMap[date] || 0);

    if (trendChart) trendChart.destroy();
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: trendLabels,
        datasets: [{
          label: 'Bugs reported',
          data: trendData,
          backgroundColor: 'rgba(99, 102, 241, 0.25)',
          borderColor: '#6366f1',
          borderWidth: 2,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    });
    
    // Top Errors Chart
    if (errorsChart) errorsChart.destroy();
    const errorsCtx = document.getElementById('errorsChart').getContext('2d');
    errorsChart = new Chart(errorsCtx, {
      type: 'bar',
      data: {
        labels: metrics.topErrors.map(e => e.error.substring(0, 30) + (e.error.length > 30 ? '...' : '')),
        datasets: [{
          label: 'Occurrences',
          data: metrics.topErrors.map(e => e.count),
          backgroundColor: '#764ba2',
          borderColor: '#667eea',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true }
        }
      }
    });
  } catch (error) {
    console.error('Error loading metrics:', error);
  }
}

// ===== MODAL HANDLING =====
document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.addEventListener('click', (e) => {
    e.target.closest('.modal').classList.remove('active');
  });
});

window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// Load dashboard on page load
window.addEventListener('load', () => {
  loadDashboard();
  loadBugs();
  loadLogs();
});
