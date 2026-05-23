# Admin Statistics API

## Endpoint

- GET /admin/statistics

## Response

```json
{
  "success": true,
  "message": "Statistics fetched successfully",
  "data": {
    "revenue": {
      "today": 0,
      "month": 0,
      "year": 0,
      "series": {
        "last7Days": [{ "date": "2026-05-17", "revenue": 0, "orders": 0 }],
        "last30Days": [{ "date": "2026-04-24", "revenue": 0, "orders": 0 }],
        "last6Months": [{ "date": "2026-01", "revenue": 0, "orders": 0 }],
        "last12Months": [{ "date": "2025-06", "revenue": 0, "orders": 0 }]
      }
    },
    "orders": {
      "total": 0,
      "pending": 0,
      "delivering": 0,
      "delivered": 0,
      "cancelled": 0,
      "cancellationRate": 0
    },
    "products": {
      "topSelling": [
        { "id": "...", "name": "...", "slug": "...", "image": "...", "quantity": 10, "revenue": 100000 }
      ],
      "topRevenue": [
        { "id": "...", "name": "...", "slug": "...", "image": "...", "quantity": 5, "revenue": 200000 }
      ],
      "lowStock": [
        { "id": "...", "name": "...", "slug": "...", "image": "...", "stock": 3 }
      ],
      "highStock": [
        { "id": "...", "name": "...", "slug": "...", "image": "...", "stock": 150 }
      ],
      "lowSelling": [
        { "id": "...", "name": "...", "slug": "...", "image": "...", "quantity": 0, "revenue": 0 }
      ]
    },
    "customers": {
      "total": 0,
      "newToday": 0,
      "newThisMonth": 0,
      "newThisYear": 0,
      "returning": 0,
      "topSpenders": [
        { "id": "...", "name": "...", "totalSpent": 200000, "orders": 3 }
      ],
      "newCustomersSeriesLast30Days": [
        { "date": "2026-05-17", "revenue": 2, "orders": 0 }
      ]
    }
  }
}
```

## Notes for Frontend

- Timezone: Vietnam (UTC+7).
- Revenue uses orders with `status = delivered` and sums `cart.finalPrice`.
- Cancellation rate uses statuses: `cancelled`, `canceled`, `failed`.
- Stock rules:
  - Low stock: `stock <= 5`.
  - High stock: `stock >= 100`.
- Low selling products are based on delivered orders in the last 30 days.
- "Returning" customers are those with `>= 2` orders (any status).
- `newCustomersSeriesLast30Days[].revenue` represents the count of new customers per day.
