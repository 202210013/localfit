# LocalFit System User Manual

Version: 1.0  
Date: March 31, 2026  
System: LocalFit (Angular + PHP API + Socket.IO)

---

## 1. Introduction

LocalFit is a full e-commerce and order-management platform for sports apparel. The system supports:

- Customer shopping and ordering
- Size-aware inventory and stock tracking
- Pickup-date scheduling
- Order lifecycle management (including production flow)
- Ratings and reviews
- Messaging/chat
- Admin dashboard analytics and reporting

This manual is written for both customer users and admin users, and also includes operational setup and troubleshooting guidance.

---

## 2. System Overview

### 2.1 Main Components

1. Frontend Web App
- Technology: Angular
- Main purpose: Customer and admin user interface

2. Backend API
- Technology: PHP (Router + service classes)
- Main purpose: Authentication, products, carts, orders, ratings, user/profile, messaging

3. Realtime Messaging Server
- Technology: Node.js + Socket.IO
- Main purpose: Realtime chat and message updates

4. Database
- Technology: MySQL (via XAMPP stack)
- Main purpose: Persistent storage of users, products, orders, carts, ratings, messages, inventory data

### 2.2 Core Feature Modules

- Authentication (customer + admin login)
- Product listing and search
- Cart and checkout/order creation
- Size and stock logic
- Pickup-date scheduling
- Order status workflows
- Ratings and reviews
- Messaging
- Admin dashboard (analytics, reports, inventory, order management)

---

## 3. User Roles

### 3.1 Customer User

A customer can:
- Register and login
- Browse/search products
- Select size and pickup date
- Add to cart or buy immediately
- Track own orders by status
- Confirm pickup
- Rate completed orders
- Send/receive messages

### 3.2 Admin User

An admin can:
- Access admin dashboard
- Manage products and inventory
- View analytics and sales reports
- Manage order statuses (approve/decline/ready for pickup/completed)
- View customer ratings and export rating data
- View/manage messaging

---

## 4. Access and Navigation

### 4.1 Main Routes

- `/login` - Customer login
- `/register` - Customer registration
- `/admin-login` - Admin login
- `/product-listing` - Product catalog (authenticated)
- `/cart` - Shopping cart (authenticated)
- `/orders` - Order tracking
- `/messages` - Messaging (authenticated)
- `/admin` - Admin dashboard (authenticated)

### 4.2 Admin Dashboard Sections

Inside Admin Dashboard sidebar:

- Dashboard (analytics)
- Orders
- Sales Report
- Ratings
- Messages
- Inventory
- My Products

### 4.3 How to Use the System (Quick Start)

Use this flow if you are new to LocalFit and want the fastest way to operate the system.

Customer quick flow:
1. Register account from `/register`.
2. Login from `/login`.
3. Open `/product-listing`, choose item and size.
4. Select pickup date (for in-stock items).
5. Add to cart, then place order.
6. Track order in `/orders` until it becomes Ready for Pickup.
7. Confirm pickup and complete the transaction.
8. Submit rating for completed order.

Admin quick flow:
1. Login from `/admin-login` and open `/admin`.
2. Review Dashboard metrics for daily status.
3. Process Orders queue:
- Approve valid orders.
- Decline invalid orders with remarks.
- Move fulfilled orders to Ready for Pickup.
4. Monitor Inventory low-stock items and restock by size.
5. Check Ratings and Messages for customer feedback and concerns.
6. Generate Sales Report export when needed.

First-time operational checklist:
1. Start XAMPP (Apache and MySQL).
2. Start frontend (`npm start`) in project root.
3. Start socket server (`npm start`) in `socket-server`.
4. Confirm API URL and socket URL are reachable.
5. Test login, place a test order, and confirm admin can process it.

---

## 5. Customer User Guide

## 5.1 Register and Login

1. Open the app and go to Register.
2. Fill in required user details.
3. Submit registration.
4. Login using your credentials.

Notes:
- Session token is used for protected actions.
- If session expires, user is redirected to login.

## 5.2 Browse and Search Products

1. Open Product Listing.
2. Use the search bar to filter products.
3. Review product card details:
- Product image
- Price
- Available sizes
- Stock by size

