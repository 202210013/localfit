import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; 
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

interface Order {
  id: number;
  customer: string;
  product: string;
  quantity: number;
   status: 'pending' | 'approved' | 'declined';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule], // <-- Add CommonModule here
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  orders: Order[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchOrders();
  }

  fetchOrders() {
  const userEmail = localStorage.getItem('user_email');
  this.http.get<Order[]>(
    `https://api.localfit.store/ecomm_api/Router.php?request=orders&user=${encodeURIComponent(userEmail ?? '')}`,
    { withCredentials: true }
  ).subscribe({
    next: (orders) => this.orders = orders,
    error: (err) => {
      alert('Failed to fetch orders');
      console.error(err);
    }
  });
}

  approveOrder(order: Order) {
    order.status = 'approved';
    this.http.post(
      'https://api.localfit.store/ecomm_api/Router.php?request=orders',
      { action: 'approve', orderId: order.id },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.fetchOrders(); // Refresh the orders list after approval
      },
      error: (err) => {
        order.status = 'pending';
        alert('Failed to approve order');
      }
    });
  }

  declineOrder(order: Order) {
    order.status = 'declined';
    this.http.post(
      'https://api.localfit.store/ecomm_api/Router.php?request=orders',
      { action: 'decline', orderId: order.id },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.fetchOrders(); // Refresh the orders list after decline
      },
      error: (err) => {
        order.status = 'pending';
        alert('Failed to decline order');
      }
    });
  }

  exportToExcel(): void {
    // Prepare data for export (remove Angular-specific fields if needed)
    const exportData = this.orders.map(order => ({
      'Order #': order.id,
      'Customer': order.customer,
      'Product': order.product,
      'Quantity': order.quantity,
      'Status': order.status
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    const workbook: XLSX.WorkBook = { Sheets: { 'Orders': worksheet }, SheetNames: ['Orders'] };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(data, 'orders.xlsx');
  }

  logout() {
    localStorage.removeItem('user_email');
    // Optionally clear other auth tokens here
    window.location.href = '/admin-login'; // Redirect to your login page
  }
}
