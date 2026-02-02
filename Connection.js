// ===== Chart Instances =====
let idmtChart = null;
let regionChart = null;

// ===== Phase Constants =====
const PHASE_FAULT = {
    R: -90,
    Y: 150,
    B: 30
};

const EARTH_FAULT = {
    R: 0,
    Y: -120,
    B: 120
};

// ===== Calculator Switcher =====
function switchCalculator(type) {
    const buttons = document.querySelectorAll('.calc-type-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.calc === type) {
            btn.classList.add('active');
        }
    });

    const sections = document.querySelectorAll('.calculator-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    document.getElementById(type + '-calc').classList.add('active');

    document.getElementById('result').innerHTML = '';
    document.getElementById('region-result').innerHTML = '';
    document.getElementById('idmt-graph-container').style.display = 'none';
    document.getElementById('region-graph-container').style.display = 'none';
}

// ===== Update Phase Info Display =====
function updatePhaseInfo() {
    const faultType = document.getElementById('faultType').value;
    const constants = faultType === 'EARTH' ? EARTH_FAULT : PHASE_FAULT;

    document.getElementById('r-phase-label').textContent = `R-Phase: ${constants.R}°`;
    document.getElementById('y-phase-label').textContent = `Y-Phase: ${constants.Y}°`;
    document.getElementById('b-phase-label').textContent = `B-Phase: ${constants.B}°`;

    document.getElementById('region-result').innerHTML = '';
    document.getElementById('region-graph-container').style.display = 'none';
}

// ===== IDMT Calculator =====
function calculate() {
    const curve = document.getElementById("curveType").value;
    const resultBox = document.getElementById("result");
    const graphContainer = document.getElementById("idmt-graph-container");

    let beta, alpha, curveName;

    if (curve === "SI") {
        beta = 0.14; alpha = 0.02; curveName = "Standard Inverse";
    } else if (curve === "VI") {
        beta = 13.5; alpha = 1; curveName = "Very Inverse";
    } else if (curve === "EI") {
        beta = 80; alpha = 2; curveName = "Extremely Inverse";
    } else if (curve === "LTI") {
        beta = 120; alpha = 1.0; curveName = "Long Time Inverse";
    }

    const tms = parseFloat(document.getElementById("tms").value);
    const fCurrent = parseFloat(document.getElementById("fCurrent").value);
    const sCurrent = parseFloat(document.getElementById("sCurrent").value);

    if (curve === "CT") {
        resultBox.className = "result-box error";
        resultBox.innerHTML = '<p class="error-text">⚠️ Please select a curve type</p>';
        graphContainer.style.display = 'none';
        return;
    }

    if (isNaN(tms) || isNaN(fCurrent) || isNaN(sCurrent)) {
        resultBox.className = "result-box error";
        resultBox.innerHTML = '<p class="error-text">⚠️ Please fill all input fields</p>';
        graphContainer.style.display = 'none';
        return;
    }

    if (fCurrent <= sCurrent) {
        resultBox.className = "result-box error";
        resultBox.innerHTML = '<p class="error-text">⚠️ Fault current must be greater than set current</p>';
        graphContainer.style.display = 'none';
        return;
    }

    const ratio = fCurrent / sCurrent;
    const power = Math.pow(ratio, alpha);
    const t = (beta * tms) / (power - 1);

    resultBox.className = "result-box";
    resultBox.innerHTML = `<p class="result-value">⏱️ Tripping Time: ${t.toFixed(4)} seconds</p>`;

    generateIDMTGraph(beta, alpha, tms, sCurrent, fCurrent, t, curveName);
}

// ===== IDMT Graph =====
function generateIDMTGraph(beta, alpha, tms, sCurrent, fCurrent, calculatedTime, curveName) {
    const graphContainer = document.getElementById("idmt-graph-container");
    const ctx = document.getElementById("idmtChart").getContext("2d");

    graphContainer.style.display = 'block';

    const dataPoints = [];
    const ratios = [];

    for (let ratio = 1.1; ratio <= 20; ratio += 0.2) {
        const power = Math.pow(ratio, alpha);
        const time = (beta * tms) / (power - 1);
        if (time > 0 && time < 1000) {
            ratios.push(ratio.toFixed(1));
            dataPoints.push(time);
        }
    }

    if (idmtChart) idmtChart.destroy();

    idmtChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ratios,
            datasets: [{
                label: `${curveName} (TMS=${tms})`,
                data: dataPoints,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }, {
                label: `Result: ${calculatedTime.toFixed(2)}s`,
                data: ratios.map(r => Math.abs(parseFloat(r) - fCurrent / sCurrent) < 0.2 ? calculatedTime : null),
                borderColor: '#ef4444',
                backgroundColor: '#ef4444',
                pointRadius: 8,
                showLine: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' },
                datalabels: { display: false }
            },
            scales: {
                x: { title: { display: true, text: 'I/Is' } },
                y: { title: { display: true, text: 'Time (s)' }, type: 'logarithmic', min: 0.01 }
            }
        }
    });
}

