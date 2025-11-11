import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import Swal from 'sweetalert2';
import { ProductService } from '../services/e-comm.service';

interface Order {
  id: number;
  customer: string; // This will be the email
  customer_name?: string; // This will be the actual name from users table
  customer_cellphone?: string; // This will be the cellphone from users table
  cellphone?: string; // Keep this for backward compatibility
  product: string;
  quantity: number;
  price?: number; // Add price property
  size?: string; // Add size property
  status: 'pending' | 'approved' | 'declined' | 'ready-for-pickup' | 'completed';
  vendor?: string; // Add vendor email field
  sellerEmail?: string; // Alternative field name for vendor
  created_at?: string; // Add created date
  pickup_date?: string; // Add pickup date
  remarks?: string; // Add remarks for declined orders
  completion_remarks?: string; // Add completion remarks for completed orders
  or_number?: string; // Add OR Number for completed orders
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
  completedOrders: number;
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
    completedOrders: 0,
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
 
  // Date range for reports
  reportStartDate: string = '';
  reportEndDate: string = '';

  // Order sorting properties
  sortField: string = 'id';
  sortDirection: 'asc' | 'desc' = 'desc';
  filteredOrders: Order[] = [];
  searchTerm: string = '';
  statusFilter: string = 'all';

  // Order details modal properties
  showOrderModal: boolean = false;
  selectedOrder: Order | null = null;

  // OR Number modal properties
  showOrNumberModal: boolean = false;
  orNumber: string = '';
  processingOrder: Order | null = null;

  // Completion remarks modal properties
  showRemarksModal: boolean = false;
  completionRemarks: string = '';
  remarksOrder: Order | null = null;

  constructor(private http: HttpClient, private router: Router, private productService: ProductService) {}