## 5.3 Add to Cart / Buy Now

1. Open a product modal.
2. Select a size.
3. If selected size is in stock:
- Choose pickup date (today up to 30 days ahead).
4. If selected size is out of stock:
- Order is treated as production order.
- Pickup date is deferred.
5. Click Add to Cart or Buy Now.

Validation behavior:
- Size is required.
- Pickup date is required for in-stock flow.

## 5.4 Cart Management

In Cart, customer can:
- View all cart items
- Update quantities
- Remove items
- Proceed to order placement

## 5.5 Order Tracking

Order tabs include:
- Pending
- Ready for Pickup
- Declined
- Completed

For each order, customer can view:
- Order number
- Product details
- Quantity
- Current status
- Pickup date (when relevant)
- Decline reason (if declined)

## 5.6 Confirm Pickup

When order status is Ready for Pickup:
1. Open order details.
2. Confirm pickup action.
3. Provide OR number if prompted/required.
4. Order status changes to Completed.

## 5.7 Rate Completed Orders

1. Open Completed orders tab.
2. Click Rate Order.
3. Select 1 to 5 stars.
4. Optional: write a review.
5. Submit.

Rules:
- One rating per order per user.
- Already rated orders show as Rated/disabled.

## 5.8 Messaging

Customers can:
- Open Messages section
- View message history
- Send realtime messages
- Receive unread message indicators

---

## 6. Admin User Guide

## 6.1 Login and Dashboard

1. Login via `/admin-login`.
2. Open `/admin` dashboard.
3. Review key metrics and charts.

Dashboard metrics include:
- Total revenue
- Completed orders
- Approved orders
- Average order value
- Top products with top-selling sizes

## 6.2 Order Management

Admin can:
- Search orders by ID/customer/product/size
- Filter by status and size
- Sort by columns
- View order details
- Export order management report

Common order statuses:
- pending-production
- pending
- approved
- declined
- ready-for-pickup
- completed

Typical admin actions:
- Approve order
- Decline order (with remarks)
- Mark as ready for pickup
- Update completion remarks

## 6.3 Sales Report

Sales Report section provides:
- Date-range filter
- Executive summary
- Completed order table
- Export report option

Suggested workflow:
1. Set date range.
2. Apply filter.
3. Review totals and completed orders.
4. Export report.

## 6.4 Ratings Management

Ratings section provides:
- Average rating
- Total reviews
- 5-star count
- Rating distribution chart
- Search and star filtering
- Excel export of filtered ratings

Useful filters:
- Customer name/email
- Product name
- Order ID
- Review text
- Star rating 1 to 5

## 6.5 Inventory Management

Inventory view supports size-level stock tracking:
- Starting stock
- Current stock
- Confirmed orders
- Sold quantity
- Low-stock highlighting

Admin can:
- Search by product or size
- Filter low stock only
- Add stock per product-size combination

## 6.6 Messaging

Admin can use the same messaging panel to communicate with users and review message activity.

---

## 7. Profile and Account Management

Profile module supports:
- Full name
- Email
- Phone
- Address
- Bio
- Profile image upload
- Password change

Security behavior:
- Auth required for profile endpoints
- Password change requires current password
- Image upload is validated for type and size

---

## 8. Realtime Messaging (Socket Server)

Socket server behavior:
- Handles user connections
- Broadcasts sent messages to connected clients
- Keeps in-memory message list while process is running

Default socket server port:
- `3000` (or `PORT` env value)

---

## 9. API Endpoint Reference (Summary)

Base URL (current environment config):
- `http://localhost:8080/`

### 9.1 Authentication
- `POST /register`
- `POST /login`
- `POST /logout`
- `GET /check_login_status`

### 9.2 Products
- `GET /products`
- `GET /product-listing`
- `GET /product-listing-offline`
- `GET /products-read?id={id}`
- `POST /products-create`
- `POST /products-update/{id}`
- `DELETE /products-delete/{id}`

