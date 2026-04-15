import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarModule } from 'primeng/calendar';
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../services/report.service';

@Component({
  selector: 'app-visual-dashboard',
  standalone: true,
  imports: [CommonModule, CalendarModule, ChartModule, ButtonModule, FormsModule],
  template: `
    <div class="page-wrap animate-fadein-up">
      <!-- Header Section -->
      <div class="header-section px-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="page-title text-sm">Visual Dashboard</h1>
            <p class="page-sub text-xs">Analytics and insights on sales & performance.</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-700">Date Range:</span>
            <p-calendar [(ngModel)]="dateRange" selectionMode="range" [readonlyInput]="true" 
                        dateFormat="dd/mm/yy" class="p-inputtext-sm" placeholder="Select Dates">
            </p-calendar>
            <button pButton icon="pi pi-filter" label="Filter" class="p-button-sm p-button-outlined" (click)="loadData()" [loading]="loading()"></button>
          </div>
        </div>
      </div>

      <div class="dashboard-grid p-4">
        
        <!-- KPI Row -->
        <div class="kpi-grid mb-4">
          <div class="kpi-card kpi-teal">
            <div class="kpi-icon-wrap kpi-teal-icon"><i class="pi pi-shopping-cart"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Total Sales (Period)</span>
              <span class="kpi-value">৳ {{profitLossData?.totalSales || 0 | number:'1.2-2'}}</span>
              <div class="kpi-trend trend-up"><i class="pi pi-arrow-up text-[10px]"></i> 12.4% vs last period</div>
            </div>
          </div>
          <div class="kpi-card kpi-indigo">
            <div class="kpi-icon-wrap kpi-indigo-icon"><i class="pi pi-tags"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Total Cost</span>
              <span class="kpi-value">৳ {{profitLossData?.totalCost || 0 | number:'1.2-2'}}</span>
              <div class="kpi-trend trend-down"><i class="pi pi-arrow-down text-[10px]"></i> 3.2% vs last period</div>
            </div>
          </div>
          <div class="kpi-card kpi-emerald">
            <div class="kpi-icon-wrap kpi-emerald-icon"><i class="pi pi-chart-line"></i></div>
            <div class="kpi-info">
              <span class="kpi-label">Gross Profit</span>
              <span class="kpi-value">৳ {{profitLossData?.totalProfit || 0 | number:'1.2-2'}}</span>
              <div class="kpi-trend trend-up"><i class="pi pi-arrow-up text-[10px]"></i> 8.1% vs last period</div>
            </div>
          </div>
        </div>

        <!-- Charts Row 1 -->
        <div class="chart-row">
          <!-- Top Selling Medicines (Bar) -->
          <div class="chart-card flex-1">
            <h3 class="chart-title">Top Selling Items (Quantity)</h3>
            <div class="chart-container">
              <p-chart type="bar" [data]="topSellingData" [options]="barOptions"></p-chart>
            </div>
          </div>
        </div>

        <!-- Charts Row 2 -->
        <div class="chart-row mt-4">
          <!-- Sales Revenue by Item (Doughnut) -->
          <div class="chart-card" style="flex: 1;">
            <h3 class="chart-title">Sales Breakdown (Revenue)</h3>
            <div class="chart-container center-chart">
              <p-chart type="doughnut" [data]="salesPieData" [options]="pieOptions" height="250px"></p-chart>
            </div>
          </div>
          
          <div class="chart-card" style="flex: 2;">
            <h3 class="chart-title">Items Expiring Soon (Next 6 Months)</h3>
            <div class="chart-container">
              <p-chart type="bar" [data]="expiryData" [options]="expiryOptions"></p-chart>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .page-wrap { display: flex; flex-direction: column; background: #f8fafc; min-height: calc(100vh - 70px); }
    
    .header-section { 
      padding: 16px 24px; background: #fff; border-bottom: 1px solid #e2e8f0; 
      position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .page-title { font-size: 1.1rem !important; margin: 0; font-weight: 800; color: #0d9488; }
    .page-sub { margin: 0; color: #64748b; font-weight: 500; font-size: 0.8rem; }
    
    .dashboard-grid { overflow-y: auto; }
    
    /* KPI Cards */
    .kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px; position: relative; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
    .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08); }
    .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; border-radius: 12px 0 0 12px; }
    .kpi-teal::before   { background: #0d9488; }
    .kpi-indigo::before { background: #6366f1; }
    .kpi-emerald::before{ background: #10b981; }
    
    .kpi-icon-wrap { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0; transition: transform 0.2s; }
    .kpi-card:hover .kpi-icon-wrap { transform: scale(1.05); }
    .kpi-teal-icon   { background: #ccfbf1; color: #0d9488; }
    .kpi-indigo-icon { background: #e0e7ff; color: #4f46e5; }
    .kpi-emerald-icon{ background: #d1fae5; color: #059669; }
    
    .kpi-info { flex: 1; display: flex; flex-direction: column; }
    .kpi-label { font-size: 0.75rem; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
    .kpi-value { font-size: 1.4rem; font-weight: 800; color: #1e293b; }
    .kpi-trend { font-size: 0.7rem; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
    .trend-up { color: #10b981; }
    .trend-down { color: #ef4444; }

    /* Chart Cards */
    .chart-row { display: flex; gap: 16px; min-height: 280px; }
    .chart-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
    .chart-title { font-size: 0.9rem; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1.5px solid #f1f5f9; }
    .chart-container { flex: 1; position: relative; display: flex; flex-direction: column; justify-content: center; }
    .center-chart { display: flex; justify-content: center; align-items: center; }

    /* Responsive Adjustments */
    @media (max-width: 768px) {
      .header-section .flex { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-section .flex.items-center.gap-2 { width: 100%; justify-content: space-between; }
      .kpi-grid { grid-template-columns: 1fr !important; }
      .chart-row { flex-direction: column; min-height: auto; }
      .chart-card { min-height: 300px; }
      .chart-container { height: 250px; }
    }
  `]
})
export class VisualDashboardComponent implements OnInit {
  dateRange: Date[] | null = null;
  loading = signal(false);
  
