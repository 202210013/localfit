<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$mysqli = new mysqli("localhost", "root", "", "ecomm_db"); // Change credentials as needed

if ($mysqli->connect_errno) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to connect to DB"]);
    exit();
}

// Approve order (POST with action)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    // Approve order
    if (isset($input['action']) && $input['action'] === 'approve' && isset($input['orderId'])) {
        $orderId = intval($input['orderId']);
        $stmt = $mysqli->prepare("UPDATE orders SET status='approved' WHERE id=?");
        $stmt->bind_param("i", $orderId);
        $stmt->execute();
        $stmt->close();
        echo json_encode(["success" => true, "approvedOrderId" => $orderId]);
        exit();
    }

    // Create new orders (array)
    if (is_array($input) && isset($input[0]['customer'])) {
        $stmt = $mysqli->prepare("INSERT INTO orders (customer, product, quantity, status) VALUES (?, ?, ?, 'pending')");
        foreach ($input as $order) {
            $customer = $order['customer'];
            $product = $order['product'];
            $quantity = intval($order['quantity']);
            $stmt->bind_param("ssi", $customer, $product, $quantity);
            $stmt->execute();
        }
        $stmt->close();
        echo json_encode(["success" => true]);
        exit();
    }

    http_response_code(400);
    echo json_encode(["error" => "Invalid input"]);
    exit();
}

// Fetch all orders
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $result = $mysqli->query("SELECT * FROM orders ORDER BY id DESC");
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    echo json_encode($orders);
    exit();
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);