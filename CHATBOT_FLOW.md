# Chatbot Flow (Frontend)

## API Endpoint

- POST /chat/rag
- Content-Type: application/json

## Request Body

```json
{
  "question": "Cho toi cac san pham thuc an cho meo",
  "limit": 5,
  "productLimit": 3,
  "includeProducts": true
}
```

- question: user input (required)
- limit: number of knowledge-base items to use (optional, default 6, max 20)
- productLimit: number of products to return (optional, default 6, max 12)
- includeProducts: whether to return products (optional, default true)

## Response Body

```json
{
  "success": true,
  "message": "RAG response generated successfully",
  "data": {
    "answer": "Hiện tại cửa hàng của chúng tôi đang có những mặt hàng sau.",
    "sources": [
      {
        "id": "...",
        "title": "Shipping policy",
        "source": "policy/shipping",
        "score": 0.42
      }
    ],
    "products": [
      {
        "id": "...",
        "name": "...",
        "slug": "...",
        "price": 135000,
        "originalPrice": 150000,
        "discount": 10,
        "review": 4.6,
        "image": "..."
      }
    ]
  }
}
```

## Frontend Flow

1) Send user question to /chat/rag.
2) Render data.answer as the bot message.
3) If data.products has items, render a product list/cards under the bot message.
4) If data.products is empty, show only the answer.
5) (Optional) Use data.sources for a "References" or "Policies" section.

## UI Rendering Rules

- Do not parse product names from answer.
- Always render products from data.products only.
- If data.products is empty, hide the product section.

## Notes

- The bot response is Vietnamese.
- Answer can be fixed when products exist; product list is the main payload.
- Product suggestions use keyword search on name/slug/description (no embedding).
