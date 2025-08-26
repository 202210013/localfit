import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

interface Order {
  id: number;
  customer: string;
  product: string;
  quantity: number;
  price?: number; // Add price property
  size?: string; // Add size property
  status: 'pending' | 'approved' | 'declined' | 'ready-for-pickup' | 'completed';
  vendor?: string; // Add vendor email field
  sellerEmail?: string; // Alternative field name for vendor
  created_at?: string; // Add created date
}

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  userEmail: string;
  created_at?: string;
}

interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  approvedOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  topProducts: Array<{product: string, quantity: number, revenue: number}>;
  dailySales: Array<{date: string, revenue: number, orders: number}>;
  monthlySales: Array<{month: string, revenue: number, orders: number, period: string}>;
  sizeSales: Array<{size: string, quantity: number, revenue: number}>;
  monthlyRevenue: Array<{month: string, revenue: number}>;
  salesTrend: {
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  };
  peakSalesDay: {date: string, revenue: number} | null;
  peakSalesMonth: {month: string, revenue: number} | null;
}

interface ProfessionalReport {
  generatedDate: string;
  reportPeriod: string;
  executiveSummary: {
    keyFindings: string[];
    totalRevenue: number;
    totalOrders: number;
    growthRate: number;
    performanceRating: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement';
  };
  sections: {
    salesOverview: any;
    performanceAnalysis: any;
    productAnalysis: any;
    trendAnalysis: any;
    recommendations: string[];
  };
  charts: {
    dailySalesChart: any[];
    productPerformanceChart: any[];
    sizeDistributionChart: any[];
    monthlyTrendChart: any[];
  };
  dataTable: any[];
  insights: string[];
  conclusions: string[];
  actionablePoints: string[];
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  orders: Order[] = [];
  customerOrders: Order[] = []; // Add this for filtered orders
  products: Product[] = [];
  analytics: SalesAnalytics = {
    totalRevenue: 0,
    totalOrders: 0,
    approvedOrders: 0,
    pendingOrders: 0,
    averageOrderValue: 0,
    topProducts: [],
    dailySales: [],
    monthlySales: [],
    sizeSales: [],
    monthlyRevenue: [],
    salesTrend: { trend: 'stable', percentage: 0 },
    peakSalesDay: null,
    peakSalesMonth: null
  };

  // Professional Report Data
  report: ProfessionalReport = {
    generatedDate: '',
    reportPeriod: '',
    executiveSummary: {
      keyFindings: [],
      totalRevenue: 0,
      totalOrders: 0,
      growthRate: 0,
      performanceRating: 'Average'
    },
    sections: {
      salesOverview: {},
      performanceAnalysis: {},
      productAnalysis: {},
      trendAnalysis: {},
      recommendations: []
    },
    charts: {
      dailySalesChart: [],
      productPerformanceChart: [],
      sizeDistributionChart: [],
      monthlyTrendChart: []
    },
    dataTable: [],
    insights: [],
    conclusions: [],
    actionablePoints: []
  };
  
  // View state management
  currentView: 'orders' | 'analytics' | 'report' = 'analytics';
  
  // Date filter for analytics
  dateFilter: 'today' | 'week' | 'month' | 'year' | 'all' = 'month';
  
  // Chart view toggle
  chartView: 'daily' | 'monthly' = 'daily';

  // Order sorting properties
  sortField: string = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  filteredOrders: Order[] = [];
  searchTerm: string = '';
  statusFilter: string = 'all';

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    // Clean up old localStorage workaround data
    localStorage.removeItem('readyForPickupOrders');
    
    this.fetchOrders();
    this.fetchProducts();
    this.calculateAnalytics();
  }

  // View switching methods
  switchToOrders() {
    this.currentView = 'orders';
  }

  switchToAnalytics() {
    this.currentView = 'analytics';
    this.calculateAnalytics();
  }

  switchToReport() {
    this.currentView = 'report';
    this.generateProfessionalReport();
  }

  switchToProducts() {
    this.goToProduct();
  }

  goToProduct() {
    this.router.navigate(['/product']);
  }

  // Date filter change
  onDateFilterChange(filter: 'today' | 'week' | 'month' | 'year' | 'all') {
    this.dateFilter = filter;
    this.calculateAnalytics();
  }

  // Chart view switching
  switchChartView(view: 'daily' | 'monthly') {
    this.chartView = view;
    this.selectedDay = null; // Reset selection when switching views
    this.calculateAnalytics(); // Recalculate for the new view
  }

  // Helper method for headers
  private getHeaders(): HttpHeaders {
    const userEmail = localStorage.getItem('user_email');
    const token = localStorage.getItem('auth_token'); // Get the auth token
    
    const headers: any = {
      'Content-Type': 'application/json'
    };
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return new HttpHeaders(headers);
  }

 fetchOrders() {
  const userEmail = localStorage.getItem('user_email');
  
  if (!userEmail) {
    alert('User email not found. Please login again.');
    return;
  }

  // First get your products, then filter orders
  this.fetchYourProductsAndOrders(userEmail);
}

