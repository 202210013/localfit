// import { Injectable } from '@angular/core';
// import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { catchError, tap } from 'rxjs/operators';
// import { Product } from '../models/product.model';
// import { Cart } from '../models/cart.models';
// import { AuthService } from './auth.service';
// import { Router } from '@angular/router';

// @Injectable({
//     providedIn: 'root'
// })
// export class ProductService {
//     updateCartQuantity(cartId: number, quantity: number) {
//         throw new Error('Method not implemented.');
//     }
//     // for localhost
//     // private apiUrl = 'http://localhost/E-comms/ecomm/e-comm/ecomm_api/Router.php?request=';
//     // baseUrl = 'http://localhost/E-comms/ecomm/e-comm/ecomm_api/Router.php?request=';

//     // for hostinger
//     baseUrl = 'https://api.localfit.store/ecomm_api/Router.php?request=';
//     private apiUrl = 'https://api.localfit.store/ecomm_api/Router.php?request=';

//     constructor(private http: HttpClient, private authService: AuthService, private router: Router) { }

//     private getHeaders(): HttpHeaders {
//         const token = this.authService.getToken();
//         return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
//     }

//     getProducts(): Observable<any> {
//         console.log('Fetching products from server');
//         return this.http.get(`${this.apiUrl}products`, { headers: this.getHeaders(), withCredentials: true }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Products fetched:', response))
//         );
//     }

//     getAllProducts(): Observable<any> {
//         console.log('Fetching products from server');
//         return this.http.get(`${this.apiUrl}product-listing`, { headers: this.getHeaders(), withCredentials: true }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Products fetched:', response))
//         );
//     }

//     getAllProducts1(): Observable<any> {
//         console.log('Fetching products from server');
//         return this.http.get(`${this.apiUrl}product-listing-offline`).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Products fetched:', response))
//         );
//     }

//     createProduct(product: any): Observable<any> {
//         const formData = new FormData();
//         formData.append('name', product.get('name'));
//         formData.append('price', product.get('price'));
//         formData.append('description', product.get('description'));
//         formData.append('image', product.get('image'));
//         formData.append('category', product.get('category'));


//         return this.http.post(`${this.apiUrl}products-create`, formData, {
//             headers: this.getHeaders(), withCredentials: true,
//             reportProgress: true,
//             observe: 'events'
//         }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Product created:', response))
//         );
//     }

//     readOneProduct(productId: number): Observable<any> {
//         console.log('Fetching product with ID:', productId);
//         return this.http.get(`${this.apiUrl}products-read?productId=${productId}`, { headers: this.getHeaders(), withCredentials: true }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Product fetched:', response))
//         );
//     }

//     updateProduct(productId: number, formData: FormData): Observable<any> {
//         console.log(`Updating product: ${productId}`);
//         return this.http.post(`${this.apiUrl}products-update/${productId}`, formData, {
//             headers: this.getHeaders(), withCredentials: true,
//             reportProgress: true,
//             observe: 'events'
//         }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Product updated:', response))
//         );
//     }

//     deleteProduct(productId: number): Observable<any> {
//         console.log(`Deleting product with ID: ${productId}`);
//         return this.http.delete(`${this.apiUrl}products-delete/${productId}`, { headers: this.getHeaders(), withCredentials: true }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Product deleted:', response))
//         );
//     }


//     getCarts(): Observable<any> {
//         console.log('Fetching carts from server');
//         return this.http.get(`${this.apiUrl}carts`, { headers: this.getHeaders(), withCredentials: true }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Carts fetched:', response))
//         );
//     }

//     createCart(productId: number, quantity: number): Observable<any> {
//         const data = { product_id: productId, quantity: quantity };
//         return this.http.post(`${this.apiUrl}carts-create`, data, {
//             headers: this.getHeaders(), withCredentials: true,
//             reportProgress: true,
//             observe: 'events'
//         }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Cart created:', response))
//         );
//     }

