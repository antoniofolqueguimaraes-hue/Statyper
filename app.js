const sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "Programming is the art of telling another human what one wants the computer to do.",
    "A language that doesn't affect the way you think about programming is not worth knowing.",
    "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    "First, solve the problem. Then, write the code.",
    "Experience is the name everyone gives to their mistakes.",
    "In order to understand recursion, one must first understand recursion.",
    "Simplicity is the soul of efficiency.",
    "Before software can be reusable it first has to be usable.",
    "Make it work, make it right, make it fast."
];

// DOM Elements
const tabs = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view');
const sentenceDisplay = document.getElementById('sentence-display');
const typingInput = document.getElementById('typing-input');
const timerDisplay = document.getElementById('timer');
const restartBtn = document.getElementById('restart-btn');
const resultsModal = document.getElementById('results-modal');
const nextBtn = document.getElementById('next-btn');
const retryBtn = document.getElementById('retry-btn');
const recordsBody = document.getElementById('records-body');
const clearRecordsBtn = document.getElementById('clear-records-btn');
const noRecordsMsg = document.getElementById('no-records');
const tableContainer = document.querySelector('.table-container');

// Results elements
const resWpm = document.getElementById('res-wpm');
const resAcc = document.getElementById('res-acc');
const resTime = document.getElementById('res-time');
const resErr = document.getElementById('res-err');
const chartCanvas = document.getElementById('performance-chart');

// State
let currentSentence = "";
let typedText = "";
let timerInterval = null;
let startTime = null;
let isPlaying = false;
let totalErrors = 0;
let currentErrors = 0; // errors in current keystroke sequence
let timeElapsed = 0;
let chartInstance = null;
let performanceData = []; // Array to store {time, cps}

// Initialize
function init() {
    setupTabs();
    setupTyping();
    loadRecords();
    startNewGame();
}

// Tab Navigation
function setupTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab button
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active view
            const targetView = tab.getAttribute('data-tab');
            views.forEach(v => {
                v.classList.remove('active');
                if (v.id === `${targetView}-view`) {
                    v.classList.add('active');
                }
            });
            
            if (targetView === 'game' && !resultsModal.classList.contains('hidden') === false) {
                typingInput.focus();
            }
        });
    });
}

// Game Logic
function startNewGame(retry = false) {
    if (!retry) {
        currentSentence = sentences[Math.floor(Math.random() * sentences.length)];
    }
    
    typedText = "";
    totalErrors = 0;
    timeElapsed = 0;
    isPlaying = false;
    performanceData = [];
    clearInterval(timerInterval);
    
    timerDisplay.textContent = "0.0s";
    typingInput.value = "";
    typingInput.disabled = false;
    resultsModal.classList.add('hidden');
    
    renderSentence();
    
    // Focus input and show cursor on first char
    typingInput.focus();
}

function renderSentence() {
    sentenceDisplay.innerHTML = '';
    const chars = currentSentence.split('');
    
    chars.forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        
        if (index < typedText.length) {
            if (typedText[index] === char) {
                span.classList.add('correct');
            } else {
                span.classList.add('incorrect');
            }
        } else if (index === typedText.length) {
            span.classList.add('current');
        }
        
        sentenceDisplay.appendChild(span);
    });
}

function setupTyping() {
    // Focus the hidden input when clicking on the sentence display area
    document.querySelector('.typing-container').addEventListener('click', () => {
        if (!typingInput.disabled) {
            typingInput.focus();
        }
    });

    typingInput.addEventListener('input', (e) => {
        if (!isPlaying && typingInput.value.length === 1) {
            startTimer();
            isPlaying = true;
        }
        
        const newValue = typingInput.value;
        
        // Count errors on the fly (if they typed a new character and it's wrong)
        if (newValue.length > typedText.length) {
            const charTyped = newValue[newValue.length - 1];
            const expectedChar = currentSentence[newValue.length - 1];
            if (charTyped !== expectedChar) {
                totalErrors++;
            }
        }
        
        typedText = newValue;
        
        // Ensure we don't type more than the sentence length
        if (typedText.length > currentSentence.length) {
            typedText = typedText.slice(0, currentSentence.length);
            typingInput.value = typedText;
        }
        
        renderSentence();
        
        // Track performance data for chart (every 0.5s or similar)
        
        if (typedText.length === currentSentence.length) {
            endGame();
        }
    });

    restartBtn.addEventListener('click', () => startNewGame(true));
    nextBtn.addEventListener('click', () => startNewGame(false));
    retryBtn.addEventListener('click', () => startNewGame(true));
    clearRecordsBtn.addEventListener('click', clearRecords);
}

