<?php

if (!function_exists('env_load')) {
    /**
     * Load environment variables from a .env file into putenv(), $_ENV and $_SERVER.
     */
    function env_load($filePath)
    {
        static $loadedFiles = [];

        if (isset($loadedFiles[$filePath])) {
            return;
        }

        if (!is_file($filePath) || !is_readable($filePath)) {
            $loadedFiles[$filePath] = true;
            return;
        }

        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            $loadedFiles[$filePath] = true;
            return;
        }

        foreach ($lines as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || strpos($trimmed, '#') === 0) {
                continue;
            }

            $pos = strpos($trimmed, '=');
            if ($pos === false) {
                continue;
            }

            $key = trim(substr($trimmed, 0, $pos));
            $value = trim(substr($trimmed, $pos + 1));

            if ($key === '') {
                continue;
            }

            if (
                (strlen($value) >= 2) &&
                (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))
            ) {
                $value = substr($value, 1, -1);
            }

            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }

        $loadedFiles[$filePath] = true;
    }
}

if (!function_exists('env')) {
    /**
     * Fetch an environment variable with a default fallback.
     */
    function env($key, $default = null)
    {
        $value = getenv($key);

        if ($value === false) {
            return $default;
        }

        return $value;
    }
}

env_load(__DIR__ . '/.env');

date_default_timezone_set("Asia/Manila");
set_time_limit(1000);

$timezone = env('APP_TIMEZONE', 'Asia/Manila');
if (!empty($timezone)) {
    date_default_timezone_set($timezone);
}

define("SERVER", env('DB_HOST', 'localhost'));
define("DATABASE", env('DB_NAME', 'e-comm'));
define("USER", env('DB_USER', 'root'));
define("PASSWORD", env('DB_PASSWORD', ''));
define("DB_CHARSET", env('DB_CHARSET', 'utf8mb4'));

define("DRIVER", env('DB_DRIVER', 'mysql'));

class Connection
{
    private $connectionString = DRIVER . ":host=" . SERVER . ";dbname=" . DATABASE . ";charset=" . DB_CHARSET;
    private $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ];

    public function connect()
    {
        try {
            return new PDO($this->connectionString, USER, PASSWORD, $this->options);
        } catch (PDOException $e) {
            error_log("Database Connection Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => true,
                'message' => 'Database connection failed. Please contact support.',
                'details' => $e->getMessage()
            ]);
            exit();
        }
    }
}
