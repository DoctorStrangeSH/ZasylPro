class ChartManager {
    constructor() {
        this.charts = {};
    }

    createSparkline(canvasId, data, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data: data,
                    borderColor: color,
                    borderWidth: 2,
                    fill: true,
                    backgroundColor: color.replace(')', ', 0.1)').replace('rgb', 'rgba'),
                    pointRadius: 0,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                scales: {
                    x: { display: false },
                    y: { display: false }
                }
            }
        });
    }

    updateCharts(stats) {
        const orderData = this.generateSparklineData(stats.total);
        const zasylsData = this.generateSparklineData(stats.zasyls);
        const noZasylsData = this.generateSparklineData(stats.noZasyls);
        const costData = this.generateSparklineData(stats.totalCost / 1000);
        
        this.createSparkline('ordersChart', orderData, 'rgb(99, 102, 241)');
        this.createSparkline('zasylsChart', zasylsData, 'rgb(16, 185, 129)');
        this.createSparkline('noZasylsChart', noZasylsData, 'rgb(239, 68, 68)');
        this.createSparkline('costChart', costData, 'rgb(59, 130, 246)');
    }

    generateSparklineData(baseValue) {
        const data = [];
        let value = baseValue * 0.7;
        
        for (let i = 0; i < 10; i++) {
            value += (Math.random() - 0.5) * baseValue * 0.1;
            value = Math.max(0, value);
            data.push(value);
        }
        
        data.push(baseValue);
        return data;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.chartManager = new ChartManager();
});