function startTimer() {
    startTime = Date.now();
    let lastRecordTime = startTime;
    let charsTypedSinceLastRecord = 0;
    
    timerInterval = setInterval(() => {
        const now = Date.now();
        timeElapsed = (now - startTime) / 1000;
        timerDisplay.textContent = timeElapsed.toFixed(1) + "s";
        
        // Record performance data every 0.5 seconds
        if (now - lastRecordTime >= 500) {
            const correctChars = document.querySelectorAll('.sentence-display span.correct').length;
            const cps = (correctChars - charsTypedSinceLastRecord) / ((now - lastRecordTime) / 1000);
            
            performanceData.push({
                time: parseFloat(timeElapsed.toFixed(1)),
                cps: Math.max(0, cps)
            });
            
            charsTypedSinceLastRecord = correctChars;
            lastRecordTime = now;
        }
    }, 100);
}

function endGame() {
    clearInterval(timerInterval);
    isPlaying = false;
    typingInput.disabled = true;
    
    // Calculate Stats
    const minutes = timeElapsed / 60;
    const words = currentSentence.length / 5; // Standard WPM calculation (5 chars = 1 word)
    const wpm = Math.round(words / minutes);
    
    const accuracy = Math.max(0, Math.round(((currentSentence.length - totalErrors) / currentSentence.length) * 100));
    
    // Display Stats
    resWpm.textContent = wpm;
    resAcc.textContent = accuracy + "%";
    resTime.textContent = timeElapsed.toFixed(1) + "s";
    resErr.textContent = totalErrors;
    
    // Show Modal
    resultsModal.classList.remove('hidden');
    
    // Render Chart
    renderChart();
    
    // Save Record
    saveRecord({
        date: new Date().toISOString(),
        sentence: currentSentence,
        wpm,
        accuracy,
        time: parseFloat(timeElapsed.toFixed(1)),
        errors: totalErrors
    });
}

function renderChart() {
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Ensure we have at least some data points
    if (performanceData.length === 0) {
        performanceData.push({ time: 0, cps: 0 });
        performanceData.push({ time: timeElapsed, cps: currentSentence.length / timeElapsed });
    }
    
    const labels = performanceData.map(d => d.time + 's');
    const data = performanceData.map(d => d.cps);
    
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Speed (Chars/Sec)',
                data: data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                pointBackgroundColor: '#14b8a6',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(1)} CPS`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Characters / Sec',
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Time (s)',
                        color: '#94a3b8'
                    }
                }
            }
        }
    });
}

// Records Management
function saveRecord(record) {
    let records = getRecords();
    records.unshift(record); // Add to beginning
    localStorage.setItem('antigravity_records', JSON.stringify(records));
    renderRecordsList(records);
}

function getRecords() {
    const saved = localStorage.getItem('antigravity_records');
    return saved ? JSON.parse(saved) : [];
}

function loadRecords() {
    const records = getRecords();
    renderRecordsList(records);
}

function renderRecordsList(records) {
    recordsBody.innerHTML = '';
    
    if (records.length === 0) {
        tableContainer.classList.add('hidden');
        noRecordsMsg.classList.remove('hidden');
        return;
    }
    
    tableContainer.classList.remove('hidden');
    noRecordsMsg.classList.add('hidden');
    
    records.forEach(record => {
        const tr = document.createElement('tr');
        
        const dateObj = new Date(record.date);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        tr.innerHTML = `
            <td>
                <div style="font-weight: 500">${dateStr}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${record.sentence}">${record.sentence}</div>
            </td>
            <td style="color: var(--accent-secondary); font-weight: 600;">${record.wpm}</td>
            <td style="color: var(--success); font-weight: 600;">${record.accuracy}%</td>
            <td>${record.time}s</td>
            <td style="color: ${record.errors > 0 ? 'var(--error)' : 'var(--text-primary)'}">${record.errors}</td>
        `;
        recordsBody.appendChild(tr);
    });
}

function clearRecords() {
    if (confirm('Are you sure you want to clear all your typing records? This cannot be undone.')) {
        localStorage.removeItem('antigravity_records');
        renderRecordsList([]);
    }
}

// Start application
init();
