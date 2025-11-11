import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService } from '../services/e-comm.service';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';

// Update the Order interface to match your API response
interface Order {
  id: number;
  customer: string; // This is the buyer's email
  product: string;  // This is the product name
  quantity: number;
  status: 'pending' | 'approved' | 'declined' | 'ready-for-pickup' | 'completed';
  // Add optional fields that might be in the response
  price?: number;
  total_price?: number;
  order_date?: string;
  created_at?: string;
  updated_at?: string;
  product_image?: string;
  remarks?: string; // Add remarks for declined orders
  // Add calculated price
  calculatedPrice?: number;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit, OnDestroy {
  myOrders: Order[] = []; // Orders received (as seller)
  myPurchases: Order[] = []; // Orders made (as buyer)
  allOrders: Order[] = []; // Store all orders before filtering
  activeTab: 'pending' | 'ready-for-pickup' | 'declined' | 'completed' = 'pending';
  baseUrl: string = 'http://localhost:3001/e-comm-images/';
  loading = false;
  
  // Add sorting properties
  sortBy: 'latest' | 'oldest' | 'status' = 'latest';
  sortOptions = [
    { value: 'latest', label: 'Latest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'status', label: 'By Status' }
  ];

  // Filtered orders by status
  pendingOrders: Order[] = [];
  readyForPickupOrders: Order[] = [];
  declinedOrders: Order[] = [];
  completedOrders: Order[] = [];

  constructor(
    private productService: ProductService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {}

  loadOrders(): void {
    this.loading = true;
    
    // Get current user's email from localStorage
    const currentUserEmail = localStorage.getItem('user_email');
    
    let ordersLoaded = false;
    let purchasesLoaded = false;
    
    // Function to check if both API calls are complete and then filter
    const checkAndFilter = () => {
      if (ordersLoaded && purchasesLoaded) {
        this.filterOrdersByStatus();
        this.loading = false;
      }
    };
    
    // Load orders received (as seller)
    this.productService.getMyOrders().subscribe({
      next: (response: any) => {
        console.log('Orders response:', response);
        this.allOrders = Array.isArray(response) ? response : (response.records || []);
        
        // Get all orders for the current user (remove status filtering)
        this.myOrders = this.allOrders.filter(order => 
          currentUserEmail && 
          order.customer === currentUserEmail
        );
        
        this.enrichOrdersWithPrices(this.myOrders);
        ordersLoaded = true;
        checkAndFilter();
      },
      error: (error: any) => {
        console.error('Error loading orders:', error);
        this.myOrders = [];
        this.allOrders = [];
        ordersLoaded = true;
        checkAndFilter();
      }
    });

    // Load orders made (as buyer)
    this.productService.getMyPurchases().subscribe({
      next: (response: any) => {
        console.log('Purchases response:', response);
        const allPurchases = Array.isArray(response) ? response : (response.records || []);
        
        // Filter to show only purchases for the current user
        this.myPurchases = allPurchases.filter((purchase: Order) => 
          currentUserEmail && 
          purchase.customer === currentUserEmail
        );
        
        this.enrichOrdersWithPrices(this.myPurchases);
        purchasesLoaded = true;
        checkAndFilter();
      },
      error: (error: any) => {
        console.error('Error loading purchases:', error);
        this.myPurchases = [];
        purchasesLoaded = true;
        checkAndFilter();
      }
    });
  }

  // Add sorting method
  sortOrders(): void {
    const sortFn = this.getSortFunction();
    this.myOrders.sort(sortFn);
    this.myPurchases.sort(sortFn);
    
    // Also sort the filtered arrays
    this.pendingOrders.sort(sortFn);
    this.readyForPickupOrders.sort(sortFn);
    this.declinedOrders.sort(sortFn);
    this.completedOrders.sort(sortFn);
  }

  // Get sort function based on selected sort option
  private getSortFunction(): (a: Order, b: Order) => number {
    switch (this.sortBy) {
      case 'latest':
        return (a, b) => {
          const dateA = new Date(a.created_at || a.order_date || a.id).getTime();
          const dateB = new Date(b.created_at || b.order_date || b.id).getTime();
          return dateB - dateA; // Latest first
        };
      
      case 'oldest':
        return (a, b) => {
          const dateA = new Date(a.created_at || a.order_date || a.id).getTime();
          const dateB = new Date(b.created_at || b.order_date || b.id).getTime();
          return dateA - dateB; // Oldest first
        };
      
      case 'status':
        return (a, b) => {
          const statusOrder = { 'pending': 0, 'approved': 1, 'ready-for-pickup': 2, 'completed': 3, 'declined': 4 };
          const statusA = statusOrder[a.status] || 5;
          const statusB = statusOrder[b.status] || 5;
          return statusA - statusB;
        };
      
      default:
        return (a, b) => b.id - a.id; // Default to ID descending
    }
  }

  // Handle sort change - update this method
  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy = target.value as 'latest' | 'oldest' | 'status';
    this.sortOrders();
  }

  // Method to enrich orders with price information
  private enrichOrdersWithPrices(orders: Order[]): void {
    // Load all products to get price information
    this.productService.getAllProducts().subscribe({
      next: (productsResponse: any) => {
        const products = Array.isArray(productsResponse) ? productsResponse : (productsResponse.records || []);
        
        // Match orders with products to get prices
        orders.forEach(order => {
          const matchingProduct = products.find((product: any) => 
            product.name === order.product || 
            product.title === order.product ||
            product.product_name === order.product
          );
          
          if (matchingProduct) {
            order.calculatedPrice = matchingProduct.price * order.quantity;
            order.product_image = matchingProduct.image;
          } else {
            // Fallback: assign a default price or keep as undefined
            order.calculatedPrice = 0;
          }
        });
      },
      error: (error: any) => {
        console.error('Error loading products for price calculation:', error);
      }
    });
  }

  switchTab(tab: 'pending' | 'ready-for-pickup' | 'declined' | 'completed'): void {
    this.activeTab = tab;
  }

  // Filter orders by status
  filterOrdersByStatus(): void {
    // Combine orders and purchases, removing duplicates by ID
    const combinedOrders = [...this.myOrders, ...this.myPurchases];
    const uniqueOrders = combinedOrders.filter((order, index, self) => 
      index === self.findIndex(o => o.id === order.id)
    );
    
    this.pendingOrders = uniqueOrders.filter(order => order.status === 'pending');
    this.readyForPickupOrders = uniqueOrders.filter(order => order.status === 'ready-for-pickup');
    this.declinedOrders = uniqueOrders.filter(order => order.status === 'declined');
    this.completedOrders = uniqueOrders.filter(order => order.status === 'completed');
    
    // Sort after filtering
    this.sortOrders();
  }

  // Get current active orders based on selected tab
  getCurrentOrders(): Order[] {
    switch(this.activeTab) {
      case 'pending':
        return this.pendingOrders;
      case 'ready-for-pickup':
        return this.readyForPickupOrders;
      case 'declined':
        return this.declinedOrders;
      case 'completed':
        return this.completedOrders;
      default:
        return [];
    }
  }

  // Get empty state message based on active tab
  getEmptyStateMessage(): string {
    switch(this.activeTab) {
      case 'pending':
        return 'Orders awaiting approval will appear here.';
      case 'ready-for-pickup':
        return 'Orders ready for pickup will appear here.';
      case 'declined':
        return 'Declined orders will appear here.';
      case 'completed':
        return 'Completed orders will appear here.';
      default:
        return 'No orders found.';
    }
  }

  approveOrder(orderId: number): void {
    Swal.fire({
      title: 'Approve Order?',
      text: 'Are you sure you want to approve this order?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, approve it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.updateOrderStatus(orderId, 'approved');
      }
    });
  }

  declineOrder(orderId: number): void {
    Swal.fire({
      title: 'Decline Order?',
      text: 'Are you sure you want to decline this order?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, decline it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.updateOrderStatus(orderId, 'declined');
      }
    });
  }