  ngOnInit() {
    // Clean up old localStorage workaround data
    localStorage.removeItem('readyForPickupOrders');
    
    // Initialize date range for reports
    this.initializeDateRange();
    
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

  // Get top products with their most sold size only
  getTopProductsWithSizes() {
    const productSizeMap: {[productName: string]: {
      name: string;
      totalQuantity: number;
      totalRevenue: number;
      sizes: Array<{size: string, quantity: number, revenue: number}>;
    }} = {};

    // Process orders to build product-size combinations
    const filteredOrders = this.getFilteredOrdersByDate();
    
    filteredOrders.forEach(order => {
      if ((order.status === 'approved' || order.status === 'ready-for-pickup' || order.status === 'completed') && order.size) {
        const product = this.products.find(p => p.name === order.product);
        const price = product?.price || 0;
        const revenue = price * order.quantity;

        if (!productSizeMap[order.product]) {
          productSizeMap[order.product] = {
            name: order.product,
            totalQuantity: 0,
            totalRevenue: 0,
            sizes: []
          };
        }

        // Update totals
        productSizeMap[order.product].totalQuantity += order.quantity;
        productSizeMap[order.product].totalRevenue += revenue;

        // Find or create size entry
        let sizeEntry = productSizeMap[order.product].sizes.find(s => s.size === order.size);
        if (!sizeEntry) {
          sizeEntry = { size: order.size, quantity: 0, revenue: 0 };
          productSizeMap[order.product].sizes.push(sizeEntry);
        }

        sizeEntry.quantity += order.quantity;
        sizeEntry.revenue += revenue;
      }
    });

    // Sort products by revenue and return only the most sold size for each product
    const result = Object.values(productSizeMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5) // Top 5 products
      .map(product => {
        // Sort sizes by quantity (most sold first) and take only the top one
        const mostSoldSize = product.sizes.sort((a, b) => b.quantity - a.quantity)[0];
        
        return {
          ...product,
          sizes: mostSoldSize ? [mostSoldSize] : [] // Return only the most sold size
        };
      });

    return result;
  }

  // Get completed orders for the report
  getCompletedOrders() {
    let completedOrders = this.customerOrders.filter(order => order.status === 'completed');
    
    // Filter by date range if both start and end dates are provided
    if (this.reportStartDate && this.reportEndDate) {
      const startDate = new Date(this.reportStartDate);
      const endDate = new Date(this.reportEndDate);
      // Set end date to end of day for inclusive filtering
      endDate.setHours(23, 59, 59, 999);
      
      completedOrders = completedOrders.filter(order => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }
    
    return completedOrders;
  }

  // Get product price by name
  getProductPrice(productName: string): number {
    const product = this.products.find(p => p.name === productName);
    return product ? parseFloat(product.price.toString()) : 0;
  }

  // Get product image by name
  getProductImage(productName: string): string {
    const product = this.products.find(p => p.name === productName);
    return product ? product.image : '67e96269e8a71_gps logo.png'; // fallback to default image
  }

  // Get product description by name
  getProductDescription(productName: string): string {
    const product = this.products.find(p => p.name === productName);
    return product ? product.description : 'No description available';
  }

  // Format order date for display
  formatOrderDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get order date with fallback for different field names
  getOrderDate(order: any): string {
    // Try different possible date field names (including MySQL auto-generated ones)
    const dateValue = order.created_at || 
                     order.order_date || 
                     order.purchase_date || 
                     order.date_created || 
                     order.timestamp ||
                     order.date ||
                     order.created_date ||
                     order.order_time ||
                     order.purchase_time ||
                     order.datetime ||
                     '';
    
    if (!dateValue) {
      return 'Date not available';
    }
    
    return this.formatOrderDate(dateValue);
  }

  // Date range change handler
  onDateRangeChange() {
    // Optional: Add validation or auto-apply logic here
    if (this.reportStartDate && this.reportEndDate) {
      // Ensure start date is not after end date
      if (new Date(this.reportStartDate) > new Date(this.reportEndDate)) {
        // Swap dates if start is after end
        const temp = this.reportStartDate;
        this.reportStartDate = this.reportEndDate;
        this.reportEndDate = temp;
      }
    }
  }

  // Apply custom date range
  applyDateRange() {
    if (!this.reportStartDate || !this.reportEndDate) {
      alert('Please select both start and end dates');
      return;
    }

    // Set dateFilter to custom to trigger the custom date logic
    this.dateFilter = 'all'; // Use 'all' as base and filter by custom dates
    this.generateProfessionalReport();
  }

  // Initialize default date range (last 30 days)
  initializeDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    this.reportEndDate = endDate.toISOString().split('T')[0];
    this.reportStartDate = startDate.toISOString().split('T')[0];
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
    `http://localhost:3001/api/products?seller=${encodeURIComponent(userEmail)}`,
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
        `http://localhost:3001/api/orders`,
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
    
    // Update to ready-for-pickup status instead of approved
    order.status = 'ready-for-pickup';
    
    this.http.post(
      `http://localhost:3001/api/orders?admin=${encodeURIComponent(userEmail ?? '')}`,
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
      next: (response: any) => {
        console.log('Order approved and set to ready for pickup successfully', response);
        // Set pickup date if returned from API
        if (response.pickup_date) {
          order.pickup_date = response.pickup_date;
        }
        this.fetchOrders(); // Refresh the orders list after approval
        // Recalculate analytics to include approved order
        this.calculateAnalytics();
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
    // Show SweetAlert popup with text area for remarks
    Swal.fire({
      title: 'Decline Order',
      text: 'Please provide a reason for declining this order:',
      input: 'textarea',
      inputLabel: 'Remarks',
      inputPlaceholder: 'Enter the reason for declining this order...',
      inputAttributes: {
        'aria-label': 'Enter the reason for declining this order',
        'maxlength': '500'
      },
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Decline Order',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Please provide a reason for declining this order!';
        }
        if (value.length > 500) {
          return 'Remarks cannot exceed 500 characters!';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.processOrderDecline(order, result.value.trim());
      }
    });
  }

  private processOrderDecline(order: Order, remarks: string) {
    const userEmail = localStorage.getItem('user_email');
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      Swal.fire('Error', 'Authentication token not found. Please login again.', 'error');
      this.logout();
      return;
    }
    
    // Update local order status optimistically
    const originalStatus = order.status;
    const originalRemarks = order.remarks;
    order.status = 'declined';
    order.remarks = remarks;
    
    this.http.post(
      `http://localhost:3001/api/orders?admin=${encodeURIComponent(userEmail ?? '')}`,
      { 
        action: 'decline', 
        orderId: order.id,
        adminEmail: userEmail,
        token: token,
        remarks: remarks // Include remarks in the request
      },
      { 
        withCredentials: true,
        headers: this.getHeaders(),
        responseType: 'text' // Use text first to see raw response
      }
    ).subscribe({
      next: (response: string) => {
        console.log('Raw decline response:', response);
        console.log('Response length:', response.length);
        
        try {
          // Try to parse as JSON
          const parsedResponse = JSON.parse(response);
          console.log('Parsed response:', parsedResponse);
          
          if (parsedResponse && parsedResponse.success) {
            console.log('Order declined successfully with remarks');
            Swal.fire({
              icon: 'success',
              title: 'Order Declined',
              text: 'The order has been declined with your remarks.',
              timer: 2000,
              showConfirmButton: false
            });
            this.fetchOrders(); // Refresh the orders list after decline
            // Recalculate analytics to reflect declined order
            this.calculateAnalytics();
          } else {
            console.error('Invalid response structure:', parsedResponse);
            throw new Error('Invalid response from server');
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          console.error('Response that failed to parse:', response);
          throw new Error('Invalid JSON response from server');
        }
      },
      error: (err) => {
        console.error('Decline order error:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error response:', err.error);
        
        // Revert optimistic updates on error
        order.status = originalStatus;
        order.remarks = originalRemarks;
        
        if (err.status === 401) {
          Swal.fire('Error', 'Session expired. Please login again.', 'error');
          this.logout();
        } else if (err.status === 0) {
          Swal.fire('Error', 'Network error. Please check your connection.', 'error');
        } else if (err.status === 200 && err.statusText === 'Unknown Error') {
          // This is likely a CORS or response parsing issue
          console.log('Response headers:', err.headers);
          Swal.fire('Info', 'Order decline may have succeeded. Refreshing data...', 'info');
          this.fetchOrders(); // Try to refresh to see if it actually worked
        } else {
          Swal.fire('Error', `Failed to decline order. Status: ${err.status}`, 'error');
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
      `http://localhost:3001/api/orders?admin=${encodeURIComponent(userEmail ?? '')}`,
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
        // Recalculate analytics to include updated order status
        this.calculateAnalytics();
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

  // Export Order Management Report based on current filters
  exportOrderManagementReport(): void {
    // Use filtered orders based on current search term and status filter
    const ordersToExport = this.filteredOrders;
    
    if (ordersToExport.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Orders to Export',
        text: 'No orders match the current filters. Please adjust your filters and try again.',
        timer: 3001,
        showConfirmButton: false
      });
      return;
    }

    // Create workbook for order management report
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    
    // Sheet 1: Order Management Summary
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const summaryData = [
      { 'ORDER MANAGEMENT REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'ORDER MANAGEMENT REPORT', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Generated Date:', ' ': currentDate, '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Applied Filters:', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '  - Status Filter:', ' ': this.statusFilter === 'all' ? 'All Statuses' : this.statusFilter.toUpperCase(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '  - Search Term:', ' ': this.searchTerm || 'None', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '  - Sort Field:', ' ': this.sortField, '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '  - Sort Direction:', ' ': this.sortDirection.toUpperCase(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'SUMMARY STATISTICS', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Total Orders (Filtered):', ' ': ordersToExport.length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Total Orders (All):', ' ': this.customerOrders.length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'STATUS BREAKDOWN (Filtered Results)', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Pending Orders:', ' ': ordersToExport.filter(o => o.status === 'pending').length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Approved Orders:', ' ': ordersToExport.filter(o => o.status === 'approved').length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Declined Orders:', ' ': ordersToExport.filter(o => o.status === 'declined').length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Ready for Pickup:', ' ': ordersToExport.filter(o => o.status === 'ready-for-pickup').length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Completed Orders:', ' ': ordersToExport.filter(o => o.status === 'completed').length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'COMPLETION REMARKS STATISTICS', ' ': '', '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Orders with OR Numbers:', ' ': ordersToExport.filter(o => o.or_number && o.or_number.trim() !== '').length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Orders with Completion Remarks:', ' ': ordersToExport.filter(o => o.completion_remarks && o.completion_remarks.trim() !== '').length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': 'Completed Orders with Remarks:', ' ': ordersToExport.filter(o => o.status === 'completed' && o.completion_remarks && o.completion_remarks.trim() !== '').length.toString(), '  ': '', '   ': '' },
      { 'ORDER MANAGEMENT REPORT': '', ' ': '', '  ': '', '   ': '' }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Report Summary');

    // Sheet 2: Detailed Order List
    const detailedOrdersData = [
      { 'DETAILED ORDERS': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '', '      ': '', '       ': '', '        ': '', '         ': '', '          ': '' },
      { 'DETAILED ORDERS': 'Order #', ' ': 'Customer Name', '  ': 'Customer Email', '   ': 'Cellphone', '    ': 'Product', '     ': 'Size', '      ': 'Status', '       ': 'Order Date', '        ': 'Pickup Date', '         ': 'OR Number', '          ': 'Completion Remarks' },
      ...ordersToExport.map(order => ({
        'DETAILED ORDERS': `#${order.id}`,
        ' ': order.customer_name || 'N/A',
        '  ': order.customer || 'N/A',
        '   ': order.customer_cellphone || order.cellphone || 'N/A',
        '    ': order.product,
        '     ': order.size || 'N/A',
        '      ': order.status.toUpperCase(),
        '       ': this.getOrderDate(order),
        '        ': order.pickup_date ? new Date(order.pickup_date).toLocaleDateString('en-US') : 'N/A',
        '         ': order.or_number || 'N/A',
        '          ': order.completion_remarks || 'N/A'
      }))
    ];
    
    const ordersSheet = XLSX.utils.json_to_sheet(detailedOrdersData);
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Detailed Orders');

    // Sheet 3: Status-wise Analysis
    const statusAnalysisData = [
      { 'STATUS ANALYSIS': '', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'STATUS ANALYSIS': 'STATUS-WISE ANALYSIS', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'STATUS ANALYSIS': '', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'STATUS ANALYSIS': 'Status', ' ': 'Count', '  ': 'Percentage', '   ': 'Revenue (Est.)', '    ': 'Products' },
    ];

    const statusGroups = ['pending', 'approved', 'declined', 'ready-for-pickup', 'completed'];
    const totalFiltered = ordersToExport.length;

    statusGroups.forEach(status => {
      const statusOrders = ordersToExport.filter(o => o.status === status);
      const count = statusOrders.length;
      const percentage = totalFiltered > 0 ? ((count / totalFiltered) * 100).toFixed(1) : '0.0';
      const revenue = statusOrders.reduce((sum, order) => sum + this.getProductPrice(order.product), 0);
      const uniqueProducts = [...new Set(statusOrders.map(o => o.product))].length;

      statusAnalysisData.push({
        'STATUS ANALYSIS': status.toUpperCase(),
        ' ': count.toString(),
        '  ': `${percentage}%`,
        '   ': `₱${revenue.toFixed(2)}`,
        '    ': uniqueProducts.toString()
      });
    });

    const statusSheet = XLSX.utils.json_to_sheet(statusAnalysisData);
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Analysis');

    // Sheet 4: Product Performance (based on filtered orders)
    const productPerformanceMap: {[product: string]: {
      total: number,
      pending: number,
      approved: number,
      declined: number,
      readyPickup: number,
      completed: number,
      revenue: number
    }} = {};

    ordersToExport.forEach(order => {
      if (!productPerformanceMap[order.product]) {
        productPerformanceMap[order.product] = {
          total: 0,
          pending: 0,
          approved: 0,
          declined: 0,
          readyPickup: 0,
          completed: 0,
          revenue: 0
        };
      }
      
      const productData = productPerformanceMap[order.product];
      productData.total++;
      productData.revenue += this.getProductPrice(order.product);
      
      switch (order.status) {
        case 'pending': productData.pending++; break;
        case 'approved': productData.approved++; break;
        case 'declined': productData.declined++; break;
        case 'ready-for-pickup': productData.readyPickup++; break;
        case 'completed': productData.completed++; break;
      }
    });

    const productPerformanceData = [
      { 'PRODUCT PERFORMANCE': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '', '      ': '', '       ': '', '        ': '' },
      { 'PRODUCT PERFORMANCE': 'Product', ' ': 'Total Orders', '  ': 'Pending', '   ': 'Approved', '    ': 'Declined', '     ': 'Ready Pickup', '      ': 'Completed', '       ': 'Revenue', '        ': 'Success Rate' },
      ...Object.entries(productPerformanceMap)
        .sort(([,a], [,b]) => b.total - a.total)
        .map(([product, data]) => {
          const successRate = data.total > 0 ? (((data.approved + data.readyPickup + data.completed) / data.total) * 100).toFixed(1) : '0.0';
          return {
            'PRODUCT PERFORMANCE': product,
            ' ': data.total.toString(),
            '  ': data.pending.toString(),
            '   ': data.approved.toString(),
            '    ': data.declined.toString(),
            '     ': data.readyPickup.toString(),
            '      ': data.completed.toString(),
            '       ': `₱${data.revenue.toFixed(2)}`,
            '        ': `${successRate}%`
          };
        })
    ];

    const productSheet = XLSX.utils.json_to_sheet(productPerformanceData);
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Product Performance');

    // Sheet 5: Completion Remarks (for completed orders with remarks)
    const completedOrdersWithRemarks = ordersToExport.filter(order => 
      order.status === 'completed' && order.completion_remarks && order.completion_remarks.trim() !== ''
    );
    
    const completionRemarksData = [
      { 'COMPLETION REMARKS': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETION REMARKS': 'COMPLETION REMARKS REPORT', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETION REMARKS': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETION REMARKS': `Total Completed Orders: ${ordersToExport.filter(o => o.status === 'completed').length}`, ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETION REMARKS': `Orders with Remarks: ${completedOrdersWithRemarks.length}`, ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETION REMARKS': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETION REMARKS': 'Order #', ' ': 'Customer', '  ': 'Product', '   ': 'OR Number', '    ': 'Completion Date', '     ': 'Completion Remarks' },
      ...completedOrdersWithRemarks.map(order => ({
        'COMPLETION REMARKS': `#${order.id}`,
        ' ': order.customer_name || order.customer || 'N/A',
        '  ': order.product,
        '   ': order.or_number || 'N/A',
        '    ': this.getOrderDate(order),
        '     ': order.completion_remarks || 'N/A'
      }))
    ];

    // Add message if no completion remarks found
    if (completedOrdersWithRemarks.length === 0) {
      completionRemarksData.push({
        'COMPLETION REMARKS': 'No completed orders with remarks found in the current filter.',
        ' ': '',
        '  ': '',
        '   ': '',
        '    ': '',
        '     ': ''
      });
    }

    const remarksSheet = XLSX.utils.json_to_sheet(completionRemarksData);
    XLSX.utils.book_append_sheet(workbook, remarksSheet, 'Completion Remarks');

    // Apply formatting to all sheets
    [summarySheet, ordersSheet, statusSheet, productSheet, remarksSheet].forEach(sheet => {
      this.formatExcelSheet(sheet);
    });

    // Generate filename based on filters
    let filename = 'Order_Management_Report';
    if (this.statusFilter !== 'all') {
      filename += `_${this.statusFilter.toUpperCase()}`;
    }
    if (this.searchTerm) {
      filename += `_Search_${this.searchTerm.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Generate and download the file
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    FileSaver.saveAs(data, filename);

    // Show success message
    const completedWithRemarks = ordersToExport.filter(o => 
      o.status === 'completed' && o.completion_remarks && o.completion_remarks.trim() !== ''
    ).length;
    
    Swal.fire({
      icon: 'success',
      title: 'Report Generated!',
      text: `Order management report generated successfully with ${ordersToExport.length} orders across 5 sheets. ${completedWithRemarks} completed orders include completion remarks.`,
      timer: 4000,
      showConfirmButton: false
    });
  }

  // Fetch products for analytics
  fetchProducts() {
    const userEmail = localStorage.getItem('user_email');
    if (!userEmail) return;

    this.http.get<any>(
      `http://localhost:3001/api/products?seller=${encodeURIComponent(userEmail)}`,
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
        completedOrders: 0,
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
    this.analytics.approvedOrders = filteredOrders.filter(o => 
      o.status === 'approved' || o.status === 'ready-for-pickup' || o.status === 'completed'
    ).length;
    this.analytics.completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
    this.analytics.pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
    
    // Calculate revenue (include approved, ready-for-pickup, and completed orders)
    let totalRevenue = 0;
    const revenueGeneratingOrders = filteredOrders.filter(order => 
      order.status === 'approved' || 
      order.status === 'ready-for-pickup' || 
      order.status === 'completed'
    );
    
    revenueGeneratingOrders.forEach(order => {
      const product = this.products.find(p => p.name === order.product);
      const price = product?.price || 0;
      totalRevenue += price * order.quantity;
    });
    
    this.analytics.totalRevenue = totalRevenue;
    this.analytics.averageOrderValue = revenueGeneratingOrders.length > 0 
      ? totalRevenue / revenueGeneratingOrders.length 
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
      if (order.status === 'approved' || order.status === 'ready-for-pickup' || order.status === 'completed') {
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
      if (order.status === 'approved' || order.status === 'ready-for-pickup' || order.status === 'completed') {
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
      if (order.status === 'approved' || order.status === 'ready-for-pickup' || order.status === 'completed') {
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
      if ((order.status === 'approved' || order.status === 'ready-for-pickup' || order.status === 'completed') && order.size) {
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
      if (order.status === 'approved' || order.status === 'ready-for-pickup' || order.status === 'completed') {
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
    // If custom date range is set, display the actual dates
    if (this.reportStartDate && this.reportEndDate) {
      const startDate = new Date(this.reportStartDate);
      const endDate = new Date(this.reportEndDate);
      
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      };
      
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    
    // Fallback to predefined periods
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
    const completedOrders = this.getCompletedOrders();
    const keyFindings = [];
    
    // Calculate total revenue from completed orders in the selected period
    const totalRevenue = completedOrders.reduce((sum, order) => {
      return sum + this.getProductPrice(order.product) * order.quantity;
    }, 0);
    
    const totalCompletedOrders = completedOrders.length;
    const growthRate = parseFloat(this.getWeekOverWeekGrowth());
    
    // Generate key findings based on completed orders data
    if (totalRevenue > 0) {
      keyFindings.push(`Generated ₱${totalRevenue.toLocaleString()} in total revenue from completed orders`);
    }
    
    if (totalCompletedOrders > 0) {
      keyFindings.push(`Completed ${totalCompletedOrders} orders in the selected period`);
    }
    
    // Calculate average order value for completed orders
    const avgOrderValue = totalCompletedOrders > 0 ? totalRevenue / totalCompletedOrders : 0;
    if (avgOrderValue > 0) {
      keyFindings.push(`Average order value: ₱${avgOrderValue.toFixed(2)}`);
    }
    
    // Find best selling product in completed orders
    const productSales: {[key: string]: number} = {};
    completedOrders.forEach(order => {
      productSales[order.product] = (productSales[order.product] || 0) + order.quantity;
    });
    
    const bestProduct = Object.entries(productSales).sort(([,a], [,b]) => b - a)[0];
    if (bestProduct) {
      keyFindings.push(`Best selling product: ${bestProduct[0]} with ${bestProduct[1]} sales`);
    }
    
    if (growthRate > 0) {
      keyFindings.push(`Positive growth trend: ${growthRate}% increase week-over-week`);
    } else if (growthRate < 0) {
      keyFindings.push(`Declining trend: ${Math.abs(growthRate)}% decrease week-over-week`);
    }

    // Determine performance rating based on completed orders
    let performanceRating: 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' = 'Average';
    if (totalCompletedOrders > 50 && avgOrderValue > 1000) performanceRating = 'Excellent';
    else if (totalCompletedOrders > 20 && avgOrderValue > 500) performanceRating = 'Good';
    else if (totalCompletedOrders < 5) performanceRating = 'Needs Improvement';

    return {
      keyFindings,
      totalRevenue: totalRevenue,
      totalOrders: totalCompletedOrders,
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
    this.exportSalesReportData();
  }

  // Export sales report data - matches what's displayed in the sales report view
  exportSalesReportData() {
    // Get the completed orders that are displayed in the report
    const completedOrders = this.getCompletedOrders();
    
    // Filter orders based on the selected date range if custom dates are set
    let filteredOrders = completedOrders;
    if (this.reportStartDate && this.reportEndDate) {
      const startDate = new Date(this.reportStartDate);
      const endDate = new Date(this.reportEndDate);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      
      filteredOrders = completedOrders.filter(order => {
        if (!order.created_at) return false;
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    // Create workbook with sales report data
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    
    // Sheet 1: Sales Report Summary
    const reportSummaryData = [
      { 'SALES REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'SALES REPORT': 'SALES REPORT SUMMARY', ' ': '', '  ': '', '   ': '' },
      { 'SALES REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'SALES REPORT': 'Generated Date:', ' ': this.report.generatedDate, '  ': '', '   ': '' },
      { 'SALES REPORT': 'Report Period:', ' ': this.report.reportPeriod, '  ': '', '   ': '' },
      { 'SALES REPORT': 'Date Range:', ' ': this.reportStartDate && this.reportEndDate ? `${this.reportStartDate} to ${this.reportEndDate}` : 'All Time', '  ': '', '   ': '' },
      { 'SALES REPORT': '', ' ': '', '  ': '', '   ': '' },
      { 'SALES REPORT': 'EXECUTIVE SUMMARY', ' ': '', '  ': '', '   ': '' },
      { 'SALES REPORT': 'Total Revenue:', ' ': `₱${this.report.executiveSummary.totalRevenue.toLocaleString()}`, '  ': '', '   ': '' },
      { 'SALES REPORT': 'Total Completed Orders:', ' ': filteredOrders.length.toString(), '  ': '', '   ': '' },
      { 'SALES REPORT': 'All Orders (Total):', ' ': this.report.executiveSummary.totalOrders.toString(), '  ': '', '   ': '' },
      { 'SALES REPORT': 'Average Order Value:', ' ': `₱${filteredOrders.length > 0 ? (filteredOrders.reduce((sum, order) => sum + this.getProductPrice(order.product), 0) / filteredOrders.length).toFixed(2) : '0.00'}`, '  ': '', '   ': '' },
      { 'SALES REPORT': '', ' ': '', '  ': '', '   ': '' }
    ];
    
    const summarySheet = XLSX.utils.json_to_sheet(reportSummaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Report Summary');

    // Sheet 2: Completed Orders (Main Data) - Each size as separate row
    const completedOrdersData = [
      { 'COMPLETED ORDERS': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETED ORDERS': 'Order #', ' ': 'Product Name', '  ': 'Size', '   ': 'Price', '    ': 'OR Number', '     ': 'Date Completed' },
      ...filteredOrders.map(order => ({
        'COMPLETED ORDERS': `#${order.id}`,
        ' ': order.product,
        '  ': order.size || 'N/A',
        '   ': `₱${this.getProductPrice(order.product).toFixed(2)}`,
        '    ': order.or_number || 'N/A',
        '     ': this.getOrderDate(order)
      })),
      { 'COMPLETED ORDERS': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETED ORDERS': 'TOTALS', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETED ORDERS': 'Total Orders:', ' ': filteredOrders.length.toString(), '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETED ORDERS': 'Total Revenue:', ' ': `₱${filteredOrders.reduce((sum, order) => sum + this.getProductPrice(order.product), 0).toFixed(2)}`, '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'COMPLETED ORDERS': 'Date Range:', ' ': this.reportStartDate && this.reportEndDate ? `${this.reportStartDate} to ${this.reportEndDate}` : 'All Time', '  ': '', '   ': '', '    ': '', '     ': '' }
    ];
    
    const ordersSheet = XLSX.utils.json_to_sheet(completedOrdersData);
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Completed Orders');

    // Sheet 3: Product-Size Summary (Each size as separate entry)
    const productSizeSummary: {[key: string]: {count: number, revenue: number, orNumbers: string[]}} = {};
    
    filteredOrders.forEach(order => {
      const productSizeKey = `${order.product} - ${order.size || 'No Size'}`;
      if (!productSizeSummary[productSizeKey]) {
        productSizeSummary[productSizeKey] = {count: 0, revenue: 0, orNumbers: []};
      }
      productSizeSummary[productSizeKey].count++;
      productSizeSummary[productSizeKey].revenue += this.getProductPrice(order.product);
      if (order.or_number && !productSizeSummary[productSizeKey].orNumbers.includes(order.or_number)) {
        productSizeSummary[productSizeKey].orNumbers.push(order.or_number);
      }
    });

    const productSummaryData = [
      { 'PRODUCT-SIZE SUMMARY': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'PRODUCT-SIZE SUMMARY': 'Product - Size', ' ': 'Orders Count', '  ': 'Total Revenue', '   ': 'Avg Price', '    ': 'OR Numbers', '     ': 'Revenue %' },
      ...Object.entries(productSizeSummary)
        .sort(([,a], [,b]) => b.revenue - a.revenue)
        .map(([productSize, data]) => {
          const totalRevenue = filteredOrders.reduce((sum, order) => sum + this.getProductPrice(order.product), 0);
          const revenuePercentage = totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : '0.0';
          return {
            'PRODUCT-SIZE SUMMARY': productSize,
            ' ': data.count.toString(),
            '  ': `₱${data.revenue.toFixed(2)}`,
            '   ': `₱${(data.revenue / data.count).toFixed(2)}`,
            '    ': data.orNumbers.join(', ') || 'N/A',
            '     ': `${revenuePercentage}%`
          };
        }),
      { 'PRODUCT-SIZE SUMMARY': '', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'PRODUCT-SIZE SUMMARY': 'SUMMARY', ' ': '', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'PRODUCT-SIZE SUMMARY': 'Total Product-Size Combinations:', ' ': Object.keys(productSizeSummary).length.toString(), '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'PRODUCT-SIZE SUMMARY': 'Best Selling Combination:', ' ': Object.entries(productSizeSummary).sort(([,a], [,b]) => b.count - a.count)[0]?.[0] || 'N/A', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'PRODUCT-SIZE SUMMARY': 'Highest Revenue Combination:', ' ': Object.entries(productSizeSummary).sort(([,a], [,b]) => b.revenue - a.revenue)[0]?.[0] || 'N/A', '  ': '', '   ': '', '    ': '', '     ': '' },
      { 'PRODUCT-SIZE SUMMARY': 'Total OR Numbers Issued:', ' ': [...new Set(filteredOrders.filter(o => o.or_number).map(o => o.or_number))].length.toString(), '  ': '', '   ': '', '    ': '', '     ': '' }
    ];
    
    const productSheet = XLSX.utils.json_to_sheet(productSummaryData);
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Product-Size Summary');

    // Sheet 4: OR Number Tracking
    const orNumberData = [
      { 'OR NUMBER TRACKING': '', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'OR NUMBER TRACKING': 'OR Number', ' ': 'Order #', '  ': 'Product - Size', '   ': 'Amount', '    ': 'Date Completed' },
      ...filteredOrders
        .filter(order => order.or_number)
        .sort((a, b) => (a.or_number || '').localeCompare(b.or_number || ''))
        .map(order => ({
          'OR NUMBER TRACKING': order.or_number,
          ' ': `#${order.id}`,
          '  ': `${order.product} - ${order.size || 'No Size'}`,
          '   ': `₱${this.getProductPrice(order.product).toFixed(2)}`,
          '    ': this.getOrderDate(order)
        })),
      { 'OR NUMBER TRACKING': '', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'OR NUMBER TRACKING': 'OR SUMMARY', ' ': '', '  ': '', '   ': '', '    ': '' },
      { 'OR NUMBER TRACKING': 'Total OR Numbers Issued:', ' ': [...new Set(filteredOrders.filter(o => o.or_number).map(o => o.or_number))].length.toString(), '  ': '', '   ': '', '    ': '' },
      { 'OR NUMBER TRACKING': 'Orders with OR:', ' ': filteredOrders.filter(o => o.or_number).length.toString(), '  ': '', '   ': '', '    ': '' },
      { 'OR NUMBER TRACKING': 'Orders without OR:', ' ': filteredOrders.filter(o => !o.or_number).length.toString(), '  ': '', '   ': '', '    ': '' },
      { 'OR NUMBER TRACKING': 'Total Revenue with OR:', ' ': `₱${filteredOrders.filter(o => o.or_number).reduce((sum, order) => sum + this.getProductPrice(order.product), 0).toFixed(2)}`, '  ': '', '   ': '', '    ': '' }
    ];
    
    const orNumberSheet = XLSX.utils.json_to_sheet(orNumberData);
    XLSX.utils.book_append_sheet(workbook, orNumberSheet, 'OR Number Tracking');

    // Apply formatting to sheets
    this.formatExcelSheet(summarySheet);
    this.formatExcelSheet(ordersSheet);
    this.formatExcelSheet(productSheet);
    this.formatExcelSheet(orNumberSheet);

    // Generate and download the file
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create filename based on date range
    const dateRangeText = this.reportStartDate && this.reportEndDate ? 
      `${this.reportStartDate}_to_${this.reportEndDate}` : 
      'All_Time';
    
    FileSaver.saveAs(data, `Sales_Report_${dateRangeText}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      case 'pickup_date': return order.pickup_date ? new Date(order.pickup_date) : new Date('1900-01-01');
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

  // Order Details Modal Methods
  viewOrderDetails(order: Order) {
    console.log('🔍 VIEWING ORDER DETAILS');
    console.log('Selected order:', order);
    
    this.selectedOrder = order;
    this.showOrderModal = true;
  }

  closeOrderModal() {
    console.log('🚪 CLOSING ORDER MODAL');
    this.showOrderModal = false;
    this.selectedOrder = null;
  }

  // Debug method to force refresh product data
  forceRefreshProducts() {
    console.log('🔄 FORCE REFRESHING PRODUCTS');
    this.fetchProducts();
  }

  approveOrderFromModal() {
    if (this.selectedOrder) {
      this.approveOrder(this.selectedOrder);
      this.closeOrderModal();
    }
  }

  declineOrderFromModal() {
    if (this.selectedOrder) {
      this.declineOrder(this.selectedOrder);
      this.closeOrderModal();
    }
  }

  // Base URL for images
  private baseUrl: string = 'http://localhost:3001/e-comm-images/';

  // Get image URL - ensure we display the exact product image
  getImageUrl(image: string): string {
    console.log('🖼️ CONSTRUCTING IMAGE URL');
    console.log('Input image path:', image);
    console.log('Base URL:', this.baseUrl);
    
    if (!image || image.trim() === '') {
      console.log('⚠️ No image path provided, using fallback GPS logo');
      const fallbackUrl = this.baseUrl + '67e96269e8a71_gps logo.png';
      console.log('Fallback URL:', fallbackUrl);
      return fallbackUrl;
    }
    
    // Extract filename from any path format
    const filename = image.split('/').pop()?.split('\\').pop() || image;
    
    // Construct URL with base URL + filename
    const fullUrl = this.baseUrl + filename.trim();
    console.log('✅ Final image URL:', fullUrl);
    return fullUrl;
  }

  onImageError(event: any) {
    // Handle image load error more carefully to show exact product images
    const currentSrc = event.target.src;
    
    console.log('🚨 IMAGE LOAD ERROR 🚨');
    console.log('Failed image URL:', currentSrc);
    
    // Only use fallback if we're not already showing a fallback image
    if (!currentSrc.includes('67e96269e8a71_gps logo.png') && 
        !currentSrc.includes('data:image/svg+xml')) {
      
      // Try the GPS logo as a last resort
      console.log('🔄 Falling back to GPS logo');
      event.target.src = this.baseUrl + '67e96269e8a71_gps logo.png';
      return;
    }
    
    // If even the GPS logo fails, use SVG placeholder
    if (currentSrc.includes('67e96269e8a71_gps logo.png')) {
      console.log('🔄 GPS logo failed, using SVG placeholder');
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
    }
    
    // Prevent further error events on this element
    event.target.onerror = null;
  }

  // Method to confirm order pickup by customer from modal
  confirmPickupFromModal(): void {
    if (!this.selectedOrder) {
      console.error('Selected order is null');
      Swal.fire('Error', 'No order selected. Please try again.', 'error');
      return;
    }
    
    // Show OR Number modal instead of direct confirmation
    this.processingOrder = this.selectedOrder;
    this.showOrNumberModal = true;
    this.orNumber = ''; // Reset OR number field
  }

  // Close OR Number modal
  closeOrNumberModal(): void {
    this.showOrNumberModal = false;
    this.orNumber = '';
    this.processingOrder = null;
  }

  // Open remarks modal for completed orders
  openRemarksModal(order: Order): void {
    this.remarksOrder = order;
    this.completionRemarks = order.completion_remarks || '';
    this.showRemarksModal = true;
  }

  // Close remarks modal
  closeRemarksModal(): void {
    this.showRemarksModal = false;
    this.completionRemarks = '';
    this.remarksOrder = null;
  }

  // Submit completion remarks
  submitCompletionRemarks(): void {
    if (!this.remarksOrder) {
      return;
    }

    // Validate remarks input
    if (!this.completionRemarks || this.completionRemarks.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Remarks Required',
        text: 'Please enter your remarks before submitting.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    const token = localStorage.getItem('auth_token');
    const userEmail = localStorage.getItem('user_email');
    
    if (!token || !userEmail) {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Error',
        text: 'Please login again to continue.',
        timer: 3001,
        showConfirmButton: false
      });
      return;
    }

    // Update local order optimistically
    const originalRemarks = this.remarksOrder.completion_remarks;
    this.remarksOrder.completion_remarks = this.completionRemarks.trim();

    // Call API to save completion remarks
    this.http.post(
      `http://localhost:3001/api/orders?admin=${encodeURIComponent(userEmail)}`,
      { 
        action: 'update-completion-remarks', 
        orderId: this.remarksOrder.id,
        remarks: this.completionRemarks.trim()
      },
      { 
        withCredentials: true,
        headers: this.getHeaders(),
        responseType: 'text'
      }
    ).subscribe({
      next: (response: string) => {
        console.log('✅ COMPLETION REMARKS RESPONSE:', response);
        
        // Close the remarks modal
        this.closeRemarksModal();
        
        // Show success message
        Swal.fire({
          icon: 'success',
          title: 'Remarks Saved!',
          text: 'Completion remarks have been saved successfully.',
          timer: 2000,
          showConfirmButton: false
        });
        
        // Refresh orders to get updated data
        this.fetchOrders();
      },
      error: (err) => {
        console.error('❌ COMPLETION REMARKS ERROR:', err);
        
        // Revert local changes
        if (this.remarksOrder) {
          this.remarksOrder.completion_remarks = originalRemarks;
        }
        
        // Show error message
        Swal.fire({
          icon: 'error',
          title: 'Error Saving Remarks',
          text: 'Failed to save completion remarks. Please try again.',
          timer: 3001,
          showConfirmButton: false
        });
      }
    });
  }

  // Submit OR Number and confirm pickup
  submitOrNumberAndConfirmPickup(): void {
    if (!this.processingOrder) {
      console.error('Processing order is null');
      Swal.fire('Error', 'Order data is missing. Please close and try again.', 'error');
      this.closeOrNumberModal();
      return;
    }
    
    // Validate OR Number
    if (!this.orNumber || this.orNumber.trim() === '') {
      Swal.fire({
        icon: 'error',
        title: 'OR Number Required',
        text: 'Please enter the Official Receipt Number before confirming pickup.',
        customClass: {
          popup: 'swal-on-top'
        },
        didOpen: () => {
          const swalContainer = document.querySelector('.swal2-container');
          if (swalContainer) {
            (swalContainer as HTMLElement).style.zIndex = '9999';
          }
        }
      });
      return;
    }

    // Show confirmation dialog with OR Number
    Swal.fire({
      title: 'Confirm Customer Pickup',
      html: `
        <p>Confirm that customer has picked up "<strong>${this.processingOrder.product}</strong>"?</p>
        <p><strong>OR Number:</strong> ${this.orNumber}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Yes, confirm pickup',
      cancelButtonText: 'Cancel',
      // Ensure SweetAlert appears above all modals
      customClass: {
        popup: 'swal-on-top'
      },
      // Set higher z-index to appear above modals
      didOpen: () => {
        const swalContainer = document.querySelector('.swal2-container');
        if (swalContainer) {
          (swalContainer as HTMLElement).style.zIndex = '9999';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Add null check before calling processPickupConfirmation
        if (this.processingOrder) {
          this.processPickupConfirmation(this.processingOrder);
        } else {
          Swal.fire('Error', 'Order data is missing. Please try again.', 'error');
          this.closeOrNumberModal();
        }
      }
    });
  }

  private processPickupConfirmation(order: Order): void {
    // Add null check for order parameter
    if (!order) {
      console.error('Order is null in processPickupConfirmation');
      Swal.fire('Error', 'Order data is missing. Please try again.', 'error');
      this.closeOrNumberModal();
      return;
    }

    const token = localStorage.getItem('auth_token');
    const userEmail = localStorage.getItem('user_email');
    
    if (!token || !userEmail) {
      Swal.fire('Error', 'Authentication required. Please login again.', 'error');
      this.router.navigate(['/admin-login']);
      return;
    }

    // Update status optimistically
    const originalStatus = order.status;
    order.status = 'completed';

    // Call API to confirm pickup with OR Number
    this.productService.confirmOrderPickup(order.id, order.customer, token, this.orNumber).subscribe({
      next: (response) => {
        Swal.fire({
          title: 'Pickup Confirmed!',
          html: `
            <p>The customer pickup has been confirmed.</p>
            <p><strong>OR Number:</strong> ${this.orNumber}</p>
            <p>The order is now completed.</p>
          `,
          icon: 'success',
          timer: 3001,
          showConfirmButton: false
        });
        // Close modals and refresh orders
        this.closeOrNumberModal();
        this.closeOrderModal();
        this.fetchOrders();
      },
      error: (error) => {
        console.error('Error confirming pickup:', error);
        // Revert status on error
        order.status = originalStatus;
        
        let errorMessage = 'Failed to confirm pickup. Please try again.';
        if (error.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          this.router.navigate(['/admin-login']);
        } else if (error.status === 404) {
          errorMessage = 'Order not found or already completed.';
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  logout() {
    localStorage.removeItem('user_email');
    window.location.href = '/admin-login';
  }
}
