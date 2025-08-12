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
  selector: 'app-product-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-listing.component.html',
  styleUrls: ['./product-listing.component.css'],
})
export class AllProductsComponent implements OnInit {
  products: Product[] | undefined;
  allProducts: Product[] | undefined;
  productForm: FormGroup = new FormGroup({});
  baseUrl: string = 'http://localhost/E-comms/ecomm/e-comm/e-comm-images/';
  updateMode = false;
  updateForm: FormGroup = new FormGroup({});
  selectedProductId: number | null = null;
  carts: Cart[] | undefined;

  imageUrl = '';
  imageAlt = '';
  isModalOpen = false;
  selectedProduct: Product | undefined;

  categories = [
  
  ];
  filteredProducts: Product[] | undefined;
  selectedCategory: string | null = null;

  searchTerm: string = ''; // <-- Add this

  unreadMessages: number = 0; // Add this property

  userPostedProducts: Product[] = []; // Add this property to store products posted by the user

  largeAdImages: string[] = [
    'https://i.ibb.co/fGG71QSq/476456511-640897084960800-2564012019781491129-n.jpg',
    'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&q=80',
    'https://i.ibb.co/xKG3dNLg/abhay-siby-mathew-Lm-Eu-UMbd5-Rw-unsplash.jpg',
  ];
  currentAdIndex: number = 0;
  adInterval: any;

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
    this.getUnreadMessages();
    this.getUserPostedProducts(); // Fetch products posted by the current user
    this.selectedCategory = 'all';
    this.startAdSlideshow();
  }
  getMessage() {
    throw new Error('Method not implemented.');
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
      this.authService.logout().subscribe(() => {
        // Ensure all relevant localStorage is cleared
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('user_email');
        // Optionally: localStorage.clear();

        Swal.fire({
          icon: 'success',
          title: 'Logged out!',
          showConfirmButton: false,
          timer: 1200
        });
        this.router.navigate(['/']);  // Redirect to landing page
      });
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

  filterByCategory(category: string) {
    this.selectedCategory = category;
    if (category === 'all' && this.allProducts) {
      this.filteredProducts = this.allProducts;
    } else if (this.allProducts) {
      this.filteredProducts = this.allProducts.filter(product => product.category === category);
    }
  }

  getAllProducts(): void {
  this.productService.getAllProducts().subscribe((response: any) => {
    console.log('API products:', response.records); // <-- Add this line
    this.allProducts = response.records;
    this.filteredProducts = this.allProducts;
  });
}

  getCarts(): void {
    this.productService.getCarts().subscribe((response: any) => {
      this.carts = response.records;
    });
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

  sizes: string[] = ['S', 'M', 'L', 'XL']; // Add your available sizes here
  selectedSize: string = 'M'; // Default size

  addProductToCart(productId: number, quantity: number, size: string = 'M'): void {
    // Remove size check if Cart does not support size
    const existingCartItem = this.carts?.find(cart => cart.product_id === productId);

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      this.updateCart(existingCartItem);
      Swal.fire({
        icon: 'success',
        title: 'Cart Updated!',
        text: 'Product quantity updated in your cart.',
        timer: 1200,
        showConfirmButton: false
      });
    } else {
      // Only pass productId and quantity if your service does not support size
      this.productService.createCart(productId, quantity).subscribe((response: any) => {
        this.getCarts();
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: 'Product successfully added to your cart.',
          timer: 1200,
          showConfirmButton: false
        });
      });
    }
}


  updateCart(cart: Cart): void {
    this.productService.updateCart(cart.id, cart).subscribe((response: any) => {
      console.log('Cart updated:', response);
      this.getCarts();
    });
  }

  deleteCart(cartId: number): void {
    this.productService.deleteCart(cartId).subscribe((response: any) => {
      console.log('Cart deleted:', response);
      this.getCarts();
    });
  }

  calculateTotal(): number {
    return this.carts?.reduce((total, cart) => total + cart.price * cart.quantity, 0) ?? 0;
  }

  onSearch() {
    const term = this.searchTerm.trim().toLowerCase();
    if (term === '') {
      this.filteredProducts = this.allProducts;
    } else {
      this.filteredProducts = this.allProducts?.filter(product =>
        product.name.toLowerCase().includes(term)
      );
    }
  }

  // Add a method to fetch unread messages
  getUnreadMessages(): void {
    this.productService.getUnreadMessages().subscribe({
      next: (response: any) => {
        console.log('Unread messages API response:', response);
        // Adjust this line based on your actual API response structure:
        this.unreadMessages = response.count || 0;
      },
      error: (error: any) => {
        console.error('Error fetching unread messages:', error);
        this.unreadMessages = 0;
      }
    });
  }

  // Add a method to fetch products posted by the current user
  getUserPostedProducts(): void {
    this.productService.getUserPostedProducts().subscribe((response: any) => {
        this.userPostedProducts = response.records || []; // Assuming the API returns only the user's products
    });
}

getProductAuthor(product: any): string {
  return product.seller_name || product.user_name || 'No Name';
}

startAdSlideshow() {
  this.adInterval = setInterval(() => {
    this.currentAdIndex = (this.currentAdIndex + 1) % this.largeAdImages.length;
  }, 3000); // Change image every 3 seconds
}

ngOnDestroy(): void {
  if (this.adInterval) {
    clearInterval(this.adInterval);
  }
}



}