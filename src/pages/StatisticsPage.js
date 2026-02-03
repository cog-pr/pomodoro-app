import { getSubjects } from '../stores/subjects.js';
import { Chart, registerables } from 'chart.js';

// Chart.jsのコンポーネントを登録
Chart.register(...registerables);

let chartInstance = null;

export function renderStatisticsPage() {
  const subjects = getSubjects();

  // データの集計
  const data = subjects.map(s => s.totalMinutes);

  // データがない場合の表示
  if (subjects.length === 0 || data.every(v => v === 0)) {
    return `
      <div class="card">
        <h2 class="text-center" style="margin-bottom: 2rem;">📊 学習統計</h2>
        <div class="text-center text-muted">
          <p>まだ学習データがありません。</p>
          <p>タイマーを使って学習を記録しましょう！</p>
        </div>
      </div>
    `;
  }

  // 総学習時間の計算
  const totalMinutes = data.reduce((a, b) => a + b, 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `
    <div class="card">
      <h2 style="margin-bottom: 1rem;">📊 学習統計</h2>
      
      <div class="glass-panel" style="padding: 1rem; margin-bottom: 2rem; border-radius: 1rem; text-align: center;">
        <div style="font-size: 0.9rem; color: var(--text-secondary);">総学習時間</div>
        <div style="font-size: 2.5rem; font-weight: 700; color: var(--accent);">
          ${hours}<span style="font-size: 1rem;">時間</span> ${minutes}<span style="font-size: 1rem;">分</span>
        </div>
      </div>

      <div style="position: relative; height: 300px; width: 100%;">
        <canvas id="statsChart"></canvas>
      </div>

      <div style="margin-top: 2rem;">
        <h3 style="font-size: 1.1rem; margin-bottom: 1rem;">内訳</h3>
        ${subjects.map(s => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${s.color};"></div>
              <span>${s.name}</span>
            </div>
            <span style="font-family: var(--font-mono);">${Math.floor(s.totalMinutes / 60)}時間 ${s.totalMinutes % 60}分</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function initStatisticsChart() {
  const ctx = document.getElementById('statsChart');
  if (!ctx) return;

  const subjects = getSubjects();
  const labels = subjects.map(s => s.name);
  const data = subjects.map(s => s.totalMinutes);
  const colors = subjects.map(s => s.color);

  // 既存のチャートを破棄
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              family: "'Inter', sans-serif"
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              const h = Math.floor(val / 60);
              const m = val % 60;
              return ` ${context.label}: ${h}時間 ${m}分`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}
