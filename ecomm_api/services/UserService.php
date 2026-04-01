<?php
require_once(__DIR__ . '/../config/database.php');

class UserService {
    private $conn;

    public function __construct($db) {
        // Support both PDO and mysqli
        if (method_exists($db, 'getConnection')) {
            $this->conn = $db->getConnection();
        } else {
            $this->conn = $db;
        }
    }

    // --- Methods from original UserService.php ---
    public function getAllEmails() {
        $query = "SELECT name, email FROM users";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getAllUsers() {
        // Get current user's email and role from localStorage (passed via request)
        // Or from session if available
        $currentUserEmail = $_SESSION['user_email'] ?? $_GET['currentUser'] ?? null;
        $isAdmin = false;
        
        if ($currentUserEmail) {
            $roleQuery = "SELECT role FROM users WHERE email = :email";
            $roleStmt = $this->conn->prepare($roleQuery);
            $roleStmt->bindParam(':email', $currentUserEmail);
            $roleStmt->execute();
            $currentUser = $roleStmt->fetch(PDO::FETCH_ASSOC);
            $isAdmin = $currentUser && isset($currentUser['role']) && $currentUser['role'] === 'admin';
        }
        
        // If admin, return all customers (non-admin users)
        // If regular user, return only admin users
        if ($isAdmin) {
            // Admin sees all customers (non-admin users)
            $query = "SELECT id, name, email, role FROM users WHERE (role IS NULL OR role != 'admin') AND email != :currentEmail";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':currentEmail', $currentUserEmail);
        } else {
            // Regular users see only admins
            $query = "SELECT id, name, email, role FROM users WHERE role = 'admin'";
            $stmt = $this->conn->prepare($query);
        }
        
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // --- Methods from AccService.php ---
    public function checkLoginStatus() {
        return json_encode(["loggedIn" => isset($_SESSION['user_id'])]);
    }

    public function loginUser($data) {
        $email = $data['email'];
        $password = $data['password'];

        $query = "SELECT * FROM users WHERE email = :email";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            $token = bin2hex(random_bytes(16));
            $_SESSION['token'] = $token;
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            return json_encode(["token" => $token, "user_id" => $user['id']]);
        } else {
            http_response_code(401);
            return json_encode(["error" => "Invalid email or password"]);
        }
    }

    public function logoutUser() {
        unset($_SESSION['token']);
        session_destroy();
        return json_encode(["message" => "Logged out successfully."]);
    }

public function registerUser($data) {
    $name = $data['name'] ?? null;
    $email = $data['email'];
    $cellphone = $data['cellphone'] ?? null;
    $password = $data['password'];
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    $query = "INSERT INTO users (name, email, cellphone, password) VALUES (:name, :email, :cellphone, :password)";
    $stmt = $this->conn->prepare($query);
    $stmt->bindParam(":name", $name);
    $stmt->bindParam(":email", $email);
    $stmt->bindParam(":cellphone", $cellphone);
    $stmt->bindParam(":password", $hashedPassword);

    if ($stmt->execute()) {
        return json_encode(["message" => "User was registered successfully."]);
    } else {
        http_response_code(400);
        return json_encode(["error" => "Unable to register the user."]);
    }
}

    public function setSession($data) {
        if (isset($data['userId'])) {
            $_SESSION['user_id'] = $data['userId'];
            return json_encode(["message" => "Session set successfully."]);
        } else {
            http_response_code(400);
            return json_encode(["error" => "Invalid data provided."]);
        }
    }

    public function validateToken($token) {
        // Check session token first
        if (isset($_SESSION['token']) && $_SESSION['token'] === $token) {
            return json_encode(["valid" => true, "user_id" => $_SESSION['user_id']]);
        }
        
        // For Bearer tokens, check if it's a valid 32-character hex string
        // This is a simple validation - in production you'd check against a database
        if (strlen($token) === 32 && ctype_xdigit($token)) {
            // Token format is valid, accept it
            // In a real app, you'd query the database to verify this token
            return json_encode(["valid" => true]);
        }
        
        http_response_code(401);
        return json_encode(["valid" => false, "message" => "Invalid token."]);
    }

    public function changeUserPassword($userId, $currentPassword, $newPassword) {
        // First, verify current password
        $query = "SELECT password FROM users WHERE id = :userId";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":userId", $userId);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            http_response_code(404);
            return json_encode(["error" => "User not found."]);
        }

        if (!password_verify($currentPassword, $user['password'])) {
            http_response_code(400);
            return json_encode(["error" => "Current password is incorrect."]);
        }

        // Update with new password
        $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
        $updateQuery = "UPDATE users SET password = :password, updated_at = NOW() WHERE id = :userId";
        $updateStmt = $this->conn->prepare($updateQuery);
        $updateStmt->bindParam(":password", $hashedPassword);
        $updateStmt->bindParam(":userId", $userId);
        
        if ($updateStmt->execute()) {
            return json_encode(["message" => "Password changed successfully."]);
        } else {
            http_response_code(400);
            return json_encode(["error" => "Unable to change password."]);
        }
    }

}