### 9.3 Carts
- `GET /carts`
- `GET /carts-read?id={id}`
- `POST /carts-create`
- `POST /carts-update`
- `DELETE /carts-delete/{id}`
- `DELETE /carts-clear`
- `GET /cart-summary`

### 9.4 Orders
- `GET /orders`
- `GET /orders/{id}`
- `GET /orders-by-status?status={status}`
- `GET /order-stats`
- `POST /orders` (create and action-based updates)
- `PUT /orders/{id}` (status/pickup updates)

### 9.5 Ratings
- `POST /ratings`
- `GET /ratings` (admin)
- `GET /ratings/product/{productId}`
- `GET /ratings/order/{orderId}`
- `GET /ratings/summary/{productId}`

### 9.6 Users/Messages
- `GET /all-users`
- `GET /getAllUserEmails`
- `GET /messages?user1={id}&user2={id}`
- `POST /send-message`
- `POST /messages-unread`

---

## 10. Setup and Operations Guide

## 10.1 Prerequisites

- Node.js and npm
- Angular CLI
- XAMPP (Apache + MySQL + PHP)
- Browser for web app

## 10.2 Frontend Startup

1. Install dependencies:
- `npm install`

2. Start Angular app:
- `npm start`

Default frontend URL:
- `http://localhost:4200`

## 10.3 PHP API Startup

1. Start Apache and MySQL in XAMPP.
2. Ensure project is in `htdocs`.
3. Confirm API base URL matches environment config.

Current configured API URL:
- `http://localhost:8080/`

## 10.4 Socket Server Startup

1. Open terminal in `socket-server` folder.
2. Install dependencies:
- `npm install`
3. Start server:
- `npm start`

## 10.5 Build (Frontend)

- `npm run build`

---

## 11. Business Rules and Validations

1. Authentication
- Protected endpoints require bearer token.

2. Ratings
- Rating must be 1 to 5.
- One rating per order per user.

3. Pickup Date
- Valid date range is today to +30 days (for in-stock flow).

4. Size Handling
- Size is required for ordering.
- Out-of-stock size can enter pending-production flow.

5. Inventory
- Stock is tracked per product-size.
- Low-stock indicators support proactive restocking.

---

## 12. Troubleshooting

## 12.1 Cannot Login / Unauthorized (401)

Possible causes:
- Missing/expired token
- Invalid auth headers
- Session mismatch

Actions:
1. Logout and login again.
2. Clear browser local/session storage.
3. Verify API URL and backend is running.

## 12.2 Products or Orders Not Loading

Possible causes:
- API server not reachable
- CORS issue
- Database connection problem

Actions:
1. Check Apache/MySQL status.
2. Verify backend endpoint responds.
3. Check browser developer console/network logs.

## 12.3 Ratings Not Appearing

Possible causes:
- Ratings table not created
- No completed orders yet
- Auth issue on admin ratings endpoint

Actions:
1. Run ratings migration.
2. Confirm order reaches completed status.
3. Verify token/auth for `/ratings` endpoint.

## 12.4 Messaging Not Realtime

Possible causes:
- Socket server not running
- Wrong socket URL
- Blocked CORS origin

Actions:
1. Start socket server.
2. Verify `socketUrl` configuration.
3. Check console for websocket errors.

## 12.5 Inventory Counts Look Incorrect

Possible causes:
- Missing size quantity columns/migration
- Stale data after updates

Actions:
1. Confirm size-related migrations are applied.
2. Refresh inventory view.
3. Verify order completion and stock update logic in backend.

---

## 13. Recommended Admin Daily Checklist

1. Open Dashboard and review key metrics.
2. Check Orders and process pending actions.
3. Verify Ready for Pickup queue.
4. Review low-stock items and add stock.
5. Check Ratings for customer feedback.
6. Export report if needed.
7. Review unread messages.

---

## 14. Data and Security Notes

- Use HTTPS in production.
- Keep secrets/tokens out of source control.
- Regularly back up MySQL database.
- Restrict admin access to trusted accounts only.
- Apply role checks consistently for admin-only actions.

---

## 15. Change Log Template

Use this section to maintain manual updates over time.

- v1.0 (2026-03-31): Initial full-system user manual created.

---

End of Manual
