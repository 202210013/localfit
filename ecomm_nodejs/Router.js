const express = require('express');
const router = express.Router();

// Import middleware
const { requireAuthentication, optionalAuthentication } = require('./middleware/auth');
const { uploadSingle, handleUploadError } = require('./middleware/upload');

// Import services
const UserService = require('./services/UserService');
const ProductService = require('./services/ProductService');
const CartService = require('./services/CartService');
const OrderService = require('./services/OrderService');
const MessageService = require('./services/MessageService');

// Initialize services
const userService = new UserService();
const productService = new ProductService();
const cartService = new CartService();
const orderService = new OrderService();
const messageService = new MessageService();

// Utility function to handle async route errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==================== GET ROUTES ====================

// Products routes
router.get('/products', asyncHandler(async (req, res) => {
  const seller = req.query.seller;
  const result = await productService.readProducts(seller);
  res.json(result);
}));

router.get('/product-listing', asyncHandler(async (req, res) => {
  const result = await productService.readAllProducts();
  res.json(result);
}));

router.get('/product-listing-offline', asyncHandler(async (req, res) => {
  const result = await productService.readAllProductsOffline();
  res.json(result);
}));

router.get('/products-read', asyncHandler(async (req, res) => {
  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: "Product ID is required" });
  }
  const result = await productService.readOneProduct(id);
  res.json(result);
}));

// Orders routes
router.get('/orders', asyncHandler(async (req, res) => {
  const user = req.query.user;
  const admin = req.query.admin;
  const result = await orderService.getAllOrders(user, admin);
  res.json(result);
}));

// Carts routes
router.get('/carts', requireAuthentication, asyncHandler(async (req, res) => {
  const result = await cartService.readCarts(req.user);
  res.json(result);
}));

router.get('/carts-read', requireAuthentication, asyncHandler(async (req, res) => {
  const id = req.query.id;
  if (!id) {
    return res.status(400).json({ error: "Cart ID is required" });
  }
  const result = await cartService.readOneCart(id);
  res.json(result);
}));

// User routes
router.get('/check_login_status', asyncHandler(async (req, res) => {
  const result = await userService.checkLoginStatus(req);
  res.json(result);
}));

router.get('/getAllUserEmails', asyncHandler(async (req, res) => {
  const result = await userService.getAllEmails();
  res.json(result);
}));

router.get('/all-users', asyncHandler(async (req, res) => {
  const result = await userService.getAllUsers();
  res.json(result);
}));

// Messages routes
router.get('/messages', asyncHandler(async (req, res) => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) {
    return res.status(400).json({ error: "user1 and user2 required" });
  }
  const result = await messageService.getMessagesBetween(user1, user2);
  res.json(result);
}));

router.post('/messages-unread', asyncHandler(async (req, res) => {
  const recipient = req.body.recipient || req.query.recipient;
  if (!recipient) {
    return res.status(400).json({ error: "recipient is required" });
  }
  const result = await messageService.getUnreadMessages(recipient);
  res.json(result);
}));

// ==================== POST ROUTES ====================

// Authentication routes
router.post('/register', asyncHandler(async (req, res) => {
  const result = await userService.registerUser(req.body);
  res.json(result);
}));

router.post('/login', asyncHandler(async (req, res) => {
  const result = await userService.loginUser(req.body);
  res.json(result);
}));

router.post('/logout', asyncHandler(async (req, res) => {
  const result = await userService.logoutUser(req);
  res.json(result);
}));

router.post('/set_session', asyncHandler(async (req, res) => {
  const result = await userService.setSession(req.body);
  res.json(result);
}));

// Products routes
router.post('/products-create', requireAuthentication, uploadSingle, handleUploadError, asyncHandler(async (req, res) => {
  const result = await productService.createProduct(req.body, req.file, req.user);
  res.json(result);
}));

router.post('/products-update/:id', requireAuthentication, uploadSingle, handleUploadError, asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "Product ID is required" });
  }
  const result = await productService.updateProduct(id, req.body, req.file, req.user);
  res.json(result);
}));

// Carts routes
router.post('/carts-create', requireAuthentication, asyncHandler(async (req, res) => {
  const result = await cartService.createCart(req.body, req.user);
  res.json(result);
}));

router.post('/carts-update', requireAuthentication, asyncHandler(async (req, res) => {
  const result = await cartService.updateCart(req.body, req.user);
  res.json(result);
}));

// Messages routes
router.post('/send-message', asyncHandler(async (req, res) => {
  const result = await messageService.saveMessage(req.body);
  res.json(result);
}));

// Orders routes - Handle multiple order actions
router.post('/orders', asyncHandler(async (req, res) => {
  const data = req.body;
  
  console.log("=== ORDERS API DEBUG ===");
  console.log("Data received:", data);
  console.log("Request method:", req.method);
  
  // Handle different order actions
  if (data.action === 'approve' && data.orderId) {
    // Require authentication for approve action
    await requireAuthentication(req, res, async () => {
      const result = await orderService.approveOrder(data.orderId);
      res.json(result);
    });
  } else if (data.action === 'decline' && data.orderId) {
    // Require authentication for decline action
    await requireAuthentication(req, res, async () => {
      const remarks = data.remarks || null;
      const result = await orderService.declineOrder(data.orderId, remarks);
      res.json(result);
    });
  } else if (data.action === 'ready-for-pickup' && data.orderId) {
    // Require authentication for ready-for-pickup action
    await requireAuthentication(req, res, async () => {
      const result = await orderService.markReadyForPickup(data.orderId);
      res.json(result);
    });
  } else if (data.action === 'confirm-pickup' && data.orderId && data.customerEmail) {
    // Handle pickup confirmation
    const orNumber = data.orNumber || null;
    const result = await orderService.confirmPickup(data.orderId, data.customerEmail, orNumber);
    res.json(result);
  } else if (data.action === 'update-completion-remarks' && data.orderId && data.remarks) {
    // Handle completion remarks update
    await requireAuthentication(req, res, async () => {
      const result = await orderService.updateCompletionRemarks(data.orderId, data.remarks);
      res.json(result);
    });
  } else if (data.action === 'test-pickup') {
    // Test endpoint for debugging
    console.log("Test pickup endpoint reached");
    res.json({ success: true, message: "Test endpoint working" });
  } else if (Array.isArray(data) && data[0] && data[0].customer) {
    // Handle order creation (array of orders)
    const result = await orderService.createOrders(data);
    res.json(result);
  } else {
    console.log("Invalid order data - falling through to 400 error");
    console.log("Data structure:", data);
    res.status(400).json({ 
      error: "Invalid order data", 
      received_data: data 
    });
  }
}));

// ==================== DELETE ROUTES ====================

router.delete('/products-delete/:id', requireAuthentication, asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "Product ID is required" });
  }
  const result = await productService.deleteProduct(id, req.user);
  res.json(result);
}));

router.delete('/carts-delete/:id', requireAuthentication, asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "Cart ID is required" });
  }
  const result = await cartService.deleteCart(id, req.user);
  res.json(result);
}));

// Error handling for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;