# How to Update Product Tags in Postman

## Overview
Product tags can only be `"hot"` or `"cold"` (lowercase). This guide shows you how to update them using Postman.

---

## 1. Update Product Tags (PUT Request)

### Endpoint
```
PUT {{baseUrl}}/products/update-product-details
```

### Headers
```
Content-Type: application/json
```

### Authentication
- Make sure you're logged in as an **Admin**
- Include credentials (cookies should be sent automatically if you logged in via Postman)

### Request Body (JSON)

#### Example 1: Add "hot" tag
```json
{
  "_id": "YOUR_PRODUCT_ID_HERE",
  "tags": ["hot"]
}
```

#### Example 2: Add "cold" tag
```json
{
  "_id": "YOUR_PRODUCT_ID_HERE",
  "tags": ["cold"]
}
```

#### Example 3: Add both tags
```json
{
  "_id": "YOUR_PRODUCT_ID_HERE",
  "tags": ["hot", "cold"]
}
```

#### Example 4: Remove all tags
```json
{
  "_id": "YOUR_PRODUCT_ID_HERE",
  "tags": []
}
```

#### Example 5: Update multiple fields including tags
```json
{
  "_id": "YOUR_PRODUCT_ID_HERE",
  "productName": "Updated Product Name",
  "price": 1500,
  "tags": ["hot"],
  "discount": 15
}
```

---

## 2. Create Product with Tags (POST Request)

### Endpoint
```
POST {{baseUrl}}/products/create
```

### Headers
```
Content-Type: multipart/form-data
```

### Authentication
- Must be logged in as **Admin**

### Form Data

| Key | Type | Value | Required |
|-----|------|-------|----------|
| productName | text | "Sample Product" | ✅ Yes |
| description | text | "Product description" | ✅ Yes |
| category | text | "CATEGORY_ID_HERE" | ✅ Yes |
| subCategory | text | "SUBCATEGORY_ID_HERE" | No |
| price | text | "1000" | ✅ Yes |
| productStock | text | "50" | ✅ Yes |
| brand | text | "Brand Name" | No |
| tags | text | "hot" | No |
| tags | text | "cold" | No |
| discount | text | "10" | No |
| ratings | text | "5" | No |
| featured | text | "true" | No |
| images | file | (select image file) | No |

**Note:** For tags in form-data, add multiple rows with the same key "tags" for each tag value.

---

## 3. Get Product to Verify Tags

### Endpoint
```
POST {{baseUrl}}/products/get
```

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "page": 1,
  "limit": 10
}
```

### Response Example
```json
{
  "message": "Product data retrieved successfully",
  "error": false,
  "success": true,
  "data": [
    {
      "_id": "65abc123...",
      "productName": "Sample Product",
      "tags": ["hot"],
      "price": 1000,
      ...
    }
  ]
}
```

---

## 4. Common Errors and Solutions

### Error: "SKU must be unique"
**Solution:** The SKU is auto-generated. This shouldn't happen unless you're manually setting it.

### Error: "Provide product _id"
**Solution:** Make sure you include the `_id` field in your update request body.

### Error: Tags not showing up
**Solution:** 
1. Verify tags are lowercase: `"hot"` or `"cold"` (not "Hot" or "COLD")
2. Ensure tags is an array: `["hot"]` not `"hot"`
3. Check the response to confirm the update was successful

### Error: "Unauthorized" or "Admin access required"
**Solution:** 
1. Log in as an admin first
2. Make sure cookies are being sent with the request
3. Check that your admin token hasn't expired

---

## 5. Quick Test Workflow

1. **Login as Admin**
   ```
   POST {{baseUrl}}/auth/login
   Body: { "email": "admin@example.com", "password": "yourpassword" }
   ```

2. **Get a Product ID**
   ```
   POST {{baseUrl}}/products/get
   Body: { "page": 1, "limit": 1 }
   ```
   Copy the `_id` from the response.

3. **Update Tags**
   ```
   PUT {{baseUrl}}/products/update-product-details
   Body: { "_id": "COPIED_ID", "tags": ["hot"] }
   ```

4. **Verify Update**
   ```
   POST {{baseUrl}}/products/get-product-details/COPIED_ID
   ```
   Check that `tags` array contains `["hot"]`.

---

## 6. Environment Variables (Optional)

Set these in your Postman environment for easier testing:

```
baseUrl: http://localhost:5000/api
productId: 65abc123... (your test product ID)
```

Then use them in requests:
```
PUT {{baseUrl}}/products/update-product-details
Body: { "_id": "{{productId}}", "tags": ["hot"] }
```

---

## Notes
- Tags are **case-sensitive** - use lowercase only
- Valid values: `"hot"`, `"cold"`
- Tags is always an **array**, even for a single tag
- The backend will automatically normalize tags to ensure they're in array format
