# Security Specification – Bella Menina Makeup

## 1. Data Invariants
1. All document IDs (`categoryId`, `productId`, `customerId`, `waitlistId`, `orderId`, `couponId`, `settingId`, `feedbackId`, `logId`, `adminId`) must satisfy `^[a-zA-Z0-9_-]+$` and length `<= 128`.
2. Catalog `categories`, `products`, `settings`, `coupons`, and `feedbacks` are strictly writable only by verified admins (`isAdmin()`).
3. `customers/{customerId}` isolates PII (`email`, `cpf`, `phone`, `addresses`) strictly to the owning verified user (`request.auth.uid == customerId`) or `isAdmin()`. Customers can never self-assign `role: 'admin'` or clear `blocked: true`. List queries on `customers` are strictly `isAdmin()` only.
4. `orders/{orderId}` isolates PII (`customerName`, `customerPhone`, `address`) to `isAdmin()` or the owning customer (`resource.data.customerId == request.auth.uid`). Non-admin order creation requires `status == 'pending'`, `origin in ['site', 'whatsapp']`, server `request.time`, and strict field allowlists.
5. `waitlist/{waitlistId}` entries enforce `customerId == request.auth.uid` and verify `exists()` on the referenced `/products/{productId}` parent document.
6. `adminLogs/{logId}` are append-only (`create` + `read` strictly `isAdmin()`, `update` and `delete` forbidden).
7. `createdAt` is immutable on all updates (`incoming().createdAt == existing().createdAt`).

## 2. "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on Product Create**: `{ ...validProduct, isFeaturedOverride: true }` -> Rejected by `hasOnly(...)`.
2. **Customer Self-Escalation to Admin**: `{ ...validCustomer, role: 'admin' }` -> Rejected by `incoming().role == 'customer'`.
3. **Blocked Customer Self-Unblock**: Customer updating `{ blocked: false }` on their own doc -> Rejected by `affectedKeys().hasOnly(...)` and `incoming().blocked == existing().blocked`.
4. **Cross-Customer PII Scrape**: Customer A calling `get` or `list` on Customer B's `/customers/{otherUid}` -> Rejected by `request.auth.uid == customerId || isAdmin()` and `allow list: if isAdmin();`.
5. **Orphaned Waitlist Entry**: Creating `/waitlist/{id}` with nonexistent `productId` -> Rejected by `exists(/databases/.../products/$(incoming().productId))`.
6. **Non-Admin Order List Scrape**: Unfiltered `list` on `/orders` by non-owner -> Rejected by `resource.data.customerId == request.auth.uid || isAdmin()`.
7. **Order Spoofing Initial Status (`status: 'delivered'`) by Customer** -> Rejected by `status == 'pending' || isAdmin()`.
8. **Client Timestamp Forgery on Order (`createdAt != request.time`)** -> Rejected by `createdAt == request.time`.
9. **Admin Self-Escalation (`/admins/attackerUid`)** -> Rejected by `allow read, write: if isAdmin();`.
10. **Admin Log Tampering (`update`/`delete` on `/adminLogs/{id}`)** -> Rejected by `allow update, delete: if false;`.
11. **Coupon Value Poisoning (`percent > 100`)** -> Rejected by `(type != 'percent' || value <= 100)`.
12. **Malicious Document ID (`../../etc/passwd`)** -> Rejected by `isValidId()`.
