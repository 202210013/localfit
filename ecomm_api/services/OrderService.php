<?php
class OrderService {
    private $db;
    public function __construct($db) { $this->db = $db; }
    public function createOrders($orders) {
    $stmt = $this->db->prepare("INSERT INTO orders (customer, product, quantity, status) VALUES (?, ?, ?, 'pending')");
    foreach ($orders as $order) {
        $stmt->execute([
            $order['customer'],
            $order['product'],
            $order['quantity']
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
}