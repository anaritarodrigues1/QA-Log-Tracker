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
      
      row.innerHTML = `
        <td>${bug.id}</td>
        <td>${bug.title}</td>
        <td><span class="${priorityClass}">${bug.priority}</span></td>
        <td><span class="${statusClass}">${bug.status}</span></td>
        <td>${new Date(bug.created_at).toLocaleDateString('en-GB')}</td>
        <td><button class="btn-edit" onclick="editBug(${bug.id}, '${bug.status}', '${bug.priority}')">Edit</button></td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error updating bugs:', error);
  }
}

function editBug(id, status, priority) {
  const modal = document.getElementById('bugModal');
  document.getElementById('edit-bug-id').value = id;
  document.getElementById('edit-bug-status').value = status;
  document.getElementById('edit-bug-priority').value = priority;
  modal.classList.add('active');
}

document.getElementById('edit-bug-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('edit-bug-id').value;
  const status = document.getElementById('edit-bug-status').value;
  const priority = document.getElementById('edit-bug-priority').value;
  
  try {
    const response = await fetch(`/api/bugs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, priority })
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
        <td><button class="btn-edit" onclick="viewLogDetails(${log.id})">View Details</button></td>
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading logs:', error);
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
    
    // Trend Chart
    if (trendChart) trendChart.destroy();
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: metrics.bugsTrend.map(b => b.date),
        datasets: [{
          label: 'Bugs',
          data: metrics.bugsTrend.map(b => b.count),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#667eea',
          pointBorderColor: 'white',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true }
        },
        scales: {
          y: { beginAtZero: true }
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
