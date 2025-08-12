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
    private apiUrl = 'http://localhost/E-comms/ecomm/e-comm/ecomm_api/Router.php?request=';

    constructor(private http: HttpClient, private authService: AuthService, private router: Router) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    // private getHeaders(): HttpHeaders {
    // return new HttpHeaders({ 'Content-Type': 'application/json' });
    // }

getProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}products`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Products fetched:', response))
    );
}

getAllProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}product-listing`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Products fetched:', response))
    );
}

getAllProducts1(): Observable<any> {
    return this.http.get(`${this.apiUrl}product-listing-offline`).pipe(
        catchError(this.handleError),
        tap(response => console.log('Products fetched:', response))
    );
}

createProduct(product: any): Observable<any> {
    const formData = new FormData();
    formData.append('name', product.get('name'));
    formData.append('price', product.get('price'));
    formData.append('description', product.get('description'));
    formData.append('image', product.get('image'));
    formData.append('category', product.get('category'));

    return this.http.post(`${this.apiUrl}products-create`, formData, {
        headers: this.getHeaders(), withCredentials: true,
        reportProgress: true,
        observe: 'events'
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Product created:', response))
    );
}

readOneProduct(productId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}products-read?productId=${productId}`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Product fetched:', response))
    );
}

updateProduct(productId: number, formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}products-update/${productId}`, formData, {
        headers: this.getHeaders(), withCredentials: true,
        reportProgress: true,
        observe: 'events'
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Product updated:', response))
    );
}

deleteProduct(productId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}products-delete/${productId}`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Product deleted:', response))
    );
}

getCarts(): Observable<any> {
    return this.http.get(`${this.apiUrl}carts`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Carts fetched:', response))
    );
}

createCart(productId: number, quantity: number): Observable<any> {
    const data = { product_id: productId, quantity: quantity };
    return this.http.post(`${this.apiUrl}carts-create`, data, {
        headers: this.getHeaders(), withCredentials: true,
        reportProgress: true,
        observe: 'events'
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Cart created:', response))
    );
}

updateCart(cartId: number, cart: Cart): Observable<any> {
    return this.http.post(`${this.apiUrl}carts-update/${cartId}`, cart, {
        headers: this.getHeaders(), withCredentials: true,
        reportProgress: true,
        observe: 'events'
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Cart updated:', response))
    );
}

deleteCart(cartId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}carts-delete/${cartId}`, {
        headers: this.getHeaders(), withCredentials: true
    }).pipe(
        catchError(this.handleError),
        tap(response => console.log('Cart deleted:', response))
    );
}

getUnreadMessages(): Observable<any> {
    return this.http.post(`${this.apiUrl}messages-unread`, {}, {
        headers: this.getHeaders(),
        withCredentials: true
    });
}

getUserPostedProducts(): Observable<any> {
    return this.http.get(`${this.apiUrl}products/user-posted`, {
        headers: this.getHeaders(),
        withCredentials: true
    });
}

getOrders(): Observable<any> {
    return this.http.get(`${this.apiUrl}orders`);
}

createOrders(orders: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}orders`, orders);
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