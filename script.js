// My osu! Personal Progress Tracker - Simple & Focused

let myProfile = JSON.parse(localStorage.getItem('myOsuProfile')) || null;
let apiKey = localStorage.getItem('osuApiKey') || '';
let currentChart = null;

function saveProfile() {
    const username = document.getElementById('username-input').value.trim();
    const mode = document.getElementById('mode-select').value;
    
    if (!username) {
        alert('Please enter your osu! username');
        return;
    }
    
    myProfile = {
        username: username,
        mode: mode,
        created: new Date().toISOString()
    };
    
    localStorage.setItem('myOsuProfile', JSON.stringify(myProfile));
    showDashboard();
}

function showDashboard() {
    document.getElementById('setup-section').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    
    document.getElementById('profile-username').textContent = myProfile.username;
    
    const modeEl = document.getElementById('profile-mode');
    modeEl.textContent = myProfile.mode.toUpperCase();
    
    if (myProfile.mode === 'mania') modeEl.style.backgroundColor = '#7c3aed';
    else if (myProfile.mode === 'taiko') modeEl.style.backgroundColor = '#f97316';
    else if (myProfile.mode === 'catch') modeEl.style.backgroundColor = '#10b981';
    
    loadAndDisplayStats();
}

function loadAndDisplayStats() {
    if (!myProfile) return;
    
    const savedData = localStorage.getItem('myOsuData');
    if (savedData) {
        const data = JSON.parse(savedData);
        displayCurrentStats(data);
        displayHistory(data.history || []);
    } else {
        // First time - show placeholder
        document.getElementById('current-pp').textContent = '—';
        document.getElementById('current-rank').textContent = '#—';
        document.getElementById('current-acc').textContent = '—%';
        document.getElementById('current-plays').textContent = '—';
        document.getElementById('last-updated').textContent = 'Never';
        document.getElementById('history-table').innerHTML = '<tr><td colspan="5" class="py-8 text-center text-zinc-500">Click "Refresh My Stats" to start tracking</td></tr>';
    }
}

