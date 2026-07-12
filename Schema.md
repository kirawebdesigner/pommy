# Data Schema

## Menu Product

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable unique identifier |
| `slug` | string | Stable route segment |
| `name` | string | Supplied public product name |
| `category` | string | Category ID |
| `description` | string | Supplied ingredients or empty string |
| `price` | number | Numeric ETB value |
| `image` | string | Temporary existing food asset reference |
| `featured` | boolean | Homepage/menu emphasis |
| `available` | boolean | Public availability flag |

## Cart Item

`productId`, `name`, `unitPrice`, `quantity`, `image`, `slug`.

## Prepared Order

`orderId`, `createdAt`, `customerName`, `phone`, `orderType`, `deliveryArea`, `address`, `landmark`, `notes`, `items`, `subtotal`, `paymentMethod`, `status`.

`paymentMethod` is `cash_on_delivery`; `status` is `prepared` for the local demo flow.

