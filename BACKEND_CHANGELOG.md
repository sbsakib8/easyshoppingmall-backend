# Backend Changelog

## RBAC Fixes — 2026-06-03

### Fix 1: Role normalization — all non-ADMIN roles now pass through correctly
**Files:** `src/middlewares/isAuth.ts:39`, `src/middlewares/optionalAuth.ts:30`, `src/models/order/interface.ts:89`

Changed `role: user.role === "ADMIN" ? "admin" : "user"` to `role: user.role?.toLowerCase() || "user"`.

**Before:** Every non-ADMIN role (DROPSHIPPING, INVESTMENT, SELLERPROGRAM, BOXLEADER, USER) was collapsed to `"user"`. A DROPSHIPPING user had `role: "user"` — so the frontend treated them identically to a regular customer, granting access to all user pages (including `/shop`).

**After:** The actual role is passed through in lowercase (e.g., `"admin"`, `"user"`, `"dropshipping"`, `"investment"`, `"sellerprogram"`, `"boxleader"`). The frontend can now properly distinguish between role types and restrict pages accordingly.

Also updated the `AuthUser` interface to accept `role?: string` instead of `role?: "user" | "admin"`.

### Fix 2: Protected analytics routes
**File:** `src/models/analytics/analytics.routes.ts`

Added `isAuth, isAdmin` middleware to 4 previously unprotected analytics summary endpoints:
- `GET /customer/summary`
- `GET /product/summary`
- `GET /traffic/summary`
- `GET /dropshipping/summary`

These endpoints were publicly accessible with no authentication, exposing sensitive business data.

### Fix 3: Fixed admin route — added missing `isAuth`
**File:** `src/models/admin/admin.route.ts`

Added `isAuth` before `isAdmin` on:
- `GET /payments`
- `GET /payments/:orderId`

Previously `isAdmin` was used alone, but it depends on `req.userId` which is only set by `isAuth`. The endpoints always returned 401.

### Fix 4: Fixed broken type augmentation import
**File:** `src/types/express.d.ts`

Changed the import path from `"../modules/order/interface"` (non-existent) to `"../models/order/interface"` (correct path). This allows the global `Express.Request` type augmentation to work properly.

### Fix 5: Fixed review delete authorization
**File:** `src/models/review/review.routes.ts`

Removed `isAdmin` from `DELETE /reviews/:id` (line 25). The controller (`review.controller.ts`) already handles authorization correctly:
- Admins can delete any review
- Non-admin users can only delete their own reviews

Previously the route required `isAdmin`, making the controller's self-deletion logic unreachable for regular users.

---

## API Doc Bugs Fixes — 2026-06-03

### Bug #1: `tran_id` unique index causing duplicate key errors
**File:** `src/models/order/order.model.ts:97`

Set `default: undefined` on `tran_id` so the field doesn't exist on documents unless explicitly set, preventing sparse index collisions.

Also fixed the pre-save hook (`order.model.ts:163-166`) to respect `delivery` payment type when `payment_status === "paid"` — previously it always set `amount_paid = totalAmt`, now it sets only the delivery charge for delivery-type orders.

### Bug #2: Manual payment lookup by `_id` instead of `orderId` UUID
**File:** `src/models/order/order.controllers.ts:415-421`

Changed the `ManualPayment` query from `{ _id: orderId }` to `{ $or: [{ orderId }, { _id: ... }] }` — now accepts either UUID (`order.orderId`) or Mongo `_id`. This resolves the `BSONError` when frontend sends `order._id`.

### Bug #3: `getOrderDetails` didn't check ownership (Security)
**File:** `src/models/order/order.controllers.ts:222-244`

Changed function signature from `Request` to `AuthRequest` and added ownership check: `if (order.userId.toString() !== req.userId) { 403 }`. Previously any authenticated user could read any order's details (name, email, address, payment info).

### Bug #4: `pay-due` delivery type marking order fully paid
**File:** `src/models/order/order.model.ts:163-166` (pre-save hook)

Fixed the pre-save hook so that when `payment_status === "paid"` and `payment_type === "delivery"`, it correctly sets `amount_paid = deliveryCharge` and `amount_due = totalAmt - deliveryCharge` instead of the full `totalAmt`.

### Bug #5: `createOrder` didn't handle `balance` payment
**File:** `src/models/order/order.controllers.ts:151-181`

Added balance deduction logic in `createOrder` when `payment_method === "balance"`:
- Checks user has sufficient balance
- Deducts `totalAmt` from balance
- Sets `payment_status = "paid"` and `order_status = "processing"`
- Clears cart immediately (since payment is instant)

### Cleanup: `clearUserCart` doesn't zero totals
**File:** `src/utils/cart.utils.ts:7-11`

Added `subTotalAmt: 0, totalAmt: 0` to the `$set` in `clearUserCart` — previously using `findOneAndUpdate` bypassed the model's pre-save hook, leaving stale totals in cleared carts.

---

## Curl Test Round 2 — 2026-06-03