// ===== Directionality Calculator =====
function calculateRegion() {
    const resultBox = document.getElementById("region-result");
    const graphContainer = document.getElementById("region-graph-container");
    const RCA = parseFloat(document.getElementById("rcaValue").value);
    const selectedPhase = document.getElementById("phaseSelect").value;
    const faultType = document.getElementById("faultType").value;

    const constants = faultType === 'EARTH' ? EARTH_FAULT : PHASE_FAULT;
    const faultLabel = faultType === 'EARTH' ? 'Earth Fault' : 'Over Current';

    const pk = 90, nk = -90;

    if (isNaN(RCA)) {
        resultBox.className = "result-box error";
        resultBox.innerHTML = '<p class="error-text">⚠️ Please enter an RCA value</p>';
        graphContainer.style.display = 'none';
        return;
    }

    const phases = {
        R: { base: constants.R, positive: pk + RCA + constants.R, negative: nk + RCA + constants.R, color: '#dc2626', colorLight: 'rgba(220, 38, 38, 0.3)', name: 'R-Phase' },
        Y: { base: constants.Y, positive: pk + RCA + constants.Y, negative: nk + RCA + constants.Y, color: '#ca8a04', colorLight: 'rgba(202, 138, 4, 0.3)', name: 'Y-Phase' },
        B: { base: constants.B, positive: pk + RCA + constants.B, negative: nk + RCA + constants.B, color: '#2563eb', colorLight: 'rgba(37, 99, 235, 0.3)', name: 'B-Phase' }
    };

    let resultHTML = `<div class="fault-type-label">${faultLabel} Directionality</div><div class="phase-results">`;

    if (selectedPhase === 'ALL') {
        for (const [key, phase] of Object.entries(phases)) {
            resultHTML += buildPhaseResultCard(key, phase);
        }
    } else {
        resultHTML += buildPhaseResultCard(selectedPhase, phases[selectedPhase]);
    }

    resultHTML += '</div>';
    resultBox.className = "result-box";
    resultBox.innerHTML = resultHTML;

    document.getElementById("graph-title-text").textContent = `📊 ${faultLabel} - Vector Diagram`;
    generatePolarGraph(RCA, phases, selectedPhase, faultLabel);
}

function buildPhaseResultCard(key, phase) {
    // Positive: counter-clockwise (0-360)
    let posDisplay = phase.positive < 0 ? phase.positive + 360 : phase.positive;

    // Negative: clockwise convention (negative degrees)
    let negDisplay = phase.negative;
    if (negDisplay > 180) negDisplay = negDisplay - 360;
    if (negDisplay < -360) negDisplay += 360;

    return `
        <div class="phase-result-card ${key.toLowerCase()}-phase">
            <div class="phase-result-title">
                <span class="phase-dot"></span>
                ${phase.name} (Base: ${phase.base}°)
            </div>
            <div class="region-values">
                <span class="region-tag positive">+ve: +${posDisplay.toFixed(1)}°</span>
                <span class="region-tag negative">-ve: ${negDisplay.toFixed(1)}°</span>
            </div>
        </div>
    `;
}

