<?php
$secretKey = 'sk_test_Z73iQ2TKvWJRa4Xw2foRVxUe';
$headers = [
    'Authorization: Basic ' . base64_encode($secretKey . ':'),
    'Content-Type: application/json'
];
$input = json_decode(file_get_contents('php://input'), true);
$ch = curl_init('https://api.paymongo.com/v1/payment_intents');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($input));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
echo $response;