### ✅ PASS — RBAC + Admin routes
- DS user → 403 `"Permission denied: Admins only"` on `/admin/all`
- Regular USER → 403 `"Permission denied: Admins only"` on `/admin/all`
- Admin → 200 with orders data
- Analytics routes (no auth → 401, USER → 403, Admin → 200)
- Admin payments routes (no auth → 401, USER → 403, Admin → 200)

### ✅ PASS — Manual payment full flow
1. `POST /orders/create` (full/manual) → `pending`, totalAmt=4580, amount_paid=4580
2. `POST /manual-payment` (bkash) → `submitted`, txn stored
3. `PUT /admin/orders/:id/verify` → `paid`, `processing`
4. `PUT /:id/status` `"delivered"` → profitGiven=True (+300), referralBonusGiven=False (admin referrer skipped)

### ✅ PASS — Delivery payment type
- `POST /orders/create` (delivery/manual) → amount_paid=80, amount_due=4500 ✅
- Admin verify → amount_paid=80, amount_due=4500 ✅

### ✅ PASS — Duplicate transaction rejection
- Same `transactionId` on different order → returns `"Order not found or payment already submitted."` ✅

### ✅ PASS — Balance payment (with fixes applied)
- Balance deducted correctly (5000 → 420 → after pay-due bug → 640 → re-added 10000 → 7000 → 5420)
- `POST /orders/manual` (balance/full) → paid instantly, cart cleared ✅

### ❌ FOUND & FIXED — Three bugs

#### Bug #6: `createOrder` balance check used totalAmt=0 (CRITICAL)
**File:** `src/models/order/order.controllers.ts:170-185`

**Symptom:** Balance check ran before `order.save()` triggered the pre-save hook, so `order.totalAmt` was still 0. The insufficient-balance check always passed, and `user.balance -= 0` deducted nothing.

**Fix:** Moved balance deduction BEFORE `order.save()`, manually calculating `totalAmt` using the same formula as the pre-save hook.

#### Bug #7: `getOrderDetails` ownership check compared populated userId with `toString()` (CRITICAL)
**File:** `src/models/order/order.controllers.ts:258`

**Symptom:** `order.userId` is populated as a Mongoose document. `order.userId.toString()` returns `[object Object]`, not the ObjectId string. Every ownership check failed — the owner themselves got 403.

**Fix:** Check `order.userId._id.toString()` when populated, fall back to `order.userId.toString()` for unpopulated references.

#### Bug #8: `payDueAmount` used `deliveryCharge` instead of `amount_due` (MEDIUM)
**File:** `src/models/order/order.controllers.ts:953-958`

**Symptom:** `amountToPay = order.deliveryCharge` (80) even when `amount_due` was 3000. User paid only the delivery fee again while the product cost remained unpaid.

**Fix:** Changed to `amountToPay = order.amount_due`. Also switches `payment_type` to `"full"` when the full remaining is paid via balance, so the pre-save hook correctly sets `amount_paid = totalAmt`.

#### Bug #9: Pre-save hook reset amounts for delivery-type paid orders (MEDIUM)
**File:** `src/models/order/order.model.ts:163-166`

**Symptom:** When `payment_status === "paid"` and `payment_type === "delivery"`, the pre-save hook always set `amount_paid = deliveryCharge`, even when the user had paid the full amount via pay-due. This made delivery-type orders never show as fully paid.

**Fix:** If existing `amount_paid >= totalAmt`, treat as fully paid: `amount_paid = totalAmt, amount_due = 0`. Otherwise use delivery-only logic.

---

## Security & Route Fixes — 2026-06-03

### Fix 10: Notification routes — added auth middleware
**File:** `src/models/notification/notification.routes.ts`

All 5 routes were fully public (no auth). Added:
- `POST /` → `isAuth, isAdmin`
- `GET /` → `isAuth`
- `PUT /:id/read` → `isAuth`
- `PUT /mark-all-read` → `isAuth`
- `DELETE /:id` → `isAuth, isAdmin`

### Fix 11: Cart routes — added ownership check (horizontal privilege escalation)
**File:** `src/models/cart/cartController.ts`

Routes accepting `userId` from URL params or body (`getCart`, `updateCartItem`, `removeFromCart`, `clearCart`) now verify `userId === req.userId`. Returns 403 "Not your cart" on mismatch.

### Fix 12: Category `GET /:id` — made public (auth inconsistency)
**File:** `src/models/category/category.routes.ts`

`GET /` (list all) was public, but `GET /:id` (get one) required `isAuth + isAdmin`. Changed `GET /:id` to public like the list endpoint.

### Fix 13: Order admin verify route path — fixed copy-paste error
**File:** `src/models/order/order.routes.ts`

Changed `PUT "/admin/orders/:id/verify"` → `PUT "/admin/:id/verify"` to match the pattern of all other admin routes in the file. The extra `/orders` segment was a copy-paste artifact.

### ⚠️ Remaining — Signup role escalation (known)
A regular user can sign up with `role: "ADMIN"` and become admin. `signup` controller at `user.controllers.ts:64` does not validate the role field.
