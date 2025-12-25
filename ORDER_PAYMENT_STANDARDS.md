# Order & Payment Standardization Guide

## Overview
This document defines the standardized structure for orders and payment handling in the easyshoppingmall backend.

---

## Order Object Structure

### Standard Order Response

```json
{
  "_id": "694cb5e1f4f88686cc074ed6",
  "userId": "691a169a09c0714d036d4c6e",
  "orderId": "3954ab71-c65d-4ae6-8f59-281f035b6d4f",
  
  // Products
  "products": [
    {
      "_id": "694cb5e1f4f88686cc074ed7",
      "productId": "6939e2dae9991f46b2c057b1",
      "name": "Radymade Three Piece",
      "image": ["url1", "url2"],
      "quantity": 2,
      "price": 1350,
      "totalPrice": 2700,
      "size": "36",
      "color": "red",
      "weight": "44"
    }
  ],

  // Delivery Details
  "delivery_address": "feni, গাজীপুর সদর",
  "deliveryCharge": 120,

  // Amount Details
  "subTotalAmt": 2700,
  "totalAmt": 2820,
  "amount_paid": 2820,
  "amount_due": 0,

  // Payment Information
  "payment_method": "sslcommerz", // "manual" or "sslcommerz"
  "payment_status": "pending",    // "pending", "paid", "failed", "refunded"
  "payment_details": {
    // For Manual Payment:
    "manualFor": "delivery",        // "full" or "delivery"
    "providerNumber": "01700000000",
    "transactionId": "TXN123456"
    
    // OR for SSL Commerz:
    // "sessionKey": "74487CFCCB840EC357607A93767385E3"
  },
  "paymentId": "",
  "invoice_receipt": "",

  // Order Status
  "order_status": "pending",  // "pending", "processing", "shipped", "delivered", "cancelled", "completed"
  
  "createdAt": "2025-12-25T03:56:17.364Z",
  "updatedAt": "2025-12-25T03:56:18.202Z"
}
```

---

## API Endpoints

### 1. Create Order

**Endpoint:** `POST /api/orders/create`

**Request Body:**
```json
{
  "userId": "691a169a09c0714d036d4c6e",
  "delivery_address": "feni, গাজীপুর সদর",
  "payment_method": "sslcommerz",  // "manual" or "sslcommerz"
  "payment_type": "FULL"            // "FULL" or "DELIVERY" (for manual only)
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": { /* Order Object */ }
}
```

---

### 2. Manual Payment Submission

**Endpoint:** `POST /api/orders/manual-payment`

**Manual Payment for Delivery (COD):**
```json
{
  "orderId": "3954ab71-c65d-4ae6-8f59-281f035b6d4f",
  "manualFor": "delivery"
  // No providerNumber/transactionId needed for COD
}
```

**Manual Payment for Full (Bank Transfer):**
```json
{
  "orderId": "3954ab71-c65d-4ae6-8f59-281f035b6d4f",
  "manualFor": "full",
  "providerNumber": "01700000000",
  "transactionId": "TXN123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual payment submitted, pending admin confirmation",
  "data": { /* Order Object with updated payment_details */ }
}
```

---

## Payment Methods

### Manual Payment (Cash on Delivery / Bank Transfer)
- **payment_method:** `"manual"`
- **payment_details structure:**
  ```typescript
  {
    manualFor: "full" | "delivery",
    providerNumber?: string,
    transactionId?: string
  }
  ```
- **Status:** Always starts as `"pending"` (requires admin confirmation)
- **Use Cases:**
  - Pay at delivery (COD)
  - Bank transfer before order processing

### SSL Commerz (Online Payment)
- **payment_method:** `"sslcommerz"`
- **payment_details structure:**
  ```typescript
  {
    sessionKey: string,
    paymentId?: string
  }
  ```
- **Status:** Updates to `"paid"` after successful payment
- **Use Cases:**
  - Credit/Debit card payments
  - Mobile banking
  - Bkash, Nagad, Rocket, etc.

---

## Amount Calculations

```
subTotalAmt = sum of (product.quantity * product.price)
deliveryCharge = calculateDeliveryCharge(delivery_address)
totalAmt = subTotalAmt + deliveryCharge

// For payment tracking:
amount_paid = 0 (initially) → updated when payment succeeds
amount_due = totalAmt - amount_paid
```

---

## Order Status Lifecycle

```
pending → processing → shipped → delivered → completed
                    ↓
                cancelled
```

---

## Payment Status Lifecycle

```
Manual Payment:    pending → paid (after admin confirmation) or refunded
SSL Commerz:       pending → paid (after callback) or failed/refunded
```

---

## Database Schema Changes

- ✅ Removed `payment_session_key` (now inside `payment_details.sessionKey`)
- ✅ Added `amount_paid` and `amount_due` fields
- ✅ Standardized `payment_details` to use `Schema.Types.Mixed` for flexibility
- ✅ Added optional `color` and `weight` fields to products
- ✅ Removed invalid "online" payment method enum

---

## Example Flow

### Manual Payment (Delivery)
1. User creates order with `payment_method: "manual"`, `payment_type: "DELIVERY"`
2. Order created with `payment_status: "pending"`
3. Delivery happens, user pays driver
4. Admin confirms payment → `payment_status: "paid"`

### SSL Commerz Payment
1. User creates order with `payment_method: "sslcommerz"`
2. Frontend initiates SSL Commerz payment
3. User completes payment
4. SSL Commerz callback confirms payment
5. Order `payment_status: "paid"`, `order_status: "processing"`