//     updateCart(cartId: number, cart: Cart): Observable<any> {
//         console.log(`Updating cart: ${cartId}`);
//         return this.http.post(`${this.apiUrl}carts-update/${cartId}`, cart, {
//             headers: this.getHeaders(), withCredentials: true,
//             reportProgress: true,
//             observe: 'events'
//         }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Cart updated:', response))
//         );
//     }

//     deleteCart(cartId: number): Observable<any> {
//         console.log(`Deleting cart with ID: ${cartId}`);    
//         return this.http.delete(`${this.apiUrl}carts-delete/${cartId}`, { headers: this.getHeaders(), withCredentials: true }).pipe(
//             catchError(this.handleError),
//             tap(response => console.log('Cart deleted:', response))
//         );
//     }

//     getUnreadMessages() {
//   return this.http.post(`${this.baseUrl}messages-unread`, {}, {
//     headers: this.getHeaders(),
//     withCredentials: true
//   });
// }

//     getUserPostedProducts(): Observable<any> {
//         return this.http.get(`${this.apiUrl}products/user-posted`, {
//             headers: this.getHeaders(),
//             withCredentials: true
//         });
//     }

//     getOrders() {
//   return this.http.get('https://api.localfit.store/ecomm_api/Router.php?request=orders');
// }   
//     createOrders(orders: any[]) {
//     return this.http.post('https://api.localfit.store/ecomm_api/Router.php?request=orders', orders);
//     }

// private handleError(error: HttpErrorResponse) {
//     let errorMessage = 'Unknown error!';
//     // Fix: Check if ErrorEvent is defined
//     if (typeof ErrorEvent !== 'undefined' && error.error instanceof ErrorEvent) {
//         errorMessage = `Error: ${error.error.message}`;
//     } else {
//         errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
//     }
//     console.error(errorMessage);
//     return throwError(errorMessage);
// }
// }



import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Cart } from '../models/cart.models';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    // Use only one base URL
    // private apiUrl = 'https://api.localfit.store/ecomm_api/Router.php?request=';
    // private apiUrl = 'http://localhost/E-comms/ecomm/e-comm/ecomm_api/Router.php?request=';
    private apiUrl = 'http://localhost:3001/';

    constructor(private http: HttpClient, private authService: AuthService, private router: Router) { }

    private getHeaders(): HttpHeaders {
  const token = localStorage.getItem('token');
  return new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    'Accept': 'application/json'
  });
}

    // private getHeaders(): HttpHeaders {
    // return new HttpHeaders({ 'Content-Type': 'application/json' });
    // }

getProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}api/products`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Products fetched:', response))
    );
}

getAllProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}api/product-listing`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('All products fetched:', response))
    );
}

getAllProducts1(): Observable<any> {
    return this.http.get(`${this.apiUrl}api/product-listing-offline`).pipe(
        catchError(this.handleError),
        tap(response => console.log('Offline products fetched:', response))
    );
}

createProduct(product: any): Observable<any> {
    const formData = new FormData();
    formData.append('name', product.get('name'));
    formData.append('price', product.get('price'));
    formData.append('description', product.get('description'));
    formData.append('image', product.get('image'));
    formData.append('category', product.get('category'));
    
    // Add available_sizes if provided
    if (product.get('available_sizes')) {
        formData.append('available_sizes', JSON.stringify(product.get('available_sizes')));
    }

    // Create headers without Content-Type for FormData (browser sets it automatically)
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept': 'application/json'
    });

    return this.http.post(`${this.apiUrl}api/products-create`, formData, {
        headers: headers, withCredentials: true,
        reportProgress: true,
        observe: 'events'
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Product created:', response))
    );
}

