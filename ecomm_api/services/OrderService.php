<?php
class OrderService {
    private $db;
    public function __construct($db) { $this->db = $db; }
    public function createOrders($orders) {
    // Debug logging
    error_log("=== ORDER CREATION DEBUG ===");
    error_log("Received orders data: " . print_r($orders, true));
    
    $stmt = $this->db->prepare("INSERT INTO orders (customer, product, quantity, size, status, created_at, pickup_date) VALUES (?, ?, ?, ?, 'pending', NOW(), ?)");
    foreach ($orders as $order) {
        $size = $order['size'] ?? 'M';
        $pickupDate = $order['pickup_date'] ?? null; // Use customer-selected pickup date
        error_log("Processing order - Product: {$order['product']}, Size: {$size}, Pickup Date: " . ($pickupDate ?: 'NULL'));
        
        $stmt->execute([
            $order['customer'],
            $order['product'],
            $order['quantity'],
            $size, // Default to 'M' if size not provided
            $pickupDate // Use customer-selected pickup date
        ]);
    }
    $stmt = null; // Close statement
    // Always return valid JSON
    return json_encode(["success" => true]);
}
public function getAllOrders() {
    $user = $_GET['user'] ?? '';
    if ($user) {
        $stmt = $this->db->prepare("
            SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
            FROM orders o 
            LEFT JOIN users u ON o.customer = u.email 
            WHERE o.customer = ?
        ");
        $stmt->execute([$user]);
    } else {
        $stmt = $this->db->query("
            SELECT o.*, u.name as customer_name, u.cellphone as customer_cellphone 
            FROM orders o 
            LEFT JOIN users u ON o.customer = u.email
        ");
    }
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return $orders ?: []; // Always return an array
}
public function approveOrder($orderId) {
    // Check if order already has a pickup date from customer selection
    $checkStmt = $this->db->prepare("SELECT pickup_date FROM orders WHERE id = ?");
    $checkStmt->execute([$orderId]);
    $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    // Only set pickup date if customer didn't select one (fallback to 3 days from now)
    $pickupDate = $result['pickup_date'] ?: date('Y-m-d', strtotime('+3 days'));
    
    // Update order to ready-for-pickup status with pickup date
    $stmt = $this->db->prepare("UPDATE orders SET status = 'ready-for-pickup', pickup_date = ? WHERE id = ?");
    $stmt->execute([$pickupDate, $orderId]);
    return json_encode(["success" => true, "pickup_date" => $pickupDate]);
}
public function declineOrder($orderId, $remarks = null) {
    try {
        error_log("=== DECLINE ORDER DEBUG ===");
        error_log("OrderID: $orderId");
        error_log("Remarks: " . ($remarks ?: "NULL"));
        
        // Try the modern approach first (with remarks)
        if ($remarks) {
            try {
                $stmt = $this->db->prepare("UPDATE orders SET status = 'declined', remarks = ? WHERE id = ?");
                $stmt->execute([$remarks, $orderId]);
                error_log("Order declined successfully with remarks");
                return json_encode(["success" => true]);
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Unknown column') !== false && strpos($e->getMessage(), 'remarks') !== false) {
                    error_log("Remarks column doesn't exist, adding it...");
                    // Try to add the column
                    try {
                        $this->db->exec("ALTER TABLE orders ADD COLUMN remarks TEXT NULL AFTER status");
                        error_log("Remarks column added successfully");
                        
                        // Retry the update
                        $stmt = $this->db->prepare("UPDATE orders SET status = 'declined', remarks = ? WHERE id = ?");
                        $stmt->execute([$remarks, $orderId]);
                        error_log("Order declined successfully with remarks after adding column");
                        return json_encode(["success" => true]);
                    } catch (PDOException $e2) {
                        error_log("Failed to add remarks column: " . $e2->getMessage());
                        // Fall back to basic decline without remarks
                        $stmt = $this->db->prepare("UPDATE orders SET status = 'declined' WHERE id = ?");
                        $stmt->execute([$orderId]);
                        error_log("Order declined without remarks (fallback)");
                        return json_encode(["success" => true, "message" => "Order declined (remarks feature unavailable)"]);
                    }
                } else {
                    throw $e; // Re-throw if it's a different error
                }
            }
        } else {
            // No remarks, simple update
            $stmt = $this->db->prepare("UPDATE orders SET status = 'declined' WHERE id = ?");
            $stmt->execute([$orderId]);
            error_log("Order declined successfully without remarks");
            return json_encode(["success" => true]);
        }
        
    } catch (Exception $e) {
        error_log("Error declining order: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        http_response_code(500);
        return json_encode(["success" => false, "error" => $e->getMessage()]);
    }
}

public function markReadyForPickup($orderId) {
    $stmt = $this->db->prepare("UPDATE orders SET status = 'ready-for-pickup' WHERE id = ?");
    $stmt->execute([$orderId]);
    return json_encode(["success" => true]);
}

public function confirmPickup($orderId, $customerEmail, $orNumber = null) {
    // Debug logging
    error_log("=== CONFIRM PICKUP DEBUG ===");
    error_log("OrderID: $orderId");
    error_log("Customer Email: $customerEmail");
    error_log("OR Number: " . ($orNumber ?: "NULL"));
    
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
    error_log("Order is valid and ready for pickup, updating status to completed with OR Number");
    
    // Update order status to completed with OR Number
    $updateStmt = $this->db->prepare("UPDATE orders SET status = 'completed', or_number = ? WHERE id = ?");
    $updateStmt->execute([$orNumber, $orderId]);
    
    error_log("Order $orderId status updated to completed with OR Number: " . ($orNumber ?: "NULL"));
    return json_encode([
        "success" => true, 
        "message" => "Order pickup confirmed successfully",
        "or_number" => $orNumber
    ]);
}

public function updateCompletionRemarks($orderId, $remarks) {
    // Debug logging
    error_log("=== UPDATE COMPLETION REMARKS DEBUG ===");
    error_log("OrderID: $orderId");
    error_log("Remarks: $remarks");
    
    // Check if order exists and is completed
    $checkStmt = $this->db->prepare("SELECT status FROM orders WHERE id = ?");
    $checkStmt->execute([$orderId]);
    $order = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$order) {
        error_log("Order $orderId does not exist");
        http_response_code(404);
        return json_encode(["success" => false, "error" => "Order not found"]);
    }
    
    if ($order['status'] !== 'completed') {
        error_log("Order $orderId is not completed, current status: {$order['status']}");
        http_response_code(400);
        return json_encode([
            "success" => false, 
            "error" => "Only completed orders can have completion remarks"
        ]);
    }
    
    // Update completion remarks
    $updateStmt = $this->db->prepare("UPDATE orders SET completion_remarks = ? WHERE id = ?");
    $updateResult = $updateStmt->execute([$remarks, $orderId]);
    
    if ($updateResult) {
        error_log("Order $orderId completion remarks updated successfully");
        return json_encode([
            "success" => true, 
            "message" => "Completion remarks updated successfully"
        ]);
    } else {
        error_log("Failed to update completion remarks for order $orderId");
        http_response_code(500);
        return json_encode([
            "success" => false, 
            "error" => "Failed to update completion remarks"
        ]);
    }
}
}