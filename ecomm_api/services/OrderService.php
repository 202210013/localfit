<?php
class OrderService {
    private $db;
    public function __construct($db) { $this->db = $db; }
    public function createOrders($orders) {
    // Debug logging
    error_log("=== ORDER CREATION DEBUG ===");
    error_log("Received orders data: " . print_r($orders, true));
    
    $stmt = $this->db->prepare("INSERT INTO orders (customer, product, quantity, size, status) VALUES (?, ?, ?, ?, 'pending')");
    foreach ($orders as $order) {
        $size = $order['size'] ?? 'M';
        error_log("Processing order - Product: {$order['product']}, Size: {$size}");
        
        $stmt->execute([
            $order['customer'],
            $order['product'],
            $order['quantity'],
            $size // Default to 'M' if size not provided
        ]);
    }
    $stmt = null; // Close statement
    // Always return valid JSON
    return json_encode(["success" => true]);
}
public function getAllOrders() {
    $user = $_GET['user'] ?? '';
    if ($user) {
        $stmt = $this->db->prepare("SELECT * FROM orders WHERE customer = ?");
        $stmt->execute([$user]);
    } else {
        $stmt = $this->db->query("SELECT * FROM orders");
    }
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $orders ?: []; // Always return an array
}
public function approveOrder($orderId) {
    $stmt = $this->db->prepare("UPDATE orders SET status = 'approved' WHERE id = ?");
    $stmt->execute([$orderId]);
    return json_encode(["success" => true]);
}
public function declineOrder($orderId) {
    $stmt = $this->db->prepare("UPDATE orders SET status = 'declined' WHERE id = ?");
    $stmt->execute([$orderId]);
    return json_encode(["success" => true]);
}

public function markReadyForPickup($orderId) {
    $stmt = $this->db->prepare("UPDATE orders SET status = 'ready-for-pickup' WHERE id = ?");
    $stmt->execute([$orderId]);
    return json_encode(["success" => true]);
}

public function confirmPickup($orderId, $customerEmail) {
    // Debug logging
    error_log("=== CONFIRM PICKUP DEBUG ===");
    error_log("OrderID: $orderId");
    error_log("Customer Email: $customerEmail");
    
    // First check if order exists at all
    $checkStmt = $this->db->prepare("SELECT * FROM orders WHERE id = ?");
    $checkStmt->execute([$orderId]);
    $existingOrder = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$existingOrder) {
        error_log("Order $orderId does not exist at all");
        http_response_code(404);
        return json_encode(["success" => false, "error" => "Order not found"]);
    }
    
    error_log("Order exists: " . print_r($existingOrder, true));
    
    // Check if it belongs to the customer
    if ($existingOrder['customer'] !== $customerEmail) {
        error_log("Order belongs to different customer: {$existingOrder['customer']} vs $customerEmail");
        http_response_code(403);
        return json_encode(["success" => false, "error" => "Order does not belong to this customer"]);
    }
    
    // Check the current status
    if ($existingOrder['status'] !== 'ready-for-pickup') {
        error_log("Order status is {$existingOrder['status']}, not ready-for-pickup");
        http_response_code(400);
        return json_encode([
            "success" => false, 
            "error" => "Order is not ready for pickup", 
            "current_status" => $existingOrder['status']
        ]);
    }
    
    // If we get here, the order is valid and ready for pickup
    error_log("Order is valid and ready for pickup, updating status to completed");
    
    // Update order status to completed
    $updateStmt = $this->db->prepare("UPDATE orders SET status = 'completed' WHERE id = ?");
    $updateStmt->execute([$orderId]);
    
    error_log("Order $orderId status updated to completed");
    return json_encode(["success" => true, "message" => "Order pickup confirmed successfully"]);
}
}