readOneProduct(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}api/products-read?id=${productId}`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Product fetched:', response))
    );
}

updateProduct(productId: number, formData: FormData): Observable<any> {
    // Create headers without Content-Type for FormData (browser sets it automatically)
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
        'Authorization': token ? `Bearer ${token}` : '',
        'Accept': 'application/json'
    });

    return this.http.post(`${this.apiUrl}api/products-update/${productId}`, formData, {
        headers: headers, withCredentials: true,
        reportProgress: true,
        observe: 'events'
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Product updated:', response))
    );
}

deleteProduct(productId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}api/products-delete/${productId}`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Product deleted:', response))
    );
}

getCarts(): Observable<any> {
    return this.http.get(`${this.apiUrl}api/carts`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Carts fetched:', response))
    );
}

createCart(productId: number, quantity: number, size: string = 'M', pickupDate?: string): Observable<any> {
    const data: any = { product_id: productId, quantity: quantity, size: size };
    
    // Add pickup date if provided
    if (pickupDate) {
        data.pickup_date = pickupDate;
    }
    
    return this.http.post(`${this.apiUrl}api/carts-create`, data, {
        headers: this.getHeaders(), withCredentials: true,
        reportProgress: true,
        observe: 'events'
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Cart created:', response))
    );
}

updateCart(cartId: number, cart: Cart): Observable<any> {
    // Include the cart ID in the request body as the server expects
    const cartData = { ...cart, id: cartId };
    return this.http.post(`${this.apiUrl}api/carts-update`, cartData, {
        headers: this.getHeaders(), withCredentials: true,
        reportProgress: true,
        observe: 'events'
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Cart updated:', response))
    );
}

deleteCart(cartId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}api/carts-delete/${cartId}`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Cart deleted:', response))
    );
}

getUnreadMessages(): Observable<any> {
    return this.http.post(`${this.apiUrl}api/messages-unread`, {}, {
        headers: this.getHeaders(),
        withCredentials: true
    });
}

getUserPostedProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}api/products`, {
        headers: this.getHeaders(),
        withCredentials: true
    });
}

getOrders(): Observable<any> {
    return this.http.get(`${this.apiUrl}api/orders`, {
        headers: this.getHeaders(),
        withCredentials: true
    });
}

createOrders(orders: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}api/orders`, orders, {
        headers: this.getHeaders(),
        withCredentials: true
    });
}

// Get orders for the current user (as seller)
getMyOrders(): Observable<any> {
  const userEmail = localStorage.getItem('user_email');
  return this.http.get(`${this.apiUrl}api/orders?user=${userEmail}`, {
    headers: this.getHeaders(),
    withCredentials: true
  });
}

// Get orders made by the current user (as buyer)
getMyPurchases(): Observable<any> {
  const userEmail = localStorage.getItem('user_email');
  return this.http.get(`${this.apiUrl}api/orders?user=${userEmail}`, {
    headers: this.getHeaders(),
    withCredentials: true
  });
}

// Update order status (approve/decline)
updateOrderStatus(orderId: number, status: string): Observable<any> {
  return this.http.put(`${this.apiUrl}/orders/${orderId}/status`, 
    { status }, 
    { headers: this.getHeaders() }
  );
}

// Create order (when user places an order)
createOrder(productId: number, quantity: number, size: string = 'M'): Observable<any> {
  return this.http.post(`${this.apiUrl}/orders`, 
    { product_id: productId, quantity, size }, 
    { headers: this.getHeaders() }
  );
}

// Confirm order pickup by customer
confirmOrderPickup(orderId: number, userEmail: string, token: string, orNumber?: string): Observable<any> {
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  return this.http.post(
    `${this.apiUrl}api/orders`,
    {
      action: 'confirm-pickup',
      orderId: orderId,
      customerEmail: userEmail,
      orNumber: orNumber || null
    },
    { headers: headers, withCredentials: true }
  );
}

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Unknown error!';
        if (typeof ErrorEvent !== 'undefined' && error.error instanceof ErrorEvent) {
            errorMessage = `Error: ${error.error.message}`;
        } else {
            errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
        }
        console.error(errorMessage);
        return throwError(errorMessage);
    }
}