private fetchYourProductsAndOrders(userEmail: string) {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    alert('Authentication token not found. Please login again.');
    this.logout();
    return;
  }
  
  // Get your products first
  this.http.get<any>(
    `https://api.localfit.store/ecomm_api/Router.php?request=products&seller=${encodeURIComponent(userEmail)}`,
    { 
      withCredentials: true,
      headers: this.getHeaders()
    }
  ).subscribe({
    next: (response) => {
      console.log('Your products raw response:', response);
      
      // Extract the actual products array from the response
      const products = response.records || response.data || response || [];
      console.log('Extracted products array:', products);
      
      if (!Array.isArray(products) || products.length === 0) {
        console.log('No products found for your account!');
        this.customerOrders = [];
        return;
      }
      
      // Check different possible field names for product names
      const yourProductNames = products.map(p => {
        const productName = p.name || p.title || p.product_name || p.productName || p.Name || p.Title || p.Product;
        console.log('Product object:', p, 'Extracted name:', productName);
        return productName;
      }).filter(name => name && name.trim() !== ''); // Remove undefined/empty values
      
      console.log('Your product names extracted:', yourProductNames);
      
      if (yourProductNames.length === 0) {
        console.log('Could not extract any product names from your products!');
        this.customerOrders = [];
        return;
      }
      
      // Now fetch orders
      this.http.get<any[]>(
        `https://api.localfit.store/ecomm_api/Router.php?request=orders`,
        { 
          withCredentials: true,
          headers: this.getHeaders()
        }
      ).subscribe({
        next: (orders) => {
          console.log('All orders:', orders);
          
          // Show all unique product names in orders
          const orderProductNames = [...new Set(orders.map(order => order.product))];
          console.log('All product names in orders:', orderProductNames);
          
          this.orders = orders;
          
          // Filter orders for products that belong to you
          this.customerOrders = orders.filter(order => {
            // Try exact match first
            let isYourProduct = yourProductNames.includes(order.product);
            
            // If no exact match, try case-insensitive match
            if (!isYourProduct) {
              isYourProduct = yourProductNames.some(productName => 
                productName && order.product && 
                productName.toLowerCase().trim() === order.product.toLowerCase().trim()
              );
            }
            
            console.log(`Order ${order.id} - Product: "${order.product}" - Is yours: ${isYourProduct}`);
            return isYourProduct;
          });
          
          console.log(`Found ${this.customerOrders.length} orders for your products out of ${orders.length} total orders`);
          
          // If no matches found, show the comparison
          if (this.customerOrders.length === 0) {
            console.log('=== NO MATCHES FOUND ===');
            console.log('Your products:', yourProductNames);
            console.log('Order products:', orderProductNames);
            console.log('Check if any of your product names match the order product names above');
          } else {
            console.log('=== YOUR FILTERED ORDERS ===');
            console.log(this.customerOrders);
          }
          
          // Initialize filtered orders for sorting/filtering
          this.initializeFilteredOrders();
        },
        error: (err) => {
          console.error('Failed to fetch orders:', err);
          if (err.status === 401) {
            alert('Session expired. Please login again.');
            this.logout();
          }
        }
      });
    },
    error: (err) => {
      console.error('Failed to fetch your products:', err);
      if (err.status === 401) {
        alert('Session expired. Please login again.');
        this.logout();
      } else {
        this.customerOrders = [];
        alert('Failed to fetch your products. Please try again.');
      }
    }
  });
}

  approveOrder(order: Order) {
    const userEmail = localStorage.getItem('user_email');
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      alert('Authentication token not found. Please login again.');
      this.logout();
      return;
    }
    
    order.status = 'approved';
    
    this.http.post(
      `https://api.localfit.store/ecomm_api/Router.php?request=orders&admin=${encodeURIComponent(userEmail ?? '')}`,
      { 
        action: 'approve', 
        orderId: order.id,
        adminEmail: userEmail,
        token: token // Include token in request body as well
      },
      { 
        withCredentials: true,
        headers: this.getHeaders()
      }
    ).subscribe({
      next: () => {
        console.log('Order approved successfully');
        this.fetchOrders(); // Refresh the orders list after approval
      },
      error: (err) => {
        console.error('Approve order error:', err);
        order.status = 'pending';
        
        if (err.status === 401) {
          alert('Session expired. Please login again.');
          this.logout();
        } else {
          alert('Failed to approve order');
        }
      }
    });
  }

  declineOrder(order: Order) {
    const userEmail = localStorage.getItem('user_email');
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      alert('Authentication token not found. Please login again.');
      this.logout();
      return;
    }
    
    order.status = 'declined';
    
    this.http.post(
      `https://api.localfit.store/ecomm_api/Router.php?request=orders&admin=${encodeURIComponent(userEmail ?? '')}`,
      { 
        action: 'decline', 
        orderId: order.id,
        adminEmail: userEmail,
        token: token // Include token in request body as well
      },
      { 
        withCredentials: true,
        headers: this.getHeaders()
      }
    ).subscribe({
      next: () => {
        console.log('Order declined successfully');
        this.fetchOrders(); // Refresh the orders list after decline
      },
      error: (err) => {
        console.error('Decline order error:', err);
        order.status = 'pending';
        
        if (err.status === 401) {
          alert('Session expired. Please login again.');
          this.logout();
        } else {
          alert('Failed to decline order');
        }
      }
    });
  }

  markReadyForPickup(order: Order) {
    const userEmail = localStorage.getItem('user_email');
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      alert('Authentication token not found. Please login again.');
      this.logout();
      return;
    }
    
    // First update the local order status optimistically
    const originalStatus = order.status;
    order.status = 'ready-for-pickup';
    
    // Call the backend API with the correct action
    this.http.post(
      `https://api.localfit.store/ecomm_api/Router.php?request=orders&admin=${encodeURIComponent(userEmail ?? '')}`,
      { 
        action: 'ready-for-pickup', 
        orderId: order.id
      },
      { 
        withCredentials: true,
        headers: this.getHeaders()
      }
    ).subscribe({
      next: (response) => {
        console.log('Order marked as ready for pickup successfully', response);
        alert('Order marked as ready for pickup!');
        this.fetchOrders();
      },
      error: (err) => {
        console.error('Mark ready for pickup error:', err);
        order.status = originalStatus;
        
        if (err.status === 401) {
          alert('Session expired. Please login again.');
          this.logout();
        } else if (err.status === 400) {
          alert('Failed to mark order as ready for pickup. Please check the order status.');
        } else {
          alert('Failed to mark order as ready for pickup. Please try again.');
        }
      }
    });
  }

  exportToExcel(): void {
    // Export only customer orders
    const exportData = this.customerOrders.map(order => ({
      'Order #': order.id,
      'Customer': order.customer,
      'Product': order.product,
      'Quantity': order.quantity,
      'Size': order.size || 'N/A',
      'Status': order.status
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = { Sheets: { 'Orders': worksheet }, SheetNames: ['Orders'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(data, 'customer_orders.xlsx');
  }

  // Fetch products for analytics
  fetchProducts() {
    const userEmail = localStorage.getItem('user_email');
    if (!userEmail) return;

    this.http.get<any>(
      `https://api.localfit.store/ecomm_api/Router.php?request=products&seller=${encodeURIComponent(userEmail)}`,
      { 
        withCredentials: true,
        headers: this.getHeaders()
      }
    ).subscribe({
      next: (response) => {
        const products = response.records || response.data || response || [];
        this.products = Array.isArray(products) ? products : [];
        this.calculateAnalytics();
      },
      error: (err) => {
        console.error('Failed to fetch products:', err);
        this.products = [];
      }
    });
  }

  // Calculate comprehensive analytics
  calculateAnalytics() {
    if (!this.customerOrders.length) {
      // Reset analytics if no orders
      this.analytics = {
        totalRevenue: 0,
        totalOrders: 0,
        approvedOrders: 0,
        pendingOrders: 0,
        averageOrderValue: 0,
        topProducts: [],
        dailySales: [],
        monthlySales: [],
        sizeSales: [],
        monthlyRevenue: [],
        salesTrend: { trend: 'stable', percentage: 0 },
        peakSalesDay: null,
        peakSalesMonth: null
      };
      return;
    }

    // Filter orders based on date filter
    const filteredOrders = this.getFilteredOrdersByDate();
    
    // Basic metrics
    this.analytics.totalOrders = filteredOrders.length;
    this.analytics.approvedOrders = filteredOrders.filter(o => o.status === 'approved').length;
    this.analytics.pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
    
    // Calculate revenue (need to match with product prices)
    let totalRevenue = 0;
    filteredOrders.forEach(order => {
      if (order.status === 'approved') {
        const product = this.products.find(p => p.name === order.product);
        const price = product?.price || 0;
        totalRevenue += price * order.quantity;
      }
    });
    
    this.analytics.totalRevenue = totalRevenue;
    this.analytics.averageOrderValue = this.analytics.approvedOrders > 0 
      ? totalRevenue / this.analytics.approvedOrders 
      : 0;

    // Calculate analytics
    this.calculateTopProducts(filteredOrders);
    this.calculateDailySales(filteredOrders);
    this.calculateMonthlySales(filteredOrders);
    this.calculateSizeSales(filteredOrders);
    this.calculateMonthlyRevenue(filteredOrders);
    
    // Calculate trends and peaks
    this.calculateSalesTrend();
    this.findPeakSalesDay();
    this.findPeakSalesMonth();
  }

  private getFilteredOrdersByDate(): Order[] {
    const now = new Date();
    const startDate = new Date();
    
    switch (this.dateFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return this.customerOrders;
    }
    
    return this.customerOrders.filter(order => {
      if (!order.created_at) return true; // Include orders without dates
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate;
    });
  }

  private calculateTopProducts(orders: Order[]) {
    const productStats: {[key: string]: {quantity: number, revenue: number}} = {};
    
    orders.forEach(order => {
      if (order.status === 'approved') {
        const product = this.products.find(p => p.name === order.product);
        const price = product?.price || 0;
        const revenue = price * order.quantity;
        
        if (productStats[order.product]) {
          productStats[order.product].quantity += order.quantity;
          productStats[order.product].revenue += revenue;
        } else {
          productStats[order.product] = {
            quantity: order.quantity,
            revenue: revenue
          };
        }
      }
    });
    
    this.analytics.topProducts = Object.entries(productStats)
      .map(([product, stats]) => ({
        product,
        quantity: stats.quantity,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  private calculateDailySales(orders: Order[]) {
    const dailyStats: {[key: string]: {revenue: number, orders: number}} = {};
    
    // Create date range for selected filter
    const dateRange = this.generateDateRange();
    
    // Initialize all dates with zero values
    dateRange.forEach(date => {
      dailyStats[date] = { revenue: 0, orders: 0 };
    });
    
    // Fill in actual data
    orders.forEach(order => {
      if (order.status === 'approved') {
        const product = this.products.find(p => p.name === order.product);
        const price = product?.price || 0;
        const revenue = price * order.quantity;
        
        // Use created_at or current date
        const dateKey = order.created_at 
          ? new Date(order.created_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        if (dailyStats[dateKey]) {
          dailyStats[dateKey].revenue += revenue;
          dailyStats[dateKey].orders += 1;
        }
      }
    });
    
    this.analytics.dailySales = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        revenue: stats.revenue,
        orders: stats.orders
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Show last 30 days maximum for better visualization
  }

  // Calculate monthly sales for bar chart
  private calculateMonthlySales(orders: Order[]) {
    const monthlyStats: {[key: string]: {revenue: number, orders: number}} = {};
    
    // Generate month range for the current filter
    const monthRange = this.generateMonthRange();
    
    // Initialize all months with zero values
    monthRange.forEach(month => {
      monthlyStats[month] = { revenue: 0, orders: 0 };
    });
    
    // Fill in actual data
    orders.forEach(order => {
      if (order.status === 'approved') {
        const product = this.products.find(p => p.name === order.product);
        const price = product?.price || 0;
        const revenue = price * order.quantity;
        
        // Use created_at or current date
        const date = order.created_at ? new Date(order.created_at) : new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (monthlyStats[monthKey]) {
          monthlyStats[monthKey].revenue += revenue;
          monthlyStats[monthKey].orders += 1;
        }
      }
    });
    
    this.analytics.monthlySales = Object.entries(monthlyStats)
      .map(([month, stats]) => ({
        month,
        revenue: stats.revenue,
        orders: stats.orders,
        period: this.formatMonthPeriod(month)
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Show last 12 months maximum
  }

  // Generate month range based on current filter
  private generateMonthRange(): string[] {
    const months: string[] = [];
    const now = new Date();
    
    switch (this.dateFilter) {
      case 'today':
      case 'week':
        months.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        break;
      case 'month':
        for (let i = 2; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(now.getMonth() - i);
          months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        }
        break;
      case 'year':
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(now.getMonth() - i);
          months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        }
        break;
      case 'all':
        // For 'all', we'll generate based on available order dates
        return [];
    }
    
    return months;
  }

  // Format month period for display
  private formatMonthPeriod(monthString: string): string {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Generate date range based on current filter
  private generateDateRange(): string[] {
    const dates: string[] = [];
    const now = new Date();
    const startDate = new Date();
    
    switch (this.dateFilter) {
      case 'today':
        dates.push(now.toISOString().split('T')[0]);
        break;
      case 'week':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        break;
      case 'month':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        break;
      case 'year':
        for (let i = 364; i >= 0; i -= 7) { // Weekly intervals for year view
          const date = new Date(now);
          date.setDate(now.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
        break;
      case 'all':
        // For 'all', we'll generate based on available order dates
        return [];
    }
    
    return dates;
  }

  // Calculate sales trend
  private calculateSalesTrend() {
    if (this.analytics.dailySales.length < 2) {
      this.analytics.salesTrend = { trend: 'stable', percentage: 0 };
      return;
    }

    const recentData = this.analytics.dailySales.slice(-7); // Last 7 days
    const previousData = this.analytics.dailySales.slice(-14, -7); // Previous 7 days
    
    if (previousData.length === 0) {
      this.analytics.salesTrend = { trend: 'stable', percentage: 0 };
      return;
    }

    const recentTotal = recentData.reduce((sum, day) => sum + day.revenue, 0);
    const previousTotal = previousData.reduce((sum, day) => sum + day.revenue, 0);
    
    if (previousTotal === 0) {
      this.analytics.salesTrend = { 
        trend: recentTotal > 0 ? 'up' : 'stable', 
        percentage: recentTotal > 0 ? 100 : 0 
      };
      return;
    }

    const percentage = ((recentTotal - previousTotal) / previousTotal) * 100;
    
    this.analytics.salesTrend = {
      trend: percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable',
      percentage: Math.abs(Math.round(percentage))
    };
  }

  // Find peak sales day
  private findPeakSalesDay() {
    if (this.analytics.dailySales.length === 0) {
      this.analytics.peakSalesDay = null;
      return;
    }

    const peakDay = this.analytics.dailySales.reduce((peak, current) => 
      current.revenue > peak.revenue ? current : peak
    );

    this.analytics.peakSalesDay = peakDay.revenue > 0 ? peakDay : null;
  }

  // Find peak sales month
  private findPeakSalesMonth() {
    if (this.analytics.monthlySales.length === 0) {
      this.analytics.peakSalesMonth = null;
      return;
    }

    const peakMonth = this.analytics.monthlySales.reduce((peak, current) => 
      current.revenue > peak.revenue ? current : peak
    );

    this.analytics.peakSalesMonth = peakMonth.revenue > 0 ? 
      { month: peakMonth.period, revenue: peakMonth.revenue } : null;
  }

  private calculateSizeSales(orders: Order[]) {
    const sizeStats: {[key: string]: {quantity: number, revenue: number}} = {};
    
    orders.forEach(order => {
      if (order.status === 'approved' && order.size) {
        const product = this.products.find(p => p.name === order.product);
        const price = product?.price || 0;
        const revenue = price * order.quantity;
        
        if (sizeStats[order.size]) {
          sizeStats[order.size].quantity += order.quantity;
          sizeStats[order.size].revenue += revenue;
        } else {
          sizeStats[order.size] = {
            quantity: order.quantity,
            revenue: revenue
          };
        }
      }
    });
    
    this.analytics.sizeSales = Object.entries(sizeStats)
      .map(([size, stats]) => ({
        size,
        quantity: stats.quantity,
        revenue: stats.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private calculateMonthlyRevenue(orders: Order[]) {
    const monthlyStats: {[key: string]: number} = {};
    
    orders.forEach(order => {
      if (order.status === 'approved') {
        const product = this.products.find(p => p.name === order.product);
        const price = product?.price || 0;
        const revenue = price * order.quantity;
        
        // Use created_at or current date
        const date = order.created_at ? new Date(order.created_at) : new Date();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + revenue;
      }
    });
    
    this.analytics.monthlyRevenue = Object.entries(monthlyStats)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Utility methods for template
  getMaxDailySales(): number {
    if (this.analytics.dailySales.length === 0) return 1;
    return Math.max(...this.analytics.dailySales.map(day => day.revenue));
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatMonth(monthString: string): string {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Enhanced daily sales utility methods
  getDailySalesChartHeight(revenue: number): number {
    const maxRevenue = this.getMaxDailySales();
    if (maxRevenue === 0) return 0;
    return Math.max((revenue / maxRevenue) * 100, 2); // Minimum 2% height for visibility
  }

  // Monthly sales utility methods
  getMonthlySalesChartHeight(revenue: number): number {
    const maxRevenue = this.getMaxMonthlySales();
    if (maxRevenue === 0) return 0;
    return Math.max((revenue / maxRevenue) * 100, 2); // Minimum 2% height for visibility
  }

  getMaxMonthlySales(): number {
    if (this.analytics.monthlySales.length === 0) return 1;
    return Math.max(...this.analytics.monthlySales.map(month => month.revenue));
  }

  getTrendIcon(): string {
    switch (this.analytics.salesTrend.trend) {
      case 'up': return 'fa-arrow-trend-up';
      case 'down': return 'fa-arrow-trend-down';
      default: return 'fa-minus';
    }
  }

  getTrendColor(): string {
    switch (this.analytics.salesTrend.trend) {
      case 'up': return '#28a745';
      case 'down': return '#dc3545';
      default: return '#6c757d';
    }
  }

  // Get day name for better labeling
  getDayName(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
  }

  // Interactive chart methods
  selectedDay: any = null;
  selectedMonth: any = null;

  onDayClick(day: any) {
    this.selectedDay = this.selectedDay?.date === day.date ? null : day;
    this.selectedMonth = null; // Clear month selection
  }

  onMonthClick(month: any) {
    this.selectedMonth = this.selectedMonth?.month === month.month ? null : month;
    this.selectedDay = null; // Clear day selection
  }

  getBarColor(item: any): string {
    if (this.chartView === 'daily') {
      if (this.selectedDay?.date === item.date) {
        return '#ff6b35';
      }
      if (item.revenue === 0) {
        return '#e9ecef';
      }
      
      // Use performance-based colors for daily sales
      return this.getPerformanceColor(item.revenue);
    } else {
      if (this.selectedMonth?.month === item.month) {
        return '#ff6b35';
      }
      if (item.revenue === 0) {
        return '#e9ecef';
      }
      return '#007bff';
    }
  }

  // Export daily sales data
  exportDailySales() {
    const exportData = this.analytics.dailySales.map(day => ({
      'Date': day.date,
      'Day': this.getDayName(day.date),
      'Revenue': day.revenue,
      'Orders': day.orders,
      'Avg Order Value': day.orders > 0 ? (day.revenue / day.orders).toFixed(2) : 0
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = { Sheets: { 'Daily Sales': worksheet }, SheetNames: ['Daily Sales'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(data, `daily_sales_${this.dateFilter}.xlsx`);
  }

  // Export monthly sales data
  exportMonthlySales() {
    const exportData = this.analytics.monthlySales.map(month => ({
      'Month': month.period,
      'Revenue': month.revenue,
      'Orders': month.orders,
      'Avg Order Value': month.orders > 0 ? (month.revenue / month.orders).toFixed(2) : 0
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = { Sheets: { 'Monthly Sales': worksheet }, SheetNames: ['Monthly Sales'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(data, `monthly_sales_${this.dateFilter}.xlsx`);
  }

  // Combined export method
  exportCurrentChart() {
    if (this.chartView === 'daily') {
      this.exportDailySales();
    } else {
      this.exportMonthlySales();
    }
  }

  // Enhanced daily sales analysis methods
  getActiveDaysCount(): number {
    return this.analytics.dailySales.filter(day => day.revenue > 0).length;
  }

  getWeekOverWeekGrowth(): string {
    if (this.analytics.dailySales.length < 14) {
      return '0.0';
    }

    // Calculate current week (last 7 days) vs previous week
    const currentWeekSales = this.analytics.dailySales.slice(-7).reduce((sum, day) => sum + day.revenue, 0);
    const previousWeekSales = this.analytics.dailySales.slice(-14, -7).reduce((sum, day) => sum + day.revenue, 0);

    if (previousWeekSales === 0) {
      return currentWeekSales > 0 ? '100.0' : '0.0';
    }

    const growth = ((currentWeekSales - previousWeekSales) / previousWeekSales) * 100;
    return growth >= 0 ? `+${growth.toFixed(1)}` : growth.toFixed(1);
  }

  getGrowthColor(): string {
    const growth = parseFloat(this.getWeekOverWeekGrowth());
    if (growth > 0) return '#28a745'; // Green for positive
    if (growth < 0) return '#dc3545'; // Red for negative
    return '#6c757d'; // Gray for neutral
  }

  // Sales goal tracking methods
  getDailySalesGoal(): number {
    // Set a dynamic goal based on historical performance
    const avgDailySales = this.analytics.dailySales.length > 0 
      ? this.analytics.totalRevenue / this.analytics.dailySales.length 
      : 1000;
    return avgDailySales * 1.2; // 20% above average as goal
  }

  getGoalProgress(dayRevenue: number): number {
    const goal = this.getDailySalesGoal();
    return Math.min((dayRevenue / goal) * 100, 100);
  }

  isGoalAchieved(dayRevenue: number): boolean {
    return dayRevenue >= this.getDailySalesGoal();
  }

  // Performance categorization
  getDayPerformance(dayRevenue: number): 'excellent' | 'good' | 'average' | 'below' {
    const avgDaily = this.analytics.dailySales.length > 0 
      ? this.analytics.totalRevenue / this.analytics.dailySales.length 
      : 0;

    if (dayRevenue >= avgDaily * 1.5) return 'excellent';
    if (dayRevenue >= avgDaily * 1.2) return 'good';
    if (dayRevenue >= avgDaily * 0.8) return 'average';
    return 'below';
  }

  // Get performance color based on revenue
  getPerformanceColor(dayRevenue: number): string {
    const performance = this.getDayPerformance(dayRevenue);
    switch (performance) {
      case 'excellent': return '#28a745';
      case 'good': return '#17a2b8';
      case 'average': return '#ffc107';
      case 'below': return '#dc3545';
      default: return '#6c757d';
    }
  }

  // Sales streak tracking
  getCurrentSalesStreak(): number {
    let streak = 0;
    for (let i = this.analytics.dailySales.length - 1; i >= 0; i--) {
      if (this.analytics.dailySales[i].revenue > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  getLongestSalesStreak(): number {
    let maxStreak = 0;
    let currentStreak = 0;
    
    this.analytics.dailySales.forEach(day => {
      if (day.revenue > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    return maxStreak;
  }

  // ===== PROFESSIONAL REPORT GENERATION =====
  generateProfessionalReport() {
    this.calculateAnalytics(); // Ensure latest data

    const now = new Date();
    const reportDate = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    this.report = {
      generatedDate: reportDate,
      reportPeriod: this.getReportPeriodText(),
      executiveSummary: this.generateExecutiveSummary(),
      sections: this.generateReportSections(),
      charts: this.generateChartData(),
      dataTable: this.generateDataTable(),
      insights: this.generateInsights(),
      conclusions: this.generateConclusions(),
      actionablePoints: this.generateActionablePoints()
    };
  }

  private getReportPeriodText(): string {
    const periods = {
      'today': 'Today',
      'week': 'Last 7 Days',
      'month': 'Last Month',
      'year': 'Last Year',
      'all': 'All Time'
    };
    return periods[this.dateFilter] || 'Selected Period';
  }

  private generateExecutiveSummary() {
    const keyFindings = [];
    const growthRate = parseFloat(this.getWeekOverWeekGrowth());
    
    // Generate key findings based on data
    if (this.analytics.totalRevenue > 0) {
      keyFindings.push(`Generated ₱${this.analytics.totalRevenue.toLocaleString()} in total revenue`);
    }
    
    if (this.analytics.totalOrders > 0) {
      keyFindings.push(`Processed ${this.analytics.totalOrders} orders with ${this.analytics.approvedOrders} approved`);
    }
    
    if (this.analytics.peakSalesDay) {
      keyFindings.push(`Best performing day: ${this.formatDate(this.analytics.peakSalesDay.date)} (₱${this.analytics.peakSalesDay.revenue.toLocaleString()})`);
    }
    
    if (this.analytics.topProducts.length > 0) {
      keyFindings.push(`Top product: ${this.analytics.topProducts[0].product} with ${this.analytics.topProducts[0].quantity} sales`);
    }
    
    if (growthRate > 0) {
      keyFindings.push(`Positive growth trend: ${growthRate}% increase week-over-week`);
    } else if (growthRate < 0) {
      keyFindings.push(`Declining trend: ${Math.abs(growthRate)}% decrease week-over-week`);
    }

    // Determine performance rating
    let performanceRating: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' = 'Average';
    if (growthRate > 20) performanceRating = 'Excellent';
    else if (growthRate > 10) performanceRating = 'Good';
    else if (growthRate < -10) performanceRating = 'Needs Improvement';

    return {
      keyFindings,
      totalRevenue: this.analytics.totalRevenue,
      totalOrders: this.analytics.totalOrders,
      growthRate,
      performanceRating
    };
  }

  private generateReportSections() {
    return {
      salesOverview: {
        totalRevenue: this.analytics.totalRevenue,
        totalOrders: this.analytics.totalOrders,
        approvedOrders: this.analytics.approvedOrders,
        pendingOrders: this.analytics.pendingOrders,
        averageOrderValue: this.analytics.averageOrderValue,
        conversionRate: this.analytics.totalOrders > 0 ? (this.analytics.approvedOrders / this.analytics.totalOrders * 100) : 0,
        activeDays: this.getActiveDaysCount(),
        totalDays: this.analytics.dailySales.length
      },
      performanceAnalysis: {
        bestDay: this.analytics.peakSalesDay,
        worstDay: this.getWorstSalesDay(),
        averageDailySales: this.analytics.dailySales.length > 0 ? this.analytics.totalRevenue / this.analytics.dailySales.length : 0,
        salesConsistency: this.getSalesConsistency(),
        currentStreak: this.getCurrentSalesStreak(),
        longestStreak: this.getLongestSalesStreak()
      },
      productAnalysis: {
        topProducts: this.analytics.topProducts,
        totalProducts: this.products.length,
        averageRevenuePerProduct: this.products.length > 0 ? this.analytics.totalRevenue / this.products.length : 0,
        sizeSales: this.analytics.sizeSales
      },
      trendAnalysis: {
        weekOverWeekGrowth: parseFloat(this.getWeekOverWeekGrowth()),
        monthlyTrend: this.analytics.monthlySales,
        salesTrend: this.analytics.salesTrend,
        seasonality: this.getSeasonalityInsights()
      },
      recommendations: this.generateRecommendations()
    };
  }

  private generateChartData() {
    return {
      dailySalesChart: this.analytics.dailySales.map(day => ({
        date: day.date,
        revenue: day.revenue,
        orders: day.orders,
        performance: this.getDayPerformance(day.revenue)
      })),
      productPerformanceChart: this.analytics.topProducts,
      sizeDistributionChart: this.analytics.sizeSales,
      monthlyTrendChart: this.analytics.monthlySales
    };
  }

  private generateDataTable() {
    return this.analytics.dailySales.map(day => ({
      Date: this.formatDate(day.date),
      Day: this.getDayName(day.date),
      Revenue: `₱${day.revenue.toLocaleString()}`,
      Orders: day.orders,
      'Avg Order Value': day.orders > 0 ? `₱${(day.revenue / day.orders).toFixed(2)}` : '₱0.00',
      Performance: this.getDayPerformance(day.revenue),
      'vs Average': day.revenue > 0 && this.analytics.dailySales.length > 0 ? 
        `${((day.revenue / (this.analytics.totalRevenue / this.analytics.dailySales.length) - 1) * 100).toFixed(1)}%` : '0%'
    }));
  }

  private generateInsights(): string[] {
    const insights = [];
    
    // Revenue insights
    if (this.analytics.totalRevenue > 0) {
      insights.push(`Your business generated ₱${this.analytics.totalRevenue.toLocaleString()} in total revenue during this period.`);
    }
    
    // Order insights
    if (this.analytics.totalOrders > 0) {
      const approvalRate = (this.analytics.approvedOrders / this.analytics.totalOrders * 100).toFixed(1);
      insights.push(`Order approval rate is ${approvalRate}% with ${this.analytics.approvedOrders} out of ${this.analytics.totalOrders} orders approved.`);
    }
    
    // Product insights
    if (this.analytics.topProducts.length > 0) {
      const topProduct = this.analytics.topProducts[0];
      insights.push(`${topProduct.product} is your best-selling product with ${topProduct.quantity} units sold, generating ₱${topProduct.revenue.toLocaleString()} in revenue.`);
    }
    
    // Performance insights
    const growthRate = parseFloat(this.getWeekOverWeekGrowth());
    if (growthRate > 0) {
      insights.push(`Your sales are growing at ${growthRate}% week-over-week, indicating positive momentum.`);
    } else if (growthRate < 0) {
      insights.push(`Sales have declined by ${Math.abs(growthRate)}% compared to last week, requiring attention.`);
    }
    
    // Activity insights
    const activeDays = this.getActiveDaysCount();
    const totalDays = this.analytics.dailySales.length;
    if (totalDays > 0) {
      const activityRate = (activeDays / totalDays * 100).toFixed(1);
      insights.push(`You had sales activity on ${activeDays} out of ${totalDays} days (${activityRate}% activity rate).`);
    }
    
    return insights;
  }

  private generateConclusions(): string[] {
    const conclusions = [];
    const growthRate = parseFloat(this.getWeekOverWeekGrowth());
    
    if (growthRate > 15) {
      conclusions.push("Your business is showing excellent growth momentum with strong week-over-week performance.");
    } else if (growthRate > 5) {
      conclusions.push("Your business is showing steady growth with room for optimization.");
    } else if (growthRate < -10) {
      conclusions.push("Your business is experiencing a decline that requires immediate attention and strategic adjustments.");
    } else {
      conclusions.push("Your business performance is stable with opportunities for growth acceleration.");
    }
    
    if (this.analytics.averageOrderValue > 0) {
      conclusions.push(`Your average order value of ₱${this.analytics.averageOrderValue.toFixed(2)} provides a solid foundation for revenue growth.`);
    }
    
    if (this.getActiveDaysCount() / this.analytics.dailySales.length < 0.5 && this.analytics.dailySales.length > 0) {
      conclusions.push("Increasing sales consistency could significantly boost overall performance.");
    }
    
    return conclusions;
  }

  private generateActionablePoints(): string[] {
    const actionablePoints = [];
    const growthRate = parseFloat(this.getWeekOverWeekGrowth());
    
    // Growth-based recommendations
    if (growthRate < 0) {
      actionablePoints.push("Investigate causes of sales decline and implement recovery strategies.");
      actionablePoints.push("Review product pricing and market positioning.");
    } else if (growthRate > 20) {
      actionablePoints.push("Scale successful strategies and increase inventory for high-performing products.");
    }
    
    // Product-based recommendations
    if (this.analytics.topProducts.length > 0) {
      actionablePoints.push(`Focus marketing efforts on promoting ${this.analytics.topProducts[0].product} as it's your top performer.`);
    }
    
    // Activity-based recommendations
    if (this.getActiveDaysCount() / this.analytics.dailySales.length < 0.7 && this.analytics.dailySales.length > 0) {
      actionablePoints.push("Implement daily sales activities to increase consistency and revenue frequency.");
    }
    
    // Order management recommendations
    if (this.analytics.pendingOrders > 0) {
      actionablePoints.push(`Review and process ${this.analytics.pendingOrders} pending orders to improve customer satisfaction.`);
    }
    
    // Size-based recommendations
    if (this.analytics.sizeSales.length > 0) {
      const topSize = this.analytics.sizeSales[0];
      actionablePoints.push(`Ensure adequate inventory for size ${topSize.size} as it's your most popular size.`);
    }
    
    return actionablePoints;
  }

  // Helper methods for report generation
  private getWorstSalesDay() {
    if (this.analytics.dailySales.length === 0) return null;
    const activeDays = this.analytics.dailySales.filter(day => day.revenue > 0);
    if (activeDays.length === 0) return null;
    return activeDays.reduce((min, day) => day.revenue < min.revenue ? day : min);
  }

  private getSalesConsistency(): number {
    if (this.analytics.dailySales.length === 0) return 0;
    const revenues = this.analytics.dailySales.map(day => day.revenue);
    const mean = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
    const variance = revenues.reduce((sum, rev) => sum + Math.pow(rev - mean, 2), 0) / revenues.length;
    const standardDeviation = Math.sqrt(variance);
    return mean > 0 ? (1 - (standardDeviation / mean)) * 100 : 0;
  }

  private getSeasonalityInsights() {
    const dayOfWeekSales: {[key: string]: number} = {};
    
    this.analytics.dailySales.forEach(day => {
      const dayName = this.getDayName(day.date);
      dayOfWeekSales[dayName] = (dayOfWeekSales[dayName] || 0) + day.revenue;
    });
    
    const sortedDays = Object.entries(dayOfWeekSales)
      .sort(([,a], [,b]) => b - a);
    
    return {
      bestDayOfWeek: sortedDays[0] ? sortedDays[0][0] : 'N/A',
      worstDayOfWeek: sortedDays[sortedDays.length - 1] ? sortedDays[sortedDays.length - 1][0] : 'N/A',
      dayOfWeekSales: dayOfWeekSales
    };
  }

  private generateRecommendations(): string[] {
    const recommendations = [];
    
    // Based on growth rate
    const growthRate = parseFloat(this.getWeekOverWeekGrowth());
    if (growthRate < -5) {
      recommendations.push("Consider promotional campaigns to boost sales");
      recommendations.push("Review and optimize product pricing strategy");
    } else if (growthRate > 10) {
      recommendations.push("Scale up inventory for high-demand products");
      recommendations.push("Consider expanding product line");
    }
    
    // Based on order approval rate
    const approvalRate = this.analytics.totalOrders > 0 ? (this.analytics.approvedOrders / this.analytics.totalOrders) : 0;
    if (approvalRate < 0.8) {
      recommendations.push("Improve order processing efficiency");
      recommendations.push("Review order decline reasons and address common issues");
    }
    
    // Based on product performance
    if (this.analytics.topProducts.length > 0) {
      recommendations.push(`Increase marketing budget for ${this.analytics.topProducts[0].product}`);
    }
    
    return recommendations;
  }

  // Export professional report with charts
  exportProfessionalReport() {
    // Create workbook with multiple sheets
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    
    // Sheet 1: Executive Summary
    const executiveSummaryData = [
      { 'PROFESSIONAL SALES REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'Generated Date:', ' ': this.report.generatedDate, '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'Report Period:', ' ': this.report.reportPeriod, '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'Performance Rating:', ' ': this.report.executiveSummary.performanceRating, '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'EXECUTIVE SUMMARY METRICS', ' ': '', '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'Total Revenue:', ' ': `₱${this.report.executiveSummary.totalRevenue.toLocaleString()}`, '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'Total Orders:', ' ': this.report.executiveSummary.totalOrders.toString(), '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'Growth Rate:', ' ': `${this.report.executiveSummary.growthRate}%`, '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'Avg Order Value:', ' ': `₱${this.analytics.averageOrderValue.toFixed(2)}`, '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'Approval Rate:', ' ': `${this.analytics.totalOrders > 0 ? ((this.analytics.approvedOrders / this.analytics.totalOrders) * 100).toFixed(1) : 0}%`, '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'PROFESSIONAL SALES REPORT': 'KEY FINDINGS', ' ': '', '  ': '', '   ': '' },
      ...this.report.executiveSummary.keyFindings.map(finding => ({ 
        'PROFESSIONAL SALES REPORT': '•', ' ': finding, '  ': '', '   ': '' 
      }))
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(executiveSummaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    // Sheet 2: Daily Sales Data with Chart Data
    const chartDataForExcel = [
      { 'DAILY SALES CHART DATA': '', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'DAILY SALES CHART DATA': 'Date', ' ': 'Day', '  ': 'Revenue', '   ': 'Orders', '    ': 'Performance' },
      ...this.report.dataTable.map(row => ({
        'DAILY SALES CHART DATA': row.Date,
        ' ': row.Day,
        '  ': parseFloat(row.Revenue.replace('₱', '').replace(',', '')),
        '   ': row.Orders,
        '    ': row.Performance
      })),
      { 'DAILY SALES CHART DATA': '', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'DAILY SALES CHART DATA': 'CHART SUMMARY', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'DAILY SALES CHART DATA': 'Peak Day:', ' ': this.analytics.peakSalesDay ? this.formatDate(this.analytics.peakSalesDay.date) : 'N/A', '  ': this.analytics.peakSalesDay ? this.analytics.peakSalesDay.revenue : 0, '   ': '', '    ': '' },
      { 'DAILY SALES CHART DATA': 'Average Daily:', ' ': '', '  ': this.analytics.dailySales.length > 0 ? (this.analytics.totalRevenue / this.analytics.dailySales.length) : 0, '   ': '', '    ': '' },
      { 'DAILY SALES CHART DATA': 'Active Days:', ' ': `${this.getActiveDaysCount()}/${this.analytics.dailySales.length}`, '  ': '', '   ': '', '    ': '' },
      { 'DAILY SALES CHART DATA': 'Growth Rate:', ' ': `${this.getWeekOverWeekGrowth()}%`, '  ': '', '   ': '', '    ': '' }
    ];
    
    const dailySalesSheet = XLSX.utils.json_to_sheet(chartDataForExcel);
    XLSX.utils.book_append_sheet(workbook, dailySalesSheet, 'Daily Sales Chart');

    // Sheet 3: Product Performance Chart Data
    const productChartData = [
      { 'PRODUCT PERFORMANCE CHART': '', ' ': '', '  ': '', '   ': '' },
      { 'PRODUCT PERFORMANCE CHART': 'Product Name', ' ': 'Quantity Sold', '  ': 'Revenue', '   ': 'Percentage' },
      ...this.analytics.topProducts.map((product, index) => ({
        'PRODUCT PERFORMANCE CHART': product.product,
        ' ': product.quantity,
        '  ': product.revenue,
        '   ': this.analytics.totalRevenue > 0 ? ((product.revenue / this.analytics.totalRevenue) * 100).toFixed(1) + '%' : '0%'
      })),
      { 'PRODUCT PERFORMANCE CHART': '', ' ': '', '  ': '', '   ': '' },
      { 'PRODUCT PERFORMANCE CHART': 'PRODUCT INSIGHTS', ' ': '', '  ': '', '   ': '' },
      { 'PRODUCT PERFORMANCE CHART': 'Top Product:', ' ': this.analytics.topProducts[0]?.product || 'N/A', '  ': this.analytics.topProducts[0]?.revenue || 0, '   ': '' },
      { 'PRODUCT PERFORMANCE CHART': 'Total Products:', ' ': this.analytics.topProducts.length.toString(), '  ': '', '   ': '' },
      { 'PRODUCT PERFORMANCE CHART': 'Avg Revenue/Product:', ' ': '', '  ': this.analytics.topProducts.length > 0 ? (this.analytics.totalRevenue / this.analytics.topProducts.length) : 0, '   ': '' }
    ];
    
    const productSheet = XLSX.utils.json_to_sheet(productChartData);
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Product Chart');

    // Sheet 4: Size Distribution Chart Data
    if (this.analytics.sizeSales.length > 0) {
      const sizeChartData = [
        { 'SIZE DISTRIBUTION CHART': '', ' ': '', '  ': '', '   ': '' },
        { 'SIZE DISTRIBUTION CHART': 'Size', ' ': 'Quantity', '  ': 'Revenue', '   ': 'Percentage' },
        ...this.analytics.sizeSales.map(size => ({
          'SIZE DISTRIBUTION CHART': size.size,
          ' ': size.quantity,
          '  ': size.revenue,
          '   ': this.analytics.sizeSales.reduce((sum, s) => sum + s.quantity, 0) > 0 ? 
                 ((size.quantity / this.analytics.sizeSales.reduce((sum, s) => sum + s.quantity, 0)) * 100).toFixed(1) + '%' : '0%'
        })),
        { 'SIZE DISTRIBUTION CHART': '', ' ': '', '  ': '', '   ': '' },
        { 'SIZE DISTRIBUTION CHART': 'SIZE INSIGHTS', ' ': '', '  ': '', '   ': '' },
        { 'SIZE DISTRIBUTION CHART': 'Most Popular Size:', ' ': this.analytics.sizeSales[0]?.size || 'N/A', '  ': this.analytics.sizeSales[0]?.quantity || 0, '   ': '' },
        { 'SIZE DISTRIBUTION CHART': 'Total Sizes Available:', ' ': this.analytics.sizeSales.length.toString(), '  ': '', '   ': '' }
      ];
      
      const sizeSheet = XLSX.utils.json_to_sheet(sizeChartData);
      XLSX.utils.book_append_sheet(workbook, sizeSheet, 'Size Distribution');
    }

    // Sheet 5: Monthly Trend Chart Data
    if (this.analytics.monthlySales.length > 0) {
      const monthlyChartData = [
        { 'MONTHLY TREND CHART': '', ' ': '', '  ': '', '   ': '' },
        { 'MONTHLY TREND CHART': 'Month/Period', ' ': 'Revenue', '  ': 'Orders', '   ': 'Avg Order Value' },
        ...this.analytics.monthlySales.map(month => ({
          'MONTHLY TREND CHART': month.period,
          ' ': month.revenue,
          '  ': month.orders,
          '   ': month.orders > 0 ? (month.revenue / month.orders).toFixed(2) : 0
        })),
        { 'MONTHLY TREND CHART': '', ' ': '', '  ': '', '   ': '' },
        { 'MONTHLY TREND CHART': 'MONTHLY INSIGHTS', ' ': '', '  ': '', '   ': '' },
        { 'MONTHLY TREND CHART': 'Best Month:', ' ': this.analytics.peakSalesMonth ? this.analytics.peakSalesMonth.month : 'N/A', '  ': this.analytics.peakSalesMonth ? this.analytics.peakSalesMonth.revenue : 0, '   ': '' },
        { 'MONTHLY TREND CHART': 'Average Monthly Revenue:', ' ': '', '  ': this.analytics.monthlySales.length > 0 ? (this.analytics.totalRevenue / this.analytics.monthlySales.length) : 0, '   ': '' }
      ];
      
      const monthlySheet = XLSX.utils.json_to_sheet(monthlyChartData);
      XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Trend');
    }

    // Sheet 6: Performance Analytics & Chart Instructions
    const analyticsData = [
      { 'PERFORMANCE ANALYTICS': '', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'PERFORMANCE METRICS', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'Sales Consistency:', ' ': `${this.getSalesConsistency().toFixed(1)}%`, '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'Current Sales Streak:', ' ': `${this.getCurrentSalesStreak()} days`, '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'Longest Sales Streak:', ' ': `${this.getLongestSalesStreak()} days`, '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'Week-over-Week Growth:', ' ': `${this.getWeekOverWeekGrowth()}%`, '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'HOW TO CREATE CHARTS IN EXCEL', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'DAILY SALES CHART:', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '1. Go to "Daily Sales Chart" sheet', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '2. Select data range B2:D' + (this.report.dataTable.length + 2), ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '3. Insert > Charts > Column Chart', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '4. Set Date as X-axis, Revenue as Y-axis', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'PRODUCT PERFORMANCE CHART:', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '1. Go to "Product Chart" sheet', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '2. Select data range A2:C' + (this.analytics.topProducts.length + 2), ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '3. Insert > Charts > Bar Chart', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '4. Set Product as Categories, Revenue as Values', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'SIZE DISTRIBUTION CHART:', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '1. Go to "Size Distribution" sheet', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '2. Select data range A2:C' + (this.analytics.sizeSales.length + 2), ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '3. Insert > Charts > Pie Chart', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '4. Set Size as Labels, Quantity as Values', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': 'MONTHLY TREND CHART:', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '1. Go to "Monthly Trend" sheet', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '2. Select data range A2:C' + (this.analytics.monthlySales.length + 2), ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '3. Insert > Charts > Line Chart', ' ': '', '  ': '', '   ': '' },
      { 'PERFORMANCE ANALYTICS': '4. Set Month as X-axis, Revenue as Y-axis', ' ': '', '  ': '', '   ': '' }
    ];
    
    const analyticsSheet = XLSX.utils.json_to_sheet(analyticsData);
    XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Chart Instructions');

    // Sheet 7: Complete Insights & Recommendations
    const insightsData = [
      { 'INSIGHTS & RECOMMENDATIONS': '', ' ': '', '  ': '' },
      { 'INSIGHTS & RECOMMENDATIONS': 'KEY BUSINESS INSIGHTS', ' ': '', '  ': '' },
      { 'INSIGHTS & RECOMMENDATIONS': '', ' ': '', '  ': '' },
      ...this.report.insights.map(insight => ({ 
        'INSIGHTS & RECOMMENDATIONS': '•', ' ': insight, '  ': '' 
      })),
      { 'INSIGHTS & RECOMMENDATIONS': '', ' ': '', '  ': '' },
      { 'INSIGHTS & RECOMMENDATIONS': 'STRATEGIC RECOMMENDATIONS', ' ': '', '  ': '' },
      { 'INSIGHTS & RECOMMENDATIONS': '', ' ': '', '  ': '' },
      ...this.report.sections.recommendations.map(rec => ({ 
        'INSIGHTS & RECOMMENDATIONS': '•', ' ': rec, '  ': '' 
      })),
      { 'INSIGHTS & RECOMMENDATIONS': '', ' ': '', '  ': '' },
      { 'INSIGHTS & RECOMMENDATIONS': 'IMMEDIATE ACTION ITEMS', ' ': '', '  ': '' },
      { 'INSIGHTS & RECOMMENDATIONS': '', ' ': '', '  ': '' },
      ...this.report.actionablePoints.map((action, index) => ({ 
        'INSIGHTS & RECOMMENDATIONS': `${index + 1}.`, ' ': action, '  ': '' 
      })),
      { 'INSIGHTS & RECOMMENDATIONS': '', ' ': '', '  ': '' },
      { 'INSIGHTS & RECOMMENDATIONS': 'CONCLUSIONS', ' ': '', '  ': '' },
      { 'INSIGHTS & RECOMMENDATIONS': '', ' ': '', '  ': '' },
      ...this.report.conclusions.map(conclusion => ({ 
        'INSIGHTS & RECOMMENDATIONS': '•', ' ': conclusion, '  ': '' 
      }))
    ];
    
    const insightsSheet = XLSX.utils.json_to_sheet(insightsData);
    XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Insights & Actions');

    // Apply formatting to sheets
    this.formatExcelSheet(summarySheet);
    this.formatExcelSheet(dailySalesSheet);
    this.formatExcelSheet(productSheet);
    if (this.analytics.sizeSales.length > 0) {
      const sizeSheet = workbook.Sheets['Size Distribution'];
      this.formatExcelSheet(sizeSheet);
    }
    if (this.analytics.monthlySales.length > 0) {
      const monthlySheet = workbook.Sheets['Monthly Trend'];
      this.formatExcelSheet(monthlySheet);
    }
    this.formatExcelSheet(analyticsSheet);
    this.formatExcelSheet(insightsSheet);

    // Generate and download the file
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(data, `Professional_Sales_Report_with_Charts_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  // Format Excel sheets for better presentation
  private formatExcelSheet(sheet: XLSX.WorkSheet) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    
    // Set column widths
    if (!sheet['!cols']) sheet['!cols'] = [];
    for (let i = 0; i <= range.e.c; i++) {
      sheet['!cols'][i] = { width: 20 };
    }
    
    // Make headers bold and add borders
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!sheet[cellAddress]) continue;
        
        // Format header rows (first few rows)
        if (row <= 1 || (sheet[cellAddress].v && typeof sheet[cellAddress].v === 'string' && 
            (sheet[cellAddress].v.includes('CHART') || sheet[cellAddress].v.includes('SUMMARY') || 
             sheet[cellAddress].v.includes('INSIGHTS') || sheet[cellAddress].v.includes('PERFORMANCE')))) {
          if (!sheet[cellAddress].s) sheet[cellAddress].s = {};
          sheet[cellAddress].s.font = { bold: true };
          sheet[cellAddress].s.fill = { fgColor: { rgb: "CCCCCC" } };
        }
        
        // Format currency values
        if (sheet[cellAddress].v && typeof sheet[cellAddress].v === 'number' && sheet[cellAddress].v > 100) {
          if (!sheet[cellAddress].s) sheet[cellAddress].s = {};
          sheet[cellAddress].s.numFmt = '₱#,##0.00';
        }
      }
    }
  }

  // ===== ORDER SORTING AND FILTERING METHODS =====
  
  // Initialize filtered orders
  initializeFilteredOrders() {
    this.filteredOrders = [...this.customerOrders];
    this.applyFiltersAndSort();
  }

  // Sort orders by field
  sortOrders(field: string) {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to descending
      this.sortField = field;
      this.sortDirection = 'desc';
    }
    this.applyFiltersAndSort();
  }

  // Apply filters and sorting
  applyFiltersAndSort() {
    let filtered = [...this.customerOrders];

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === this.statusFilter);
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.id.toString().includes(searchLower) ||
        order.customer.toLowerCase().includes(searchLower) ||
        order.product.toLowerCase().includes(searchLower) ||
        (order.size && order.size.toLowerCase().includes(searchLower)) ||
        order.status.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let valueA: any = this.getOrderValue(a, this.sortField);
      let valueB: any = this.getOrderValue(b, this.sortField);

      // Handle different data types
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      let comparison = 0;
      if (valueA > valueB) {
        comparison = 1;
      } else if (valueA < valueB) {
        comparison = -1;
      }

      return this.sortDirection === 'desc' ? -comparison : comparison;
    });

    this.filteredOrders = filtered;
  }

  // Get order value for sorting
  private getOrderValue(order: Order, field: string): any {
    switch (field) {
      case 'id': return order.id;
      case 'customer': return order.customer || '';
      case 'product': return order.product || '';
      case 'quantity': return order.quantity || 0;
      case 'size': return order.size || '';
      case 'status': return order.status || '';
      case 'created_at': return order.created_at ? new Date(order.created_at) : new Date();
      default: return '';
    }
  }

  // Get sort icon for table headers
  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort'; // Default sort icon
    }
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // Filter by status
  filterByStatus(status: string) {
    this.statusFilter = status;
    this.applyFiltersAndSort();
  }

  // Search orders
  searchOrders(searchTerm: string) {
    this.searchTerm = searchTerm;
    this.applyFiltersAndSort();
  }

  // Clear all filters
  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.sortField = 'id';
    this.sortDirection = 'desc';
    this.applyFiltersAndSort();
  }

  // Get status badge class
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'declined': return 'status-declined';
      case 'pending': return 'status-pending';
      case 'ready-for-pickup': return 'status-ready-pickup';
      case 'completed': return 'status-completed';
      default: return '';
    }
  }

  // Get status count
  getStatusCount(status: string): number {
    if (status === 'all') {
      return this.customerOrders.length;
    }
    return this.customerOrders.filter(order => order.status === status).length;
  }

  // Track by function for ngFor performance
  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }

  logout() {
    localStorage.removeItem('user_email');
    window.location.href = '/admin-login';
  }
}
