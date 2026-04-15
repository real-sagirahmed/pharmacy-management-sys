import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { TreeSelectModule } from 'primeng/treeselect';
import { GlobalSearchService, SearchRequest, SearchResult } from '../../../services/global-search.service';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, CalendarModule, TreeSelectModule],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.css']
})
export class GlobalSearchComponent implements OnInit {
  visible: boolean = false;
  showFilters: boolean = false;
  searchText: string = '';
  searchSubject = new Subject<string>();
  
  // Advanced Filters
  dateRange: Date[] | null = null;
  selectedModules: any[] = [];
  selectedStatuses: any[] = [];
  
  // Tree Nodes Config
  moduleNodes = [
    {
      label: 'Inventory', data: 'Inventory_Group', expanded: true,
      children: [{ label: 'Medicines', data: 'Medicines' }]
    },
    {
      label: 'Transactions', data: 'Transactions_Group', expanded: true,
      children: [
        { label: 'Sales', data: 'Sales' },
        { label: 'Purchases', data: 'Purchases' }
      ]
    },
    {
      label: 'CRM', data: 'CRM_Group', expanded: true,
      children: [{ label: 'Parties', data: 'Parties' }]
    }
  ];

  statusNodes = [
    {
      label: 'Financial Status', data: 'Financial_Group', expanded: true,
      children: [{ label: 'Paid', data: 'Paid' }, { label: 'Due', data: 'Due' }, { label: 'Hold', data: 'Hold' }]
    },
    {
      label: 'Activity Status', data: 'Activity_Group', expanded: true,
      children: [{ label: 'Active', data: 'Active' }, { label: 'Inactive', data: 'Inactive' }]
    }
  ];

  loading: boolean = false;
  results: SearchResult[] = [];

  constructor(private searchService: GlobalSearchService, private router: Router) {}

  ngOnInit() {
    // 400ms delay to prevent server overload during typing
    this.searchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(() => {
      this.performSearch();
    });
  }

  // Universal Shortcut Detection
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    }
  }

  toggle() {
    this.visible = !this.visible;
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  clearAllFilters() {
    this.dateRange = null;
    this.selectedModules = [];
    this.selectedStatuses = [];
    this.onFilterChange();
  }

  onSearchChange() {
    this.searchSubject.next(this.searchText);
  }

  onFilterChange() {
    this.performSearch(); // Refresh search immediately on filter change
  }

  // Magic Search Extractor (e.g., :due, :paid)
  parseMagicTags(text: string): { pureText: string, implicitStatuses: string[] } {
    let implicitStatuses: string[] = [];
    let pureText = text || '';
    
    const tags = ['due', 'paid', 'hold', 'active', 'inactive'];
    tags.forEach(tag => {
      const regex = new RegExp(`:${tag}`, 'gi');
      if (regex.test(pureText)) {
        implicitStatuses.push(tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase());
        pureText = pureText.replace(regex, '').trim();
      }
    });

    return { pureText, implicitStatuses };
  }

  // Converts selected Tree nodes to string array matching DTO
  extractTreeData(selectedNodes: any[]): string[] {
    if (!selectedNodes) return [];
    return selectedNodes
       .filter(node => !node.children || node.children.length === 0)
       .map(node => node.data);
  }

  performSearch() {
    this.loading = true;
    
    let fromD = null, toD = null;
    if (this.dateRange && this.dateRange.length > 0) {
      fromD = this.dateRange[0];
      toD = this.dateRange[1] ? this.dateRange[1] : null;
    }

    const magic = this.parseMagicTags(this.searchText);
    const combinedStatuses = Array.from(new Set([...this.extractTreeData(this.selectedStatuses), ...magic.implicitStatuses]));

    const request: SearchRequest = {
      searchText: magic.pureText,
      fromDate: fromD,
      toDate: toD,
      modules: this.extractTreeData(this.selectedModules),
      statuses: combinedStatuses
    };

    this.searchService.performSearch(request).subscribe({
      next: (data) => {
        this.results = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Global Search Error', err);
        this.loading = false;
      }
    });
  }

  // Strict Routing Implementation
  navigateTo(routePath: string) {
    this.visible = false;
    this.router.navigateByUrl(routePath);
  }

  // Dynamic aesthetic icons based on module
  getIconForType(type: string): string {
    switch(type) {
      case 'Medicine': return 'pi pi-box text-blue-400';
      case 'Sale': return 'pi pi-shopping-cart text-emerald-400';
      case 'Purchase': return 'pi pi-truck text-purple-400';
      case 'Party': return 'pi pi-users text-amber-500';
      default: return 'pi pi-file text-slate-400';
    }
  }
}