  private updateOrderStatus(orderId: number, status: string): void {
    this.productService.updateOrderStatus(orderId, status).subscribe({
      next: (response: any) => {
        Swal.fire({
          icon: 'success',
          title: `Order ${status}!`,
          text: `The order has been ${status} successfully.`,
          timer: 1500,
          showConfirmButton: false
        });
        this.loadOrders(); // Reload orders
      },
      error: (error: any) => {
        console.error('Error updating order status:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to update order status. Please try again.',
        });
      }
    });
  }

  getImageUrl(image: string): string {
    if (!image) return 'assets/placeholder-image.jpg'; // Fallback image
    
    // Extract filename from any path format
    const filename = image.split('/').pop()?.split('\\').pop() || image;
    
    // Construct URL with base URL + filename
    return this.baseUrl + filename.trim();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'ready-for-pickup': return 'status-ready-pickup';
      case 'completed': return 'status-completed';
      case 'declined': return 'status-declined';
      default: return 'status-pending';
    }
  }

  goBack(): void {
    this.router.navigate(['/product-listing']);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  // Helper methods to get the right property names
  getBuyerName(order: Order): string {
    return order.customer || 'Unknown Customer';
  }

  getProductName(order: Order): string {
    return order.product || 'Unknown Product';
  }

  getTotalPrice(order: Order): number {
    // Use calculated price, fallback to original price fields, then to 0
    return order.calculatedPrice || order.total_price || order.price || 0;
  }

  // Add method to check if price is available
  hasPriceInfo(order: Order): boolean {
    return !!(order.calculatedPrice || order.total_price || order.price);
  }

  // Add method to get total completed orders count for display
  getCompletedOrdersCount(): number {
    return this.allOrders.filter(order => order.status === 'completed').length;
  }

  // Method to confirm order pickup by customer
  confirmPickup(order: Order): void {
    // Show confirmation dialog
    Swal.fire({
      title: 'Confirm Pickup',
      text: `Are you sure you have picked up "${order.product}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Yes, I picked it up',
      cancelButtonText: 'Not yet'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processPickupConfirmation(order);
      }
    });
  }

  private processPickupConfirmation(order: Order): void {
    const token = localStorage.getItem('auth_token');
    const userEmail = localStorage.getItem('user_email');
    
    if (!token || !userEmail) {
      Swal.fire('Error', 'Authentication required. Please login again.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    // Update status optimistically
    const originalStatus = order.status;
    order.status = 'completed';

    // Call API to confirm pickup
    this.productService.confirmOrderPickup(order.id, userEmail, token).subscribe({
      next: (response) => {
        Swal.fire({
          title: 'Pickup Confirmed!',
          text: 'Thank you for confirming your pickup. The order is now completed.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        // Refresh orders to get updated data
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error confirming pickup:', error);
        // Revert status on error
        order.status = originalStatus;
        
        let errorMessage = 'Failed to confirm pickup. Please try again.';
        if (error.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          this.router.navigate(['/login']);
        } else if (error.status === 404) {
          errorMessage = 'Order not found or already completed.';
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }
}
