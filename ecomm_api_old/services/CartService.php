<?php
require_once(__DIR__ . '/UserService.php');
class CartService
{
    private $conn;
    private $table_name = "carts";
    private $userId;
    private $token;

    public function __construct($db, $userId, $token)
    {
        $this->conn = $db;
        $this->userId = $userId;
        $this->token = $token;
    }

    public function createCart($data)
    {

        // Verify the token before creating the task
        $userService = new UserService($this->conn);
        $tokenValidation = json_decode($userService->validateToken($this->token), true);
        if (!$tokenValidation['valid']) {
            http_response_code(401);
            return json_encode(["error" => "Invalid token."]);
        }

        if (!isset($data) || empty($data)) {
            http_response_code(400);
            return json_encode(["error" => "No data provided"]);
        }

        if (!isset($data->product_id) || !isset($data->quantity)) {
            http_response_code(400);
            return json_encode(["error" => "Product ID and quantity are required"]);
        }

        $productId = htmlspecialchars(strip_tags($data->product_id));
        $quantity = htmlspecialchars(strip_tags($data->quantity));

        // Check if the product exists in the products table
        $query = "SELECT id FROM products WHERE id = :product_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":product_id", $productId);
        $stmt->execute();

        if (!$stmt->rowCount()) {
            http_response_code(404);
            return json_encode(["error" => "Product not found"]);
        }

        $query = "INSERT INTO " . $this->table_name . " 
              SET product_id=:product_id, quantity=:quantity, user_id=:user_id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":product_id", $productId);
        $stmt->bindParam(":quantity", $quantity);
        $stmt->bindParam(":user_id", $this->userId);

        if ($stmt->execute()) {
            http_response_code(201);
            return json_encode(["message" => "Cart was created."]);
        } else {
            http_response_code(503);
            return json_encode(["message" => "Unable to create cart."]);
        }
    }

    public function readCarts()
    {
        $query = "SELECT c.id, c.product_id, c.quantity, c.user_id, p.name, p.price, p.description, p.image 
              FROM " . $this->table_name . " c 
              INNER JOIN products p ON c.product_id = p.id 
              WHERE c.user_id = :user_id
              ORDER BY c.id DESC";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->userId);
        $stmt->execute();

        $carts_arr = ["records" => []];

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $carts_arr["records"][] = $row;
        }

        return json_encode($carts_arr);
    }

    public function readOneCart($id)
    {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id";
        $stmt = $this->conn->prepare($query);

        $stmt->bindParam(":id", $id);

        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $cart = $stmt->fetch(PDO::FETCH_ASSOC);
            return json_encode($cart);
        } else {
            http_response_code(404);
            return json_encode(["message" => "Cart not found."]);
        }
    }

    public function updateCart($data)
    {
        $query = "UPDATE " . $this->table_name . " 
                      SET product_id = :product_id, quantity = :quantity 
                      WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);

        $product_id = htmlspecialchars(strip_tags($data->product_id));
        $quantity = htmlspecialchars(strip_tags($data->quantity));
        $id = htmlspecialchars(strip_tags($data->id));

        $stmt->bindParam(':product_id', $product_id);
        $stmt->bindParam(':quantity', $quantity);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':user_id', $this->userId);

        if ($stmt->execute()) {
            return json_encode(["message" => "Cart was updated."]);
        } else {
            http_response_code(503);
            return json_encode(["message" => "Unable to update cart."]);
        }
    }

    public function deleteCart($id)
    {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->bindParam(':user_id', $this->userId);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $query = "DELETE FROM " . $this->table_name . " WHERE id = :id AND user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":id", $id);
            $stmt->bindParam(':user_id', $this->userId);

            if ($stmt->execute()) {
                http_response_code(200);
                return json_encode(["message" => "Cart was deleted."]);
            } else {
                http_response_code(503);
                return json_encode(["message" => "Unable to delete cart."]);
            }
        } else {
            http_response_code(404);
            return json_encode(["message" => "Cart not found."]);
        }
    }
}
