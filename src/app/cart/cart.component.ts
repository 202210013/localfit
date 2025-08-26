import { Component, OnInit } from '@angular/core';
import { Product } from '../models/product.model';
import { FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../services/e-comm.service';
import { CommonModule } from '@angular/common';
import { Cart } from '../models/cart.models';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit {
  products: Product[] | undefined;
  allProducts: Product[] | undefined;
  productForm: FormGroup = new FormGroup({});
  baseUrl: string = 'https://images.localfit.store/';
  

  updateMode = false;
  updateForm: FormGroup = new FormGroup({});
  selectedProductId: number | null = null;
  carts: Cart[] | undefined;
  selectAll: boolean = false;
  selectedCarts: Cart[] = [];

  imageUrl = '';
  imageAlt = '';
  isModalOpen = false;
  selectedProduct: Product | undefined;

  selectedCartId: number | null = null;

  setSelectedCartId(cartId: number): void {
    this.selectedCartId = cartId;
  }



  openModal(product: Product) {
    this.selectedProduct = product;
    this.isModalOpen = true;
  }

  selectProduct(product: Product) {
    this.selectedProduct = product;
  }


  closeModal() {
    this.isModalOpen = false;
    this.selectedProduct = undefined;
  }

  selectAllCarts(event: any): void {
    this.carts?.forEach(cart => cart.selected = event.target.checked);
    this.selectedCarts = this.carts?.filter(cart => cart.selected) ?? [];
    this.calculateTotal();
  }

  updateSelectedCarts(cart: Cart): void {
    this.selectedCarts = this.carts?.filter(c => c.selected) ?? [];
    this.calculateTotal();
  }


  constructor(private productService: ProductService, public authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.productForm = new FormGroup({
      name: new FormControl(''),
      price: new FormControl(''),
      description: new FormControl(''),
      image: new FormControl(''),
    });

    this.updateForm = new FormGroup({
      name: new FormControl(''),
      price: new FormControl(''),
      description: new FormControl(''),
      image: new FormControl(''),
    });

    this.getProducts();
    this.getAllProducts();
    this.getCarts();
  }

  goToMessege() {
    this.router.navigate(['/messages']);
  }
  goToCart() {
    this.router.navigate(['/cart']);
  }

  goToProduct() {
    this.router.navigate(['/product']);
  }

  goToProductListing() {
    this.router.navigate(['/product-listing']);
  }

  logout() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        Swal.fire({
          icon: 'success',
          title: 'Logged out!',
          showConfirmButton: false,
          timer: 1200
        });
        this.router.navigate(['/']);  // Redirect to landing page
      }
    });
  }

  getImageUrl(image: string): string {
    return this.baseUrl + image;
  }

  getProducts(): void {
    this.productService.getProducts().subscribe((response: any) => {
      this.products = response.records;
    });
  }

  getAllProducts(): void {
    this.productService.getAllProducts().subscribe((response: any) => {
      this.allProducts = response.records;
    });
  }

  getCarts(): void {
    this.productService.getCarts().subscribe((response: any) => {
      this.carts = response.records;
      if (this.carts) {
        this.carts.sort((a, b) => b.quantity - a.quantity);
      }
    });
  }

  checkout(): void {
  if (this.carts) {
    this.selectedCarts = this.carts.filter(cart => cart.selected);
    if (this.selectedCarts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No items selected',
        text: 'Please select items to checkout.',
        timer: 1500,
        showConfirmButton: false
      });
      return;
    }

    // Prepare order data
    const orders = this.selectedCarts.map(cart => ({
      customer: localStorage.getItem('user_email') || 'guest',
      product: cart.name,
      quantity: cart.quantity,
      size: cart.size || 'M', // Include size information
      status: 'pending'
    }));

    console.log('=== CHECKOUT DEBUG ===');
    console.log('Selected carts:', this.selectedCarts);
    console.log('Orders being sent:', orders);
    console.log('Cart sizes:', this.selectedCarts.map(cart => ({ name: cart.name, size: cart.size })));

    // Send orders to backend
    this.productService.createOrders(orders).subscribe(
      (response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Order placed!',
          text: 'Awaiting admin approval.',
          timer: 1500,
          showConfirmButton: false
        });
        // Delete checked-out items from cart
        this.selectedCarts.forEach(cart => {
          this.deleteCart(cart.id, true);
        });
        // Optionally refresh cart after deletions
        setTimeout(() => this.getCarts(), 500);
      },
      (error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Failed to place order.',
          text: 'Please try again.',
          timer: 1500,
          showConfirmButton: false
        });
        console.error(error);
      }
    );
  }
}

  onFileChange(event: any): void {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.productForm.patchValue({
        image: file
      });
      if (this.updateMode) {
        this.updateForm.patchValue({
          image: file
        });
      }
    }
  }

  createProduct(): void {
    if (this.productForm.valid) {
      const formData = new FormData();
      formData.append('name', this.productForm.value.name);
      formData.append('price', this.productForm.value.price);
      formData.append('description', this.productForm.value.description);
      formData.append('image', this.productForm.value.image);

      this.productService.createProduct(formData).subscribe((response: any) => {
        console.log('Product created:', response);
        this.getProducts();
        this.getAllProducts();
      }, (error: any) => {
        console.error('Error creating product:', error);
      });
    } else {
      console.error('Form is invalid');
    }
  }

  readOneProduct(productId: number): void {
    this.productService.readOneProduct(productId).subscribe((response: any) => {
      console.log(response);
    });
  }

  updateProduct(): void {
    if (this.updateForm.valid && this.selectedProductId !== null) {
      const formData = new FormData();
      formData.append('name', this.updateForm.value.name);
      formData.append('price', this.updateForm.value.price);
      formData.append('description', this.updateForm.value.description);
      if (this.updateForm.value.image) {
        formData.append('image', this.updateForm.value.image);
      }

      this.productService.updateProduct(this.selectedProductId, formData).subscribe((response: any) => {
        console.log('Product updated:', response);
        this.getProducts();
        this.getCarts();
        this.getAllProducts();
        this.updateMode = false;
        this.selectedProductId = null;
      }, (error: any) => {
        console.error('Error updating product:', error);
      });
    } else {
      console.error('Form is invalid or no product selected');
    }
  }

  toggleUpdateMode(product: Product) {
    this.updateMode = !this.updateMode;
    this.selectedProductId = product.id;
    if (this.updateMode) {
      this.updateForm.patchValue({
        name: product.name,
        price: product.price,
        description: product.description,
        image: null
      });
    }
  }

  deleteProduct(productId: number): void {
    this.productService.deleteProduct(productId).subscribe((response: any) => {
      console.log('Product deleted:', response);
      this.getProducts();
      this.getCarts();
      this.getAllProducts();
    });
  }

  addProductToCart(productId: number, quantity: number): void {
    this.productService.createCart(productId, quantity).subscribe((response: any) => {
      console.log('Cart created:', response);
      this.getCarts();
    });
  }

  updateCart(cart: Cart): void {
    this.productService.updateCart(cart.id, cart).subscribe((response: any) => {
      console.log('Cart updated:', response);
      this.getCarts();
    });
  }

  // deleteCart(cartId: number): void {
  //   this.productService.deleteCart(cartId).subscribe((response: any) => {
  //     console.log('Cart deleted:', response);
  //     thdeleteis.getCarts();
  //   });
  // }

  deleteCart(cartId: number | null, showOrderMsg: boolean = false): void {
    if (cartId !== null) {
      this.productService.deleteCart(cartId).subscribe((response: any) => {
        console.log('Cart deleted:', response);
        this.getCarts();
        if (showOrderMsg) {
          Swal.fire({
            icon: 'success',
            title: 'Placed Order!',
            text: 'Waiting for the seller approve.',
            timer: 1200,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'The item has been removed from your cart.',
            timer: 1200,
            showConfirmButton: false
          });
        }
      });
    }
  }

  confirmDeleteCart(cartId: number) {
  Swal.fire({
    title: 'Are you sure?',
    text: 'Do you want to remove this item from your cart?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it'
  }).then((result) => {
    if (result.isConfirmed) {
      this.deleteCart(cartId); // No order message
    }
  });
}

  calculateTotal(): number {
    return this.carts?.reduce((total, cart) => total + cart.price * cart.quantity, 0) ?? 0;
  }

  calculateSelectedTotal(): number {
    return this.carts?.filter(cart => cart.selected)?.reduce((total, cart) => total + cart.price * cart.quantity, 0) ?? 0;
  }
  sortAscending = true;
  sortAscendingSubTotal = true;

sortCartByQuantity(): void {
    if (this.carts) {
      this.carts.sort((a, b) => this.sortAscending ? a.quantity - b.quantity : b.quantity - a.quantity);
      this.sortAscending = !this.sortAscending;
    }
  }

  sortCartBySubTotal(): void {
    if (this.carts) {
      this.carts.forEach(cart => cart.subTotal = cart.price * cart.quantity);
      this.carts.sort((a, b) => this.sortAscendingSubTotal ? a.subTotal - b.subTotal : b.subTotal - a.subTotal);
      this.sortAscendingSubTotal = !this.sortAscendingSubTotal;
    }
  }
}
