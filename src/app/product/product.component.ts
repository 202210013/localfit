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
    selector: 'app-product',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './product.component.html',
    styleUrls: ['./product.component.css'],
})
export class ProductComponent implements OnInit {
    products: Product[] | undefined;
    allProducts: Product[] | undefined;
    productForm: FormGroup = new FormGroup({});
    baseUrl: string = 'http://localhost/localfit/e-comm-images/';
    updateMode = false;
    updateForm: FormGroup = new FormGroup({});
    selectedProductId: number | null = null;
    carts: Cart[] | undefined;

    imageUrl = '';
    imageAlt = '';
    fileName = '';
    isModalOpen = false;
    selectedProduct: Product | undefined;
    previewUrl: string | undefined;

    // Add categories
    categories = [
        "Electronics",
        "Fashion",
        "Home and Kitchen",
        "Beauty and Personal Care",
        "Health and Household",
        "Sports and Outdoors",
        "Baby Products",
        "Pet Products",
    ];

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
        this.resetForms();
    }

    resetForms() {
        this.productForm.patchValue({
            name: '',
            price: '',
            description: '',
            image: '',
            category: this.categories[9]
        });
        this.fileName = '';
        this.previewUrl = undefined;
    }

    constructor(private productService: ProductService, public authService: AuthService, private router: Router) { }

    ngOnInit(): void {
        this.productForm = new FormGroup({
            name: new FormControl(''),
            price: new FormControl(''),
            description: new FormControl(''),
            image: new FormControl(''),
            category: new FormControl(this.categories[9]) // Default to "Other"
        });

        this.updateForm = new FormGroup({
            name: new FormControl(''),
            price: new FormControl(''),
            description: new FormControl(''),
            image: new FormControl(''),
            category: new FormControl(this.categories[9]) // Default to "Other"
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

    getImageUrl(imagePath: string): string {
        // Ensure the image path is returned as is
        return imagePath;
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
        });
    }

    onFileChange(event: any): void {
        if (event.target.files.length > 0) {
            const file = event.target.files[0];
            this.productForm.patchValue({
                image: file
            });
            this.fileName = file.name;
            this.previewUrl = undefined;

            // Read the file as a URL
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.previewUrl = e.target.result;
            };
            reader.readAsDataURL(file);

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
            formData.append('category', this.productForm.value.category);

            this.productService.createProduct(formData).subscribe(
                (response: any) => {
                    console.log('Product created:', response);
                    this.getProducts();
                    this.getAllProducts();
                    this.resetForms();
                    // SweetAlert on success
                    Swal.fire({
                        icon: 'success',
                        title: 'Product Uploaded!',
                        text: 'Your product has been successfully uploaded.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                },
                (error: any) => {
                    console.error('Error creating product:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Upload Failed',
                        text: 'There was a problem uploading your product.',
                        timer: 1800,
                        showConfirmButton: false
                    });
                }
            );
        } else {
            console.error('Form is invalid');
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Form',
                text: 'Please fill out all required fields.',
                timer: 1800,
                showConfirmButton: false
            });
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
            formData.append('category', this.updateForm.value.category);
            if (this.updateForm.value.image) {
                formData.append('image', this.updateForm.value.image);
            }

            this.productService.updateProduct(this.selectedProductId, formData).subscribe(
                (response: any) => {
                    console.log('Product updated:', response);
                    this.getProducts();
                    this.getCarts();
                    this.getAllProducts();
                    this.resetForms();
                    this.updateMode = false;
                    this.selectedProductId = null;
                    // SweetAlert on success
                    Swal.fire({
                        icon: 'success',
                        title: 'Product Updated!',
                        text: 'Your product has been successfully updated.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                },
                (error: any) => {
                    console.error('Error updating product:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: 'There was a problem updating your product.',
                        timer: 1800,
                        showConfirmButton: false
                    });
                }
            );
        } else {
            console.error('Form is invalid or no product selected');
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Form',
                text: 'Please fill out all required fields.',
                timer: 1800,
                showConfirmButton: false
            });
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
                image: null,
                category: product.category,
            });
        }
    }

    deleteProduct(productId: number): void {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This product will be permanently deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#cc0000',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.productService.deleteProduct(productId).subscribe(
                    (response: any) => {
                        console.log('Product deleted:', response);
                        this.getProducts();
                        this.getCarts();
                        this.getAllProducts();
                        this.resetForms();
                        this.selectedProduct = undefined; // Reset selectedProduct
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Product has been removed.',
                            timer: 1200,
                            showConfirmButton: false
                        });
                    },
                    (error: any) => {
                        console.error('Error deleting product:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete Failed',
                            text: 'There was a problem deleting the product.',
                            timer: 1500,
                            showConfirmButton: false
                        });
                    }
                );
            }
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

    deleteCart(cartId: number): void {
        this.productService.deleteCart(cartId).subscribe((response: any) => {
            console.log('Cart deleted:', response);
            this.getCarts();
        });
    }

    calculateTotal(): number {
        return this.carts?.reduce((total, cart) => total + cart.price * cart.quantity, 0) ?? 0;
    }
}