  profitLossData: any = null;
  
  // Charts Data
  topSellingData: any;
  barOptions: any;
  
  salesPieData: any;
  pieOptions: any;

  expiryData: any;
  expiryOptions: any;

  constructor(private reportService: ReportService) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Default to last 30 days
    this.dateRange = [start, end];
    this.initChartOptions();
  }

  ngOnInit() {
    this.loadData();
  }

  initChartOptions() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: surfaceBorder }, border: { dash: [4, 4] } },
        x: { grid: { display: false } }
      },
      elements: {
        bar: { borderRadius: 6, borderSkipped: false }
      }
    };

    this.pieOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { position: 'right', labels: { usePointStyle: true, color: textColor, padding: 20, font: { weight: '600' } } } 
      },
      cutout: '70%',
      elements: { arc: { borderWidth: 0 } }
    };

    this.expiryOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: surfaceBorder }, border: { dash: [4, 4] } },
          x: { grid: { display: false } }
        },
        elements: {
          bar: { borderRadius: 6, borderSkipped: false }
        }
    };
  }

  loadData() {
    if (!this.dateRange || !this.dateRange[0] || !this.dateRange[1]) return;
    
    this.loading.set(true);
    const start = this.formatDate(this.dateRange[0]);
    const end = this.formatDate(this.dateRange[1]);

    // Profit & Loss
    this.reportService.getProfitLoss(start, end).subscribe(data => {
      this.profitLossData = data;
    });

    // Top Selling Medicines (Quantity)
    this.reportService.getTopSellingMedicines(start, end, 10).subscribe(data => {
      // Adding a gradient-like color using array based on value
      const maxQty = Math.max(...data.map(d => d.totalQuantity), 1);

      this.topSellingData = {
        labels: data.map(d => d.itemName),
        datasets: [{
          label: 'Quantity Sold',
          data: data.map(d => d.totalQuantity),
          backgroundColor: data.map(d => {
             const opacity = Math.max(0.4, d.totalQuantity / maxQty);
             return `rgba(13, 148, 136, ${opacity})`; // Teal with varying opacity
          }),
          hoverBackgroundColor: '#0f766e',
          borderRadius: 6,
          barPercentage: 0.6
        }]
      };
    });

    // Sales Summary (Revenue breakdown pie chart)
    this.reportService.getSalesSummary(start, end).subscribe(data => {
      const top5 = data.slice(0, 5); // top 5 items
      this.salesPieData = {
        labels: top5.map(d => d.itemName),
        datasets: [{
          data: top5.map(d => d.totalRevenue),
          backgroundColor: ['#0d9488', '#f59e0b', '#10b981', '#6366f1', '#ec4899']
        }]
      };
    });

    // Expiry Report
    this.reportService.getExpiryReport(6).subscribe(data => {
        const top10 = data.slice(0, 10); // show top 10 soonest
        
        // Ensure gradient-like color representation
        const isCritical = (d: any) => d.stockQuantity > 0; // Just example logic

        this.expiryData = {
            labels: top10.map(d => d.itemName + ' (' + d.batchNumber + ')'),
            datasets: [{
              label: 'Stock Quantity',
              data: top10.map(d => d.stockQuantity),
              backgroundColor: top10.map(d => isCritical(d) ? '#ef4444' : '#f97316'),
              hoverBackgroundColor: top10.map(d => isCritical(d) ? '#dc2626' : '#ea580c'),
              borderRadius: 6
            }]
        };
        this.loading.set(false);
    });
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