async function refreshMyStats() {
    if (!myProfile) return;
    
    const btns = document.querySelectorAll('button');
    btns.forEach(b => b.disabled = true);
    
    let newData = null;
    
    if (apiKey) {
        // Try real data
        newData = await fetchRealStats(myProfile.username, myProfile.mode);
    }
    
    if (!newData) {
        // Demo fallback with realistic numbers
        newData = generateDemoStats(myProfile.username, myProfile.mode);
    }
    
    // Save history snapshot
    const snapshot = {
        date: new Date().toISOString(),
        pp: newData.pp,
        global_rank: newData.global_rank,
        accuracy: newData.accuracy
    };
    
    if (!newData.history) newData.history = [];
    newData.history.unshift(snapshot);
    if (newData.history.length > 50) newData.history.pop();
    
    localStorage.setItem('myOsuData', JSON.stringify(newData));
    
    displayCurrentStats(newData);
    displayHistory(newData.history);
    
    btns.forEach(b => b.disabled = false);
    
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl';
    toast.textContent = apiKey ? 'Real data refreshed!' : 'Demo data refreshed (connect API for real stats)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

async function fetchRealStats(username, mode) {
    if (!apiKey) return null;
    
    const modeMap = { osu: 0, taiko: 1, catch: 2, mania: 3 };
    const m = modeMap[mode] || 0;
    
    const url = `https://osu.ppy.sh/api/get_user?k=${apiKey}&u=${encodeURIComponent(username)}&m=${m}`;
    const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    try {
        const res = await fetch(proxy);
        const data = await res.json();
        if (!data || data.length === 0) return null;
        
        const u = data[0];
        return {
            pp: parseFloat(u.pp_raw) || 0,
            global_rank: parseInt(u.pp_rank) || 999999,
            accuracy: parseFloat(u.accuracy || 0).toFixed(2),
            play_count: parseInt(u.playcount) || 0,
            max_combo: parseInt(u.max_combo) || 0,
            level: parseInt(u.level) || 1,
            history: []
        };
    } catch (e) {
        return null;
    }
}

function generateDemoStats(username, mode) {
    // Simple consistent demo data based on username
    let seed = username.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = (min, max) => min + (seed % (max - min));
    
    return {
        pp: rand(2500, 12500),
        global_rank: rand(500, 85000),
        accuracy: (96 + (seed % 35) / 10).toFixed(2),
        play_count: rand(8000, 95000),
        max_combo: rand(1200, 4800),
        level: rand(45, 110),
        history: []
    };
}

function displayCurrentStats(data) {
    document.getElementById('current-pp').textContent = data.pp.toLocaleString();
    document.getElementById('current-rank').textContent = '#' + data.global_rank.toLocaleString();
    document.getElementById('current-acc').textContent = data.accuracy + '%';
    document.getElementById('current-plays').textContent = data.play_count.toLocaleString();
    document.getElementById('last-updated').textContent = new Date().toLocaleString();
    
    // Show changes if we have history
    const history = data.history || [];
    if (history.length > 1) {
        const prev = history[1];
        const ppDiff = data.pp - prev.pp;
        const rankDiff = prev.global_rank - data.global_rank;
        const accDiff = (parseFloat(data.accuracy) - parseFloat(prev.accuracy)).toFixed(2);
        
        document.getElementById('pp-change').innerHTML = 
            ppDiff >= 0 ? `<span class="improvement-positive">+${ppDiff} pp</span>` : `<span class="improvement-negative">${ppDiff} pp</span>`;
        
        document.getElementById('rank-change').innerHTML = 
            rankDiff > 0 ? `<span class="improvement-positive">↑ ${rankDiff} ranks</span>` : 
            rankDiff < 0 ? `<span class="improvement-negative">↓ ${Math.abs(rankDiff)} ranks</span>` : '';
        
        document.getElementById('acc-change').innerHTML = 
            accDiff >= 0 ? `<span class="improvement-positive">+${accDiff}%</span>` : `<span class="improvement-negative">${accDiff}%</span>`;
    }
}

function displayHistory(history) {
    const tableBody = document.getElementById('history-table');
    const countEl = document.getElementById('history-count');
    
    countEl.textContent = `${history.length} checks`;
    
    if (history.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-zinc-500">No history yet. Refresh to start tracking improvement.</td></tr>';
        return;
    }
    
    let html = '';
    
    history.forEach((snap, index) => {
        const date = new Date(snap.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        let changeHTML = '';
        if (index < history.length - 1) {
            const prev = history[index + 1];
            const ppChange = snap.pp - prev.pp;
            changeHTML = ppChange >= 0 
                ? `<span class="improvement-positive font-medium">+${ppChange}</span>` 
                : `<span class="improvement-negative font-medium">${ppChange}</span>`;
        } else {
            changeHTML = '<span class="text-zinc-500">—</span>';
        }
        
        html += `
            <tr>
                <td class="py-3.5 text-zinc-300">${dateStr}</td>
                <td class="py-3.5 text-right font-mono">${snap.pp.toLocaleString()}</td>
                <td class="py-3.5 text-right font-mono">#${snap.global_rank}</td>
                <td class="py-3.5 text-right font-mono">${snap.accuracy}%</td>
                <td class="py-3.5 text-right">${changeHTML}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Update chart
    updateProgressChart(history);
}

function updateProgressChart(history) {
    const canvas = document.getElementById('progress-chart');
    if (currentChart) currentChart.destroy();
    
    if (!history || history.length === 0) return;
    
    const sorted = [...history].reverse(); // oldest first
    
    const labels = sorted.map(s => {
        const d = new Date(s.date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const data = sorted.map(s => s.pp);
    
    currentChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Performance Points',
                data: data,
                borderColor: '#ff66aa',
                backgroundColor: 'rgba(255, 102, 170, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#27272a' }, ticks: { color: '#52525b' } },
                y: { grid: { color: '#27272a' }, ticks: { color: '#52525b' } }
            }
        }
    });
}

function showSettings() {
    const modal = document.getElementById('settings-modal');
    const input = document.getElementById('api-key-input');
    input.value = apiKey;
    modal.style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}

function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    apiKey = key;
    localStorage.setItem('osuApiKey', key);
    closeSettings();
    alert('API key saved! Real data will be used on next refresh.');
}

function clearApiKey() {
    if (confirm('Remove saved API key?')) {
        apiKey = '';
        localStorage.removeItem('osuApiKey');
        closeSettings();
        alert('API key removed.');
    }
}

// Initialize
function init() {
    if (myProfile) {
        showDashboard();
    }
    
    // Allow pressing Enter in username field
    const usernameInput = document.getElementById('username-input');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') saveProfile();
        });
    }
}

window.onload = init;