// ===== Polar Graph with Labels =====
function generatePolarGraph(RCA, phases, selectedPhase, faultLabel) {
    const graphContainer = document.getElementById("region-graph-container");
    const legendContainer = document.getElementById("graph-legend");
    const ctx = document.getElementById("regionChart").getContext("2d");

    graphContainer.style.display = 'block';

    if (regionChart) regionChart.destroy();

    const phasesToShow = selectedPhase === 'ALL' ? ['R', 'Y', 'B'] : [selectedPhase];
    const datasets = [];
    const outerRadius = 110;  // Outer circle for positive (anti-clockwise)
    const innerRadius = 70;   // Inner circle for negative (clockwise)

    // Store region data for the custom plugin
    const regionsToShade = [];

    // Create vectors and collect shaded regions for each phase
    phasesToShow.forEach(phaseKey => {
        const phase = phases[phaseKey];

        // Positive angles: normalize to 0-360 (counter-clockwise)
        let posDisplay = phase.positive;
        if (posDisplay < 0) posDisplay += 360;

        // Negative angles: convert to clockwise convention
        let negDisplay = phase.negative;
        if (negDisplay > 180) negDisplay = negDisplay - 360;
        if (negDisplay > 0) negDisplay = -negDisplay;  // Make it negative for clockwise
        if (negDisplay < -360) negDisplay += 360;

        // Calculate the actual angles for the shaded region
        let negAngleForShade = negDisplay;
        if (negAngleForShade < 0) negAngleForShade += 360;

        // Store region data for custom plugin
        // Region goes FROM positive boundary TO negative boundary
        regionsToShade.push({
            startAngle: posDisplay,           // Positive boundary (start)
            endAngle: negAngleForShade,       // Negative boundary (end)
            color: phase.color,
            name: phase.name
        });

        // Positive region vector
        const posRad = (posDisplay * Math.PI) / 180;
        const posX = Math.cos(posRad) * outerRadius;
        const posY = Math.sin(posRad) * outerRadius;

        // Negative region vector (same length as positive)
        const negRad = (Math.abs(negDisplay) * Math.PI) / 180;
        const negX = Math.cos(negRad) * outerRadius;
        const negY = -Math.sin(negRad) * outerRadius;  // Negative Y for clockwise

        // Positive vector with endpoint label (OUTER - anti-clockwise)
        datasets.push({
            label: `${phase.name} +ve (+${posDisplay.toFixed(0)}°)`,
            data: [
                { x: 0, y: 0, angleLabel: '' },
                { x: posX, y: posY, angleLabel: `+${posDisplay.toFixed(0)}°` }
            ],
            borderColor: phase.color,
            backgroundColor: phase.color,
            borderWidth: 3,
            pointRadius: [5, 12],
            pointBackgroundColor: [phase.color, phase.color],
            pointBorderColor: ['#fff', '#fff'],
            pointBorderWidth: [0, 2],
            showLine: true,
            tension: 0,
            order: 1
        });

        // Negative vector with endpoint label (INNER - clockwise)
        datasets.push({
            label: `${phase.name} -ve (${negDisplay.toFixed(0)}°)`,
            data: [
                { x: 0, y: 0, angleLabel: '' },
                { x: negX, y: negY, angleLabel: `${negDisplay.toFixed(0)}°` }
            ],
            borderColor: phase.color,
            backgroundColor: phase.colorLight,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: [0, 9],
            pointBackgroundColor: phase.colorLight,
            pointBorderColor: phase.color,
            pointBorderWidth: 2,
            pointStyle: 'triangle',
            showLine: true,
            tension: 0,
            order: 2
        });
    });

    // OUTER Reference circle (for positive - anti-clockwise)
    const outerCirclePoints = [];
    for (let angle = 0; angle <= 360; angle += 5) {
        const rad = (angle * Math.PI) / 180;
        outerCirclePoints.push({ x: Math.cos(rad) * outerRadius, y: Math.sin(rad) * outerRadius });
    }
    datasets.unshift({
        label: 'Outer (+ve Anti-CW)',
        data: outerCirclePoints,
        borderColor: 'rgba(34, 197, 94, 0.4)',  // Green for positive
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        showLine: true,
        tension: 0,
        order: 10
    });

    // INNER Reference circle (for negative - clockwise)
    const innerCirclePoints = [];
    for (let angle = 0; angle <= 360; angle += 5) {
        const rad = (angle * Math.PI) / 180;
        innerCirclePoints.push({ x: Math.cos(rad) * innerRadius, y: Math.sin(rad) * innerRadius });
    }
    datasets.unshift({
        label: 'Inner (-ve CW)',
        data: innerCirclePoints,
        borderColor: 'rgba(239, 68, 68, 0.4)',  // Red for negative
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [4, 4],
        pointRadius: 0,
        showLine: true,
        tension: 0,
        order: 10
    });

    // Direction arrows on outer circle (anti-clockwise)
    /*
    const arrowPositions = [45, 135, 225, 315];
    arrowPositions.forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * outerRadius;
        const y = Math.sin(rad) * outerRadius;
        datasets.push({
            label: '',
            data: [{ x, y, angleLabel: '↺' }],
            borderColor: 'rgba(34, 197, 94, 0.6)',
            backgroundColor: 'rgba(34, 197, 94, 0.6)',
            pointRadius: 0,
            showLine: false,
            order: 9
        });
    });
    */
    // Origin point
    datasets.push({
        label: 'Origin',
        data: [{ x: 0, y: 0, angleLabel: '0°' }],
        borderColor: '#374151',
        backgroundColor: '#374151',
        pointRadius: 8,
        showLine: false,
        order: 0
    });

    regionChart = new Chart(ctx, {
        type: 'scatter',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#374151',
                        font: { size: 10, weight: '500' },
                        usePointStyle: true,
                        padding: 8,
                        boxWidth: 8,
                        filter: (item) => !item.text.includes('Reference') && !item.text.includes('Origin')
                    }
                },
                title: {
                    display: true,
                    text: `RCA = ${RCA}°`,
                    color: '#374151',
                    font: { size: 13, weight: '600' },
                    padding: { bottom: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const point = context.raw;
                            if (point.x === 0 && point.y === 0) return 'Origin (0°)';

                            // Check if this is a negative vector (dashed line = inner circle)
                            const isNegativeVector = context.dataset.borderDash && context.dataset.borderDash.length > 0;

                            // Calculate angle from coordinates
                            let angle = Math.atan2(point.y, point.x) * 180 / Math.PI;

                            if (isNegativeVector) {
                                // For negative vectors (clockwise): show negative angle
                                // If angle is positive and in lower quadrants (y < 0), convert to negative
                                if (angle > 0) angle = angle - 360;
                                // If angle is between -180 and -360, adjust to -0 to -180
                                if (angle < -180) angle = angle + 360;
                                // For clockwise, the angle should be negative
                                if (point.y < 0 && angle > 0) angle = -angle;
                                if (point.y < 0) {
                                    // Calculate clockwise angle: -(360 - counterclockwise angle)
                                    let cwAngle = Math.atan2(-point.y, point.x) * 180 / Math.PI;
                                    return `-${cwAngle.toFixed(1)}°`;
                                }
                            } else {
                                // For positive vectors (anti-clockwise): show positive angle 0-360
                                if (angle < 0) angle += 360;
                            }

                            return `${angle >= 0 ? '+' : ''}${angle.toFixed(1)}°`;
                        }
                    }
                },
                datalabels: {
                    display: function (context) {
                        const data = context.raw;
                        return data && data.angleLabel && data.angleLabel !== '';
                    },
                    color: function (context) {
                        return context.dataset.borderColor || '#374151';
                    },
                    font: { size: 11, weight: '700' },
                    anchor: 'end',
                    align: 'end',
                    offset: 6,
                    formatter: function (value) {
                        return (value && value.angleLabel) ? value.angleLabel : '';
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'center',
                    min: -140,
                    max: 140,
                    ticks: {
                        color: '#374151',
                        stepSize: 140,
                        font: { size: 10, weight: '700' },
                        callback: function (value) {
                            if (value >= 130) return '0°';
                            if (value <= -130) return '+180° / -180°';
                            return '';
                        }
                    },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' },
                    border: { color: '#374151', width: 2 }
                },
                y: {
                    type: 'linear',
                    position: 'center',
                    min: -140,
                    max: 140,
                    ticks: {
                        color: '#374151',
                        stepSize: 140,
                        font: { size: 10, weight: '700' },
                        callback: function (value) {
                            if (value >= 130) return '+90° / -270°';
                            if (value <= -130) return '+270° / -90°';
                            return '';
                        }
                    },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' },
                    border: { color: '#374151', width: 2 }
                }
            }
        }
    });

    legendContainer.innerHTML = `
        <div class="legend-items">
            <div class="legend-note" style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
                <span style="color: #22c55e;">🔵 Outer Circle: +ve (Anti-Clockwise ↺)</span>
                <span style="color: #ef4444;">🔴 Inner Circle: -ve (Clockwise ↻)</span>
                <span style="font-size: 0.7rem; color: #6b7280;">Solid = +ve Region | Dashed = -ve Region</span>
            </div>
        </div>
    `;
}
