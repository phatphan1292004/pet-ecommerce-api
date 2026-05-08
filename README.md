# Pet E-commerce API

API backend cho hệ thống thương mại điện tử thú cưng, được xây dựng với Express.js và TypeScript.

## Cấu trúc dự án

```
pet-ecommerce-api/
├── src/
│   ├── app/
│   │   ├── caches/          # Cache logic
│   │   ├── config/          # Cấu hình ứng dụng
│   │   ├── database/        # Kết nối database, migrations
│   │   ├── entities/        # Database entities/models
│   │   ├── exceptions/      # Custom exceptions
│   │   ├── features/        # Business logic modules
│   │   ├── integrations/    # Third-party integrations
│   │   ├── logger/          # Logging utilities
│   │   └── middlewares/     # Express middlewares
│   ├── rakuapi/             # Custom API utilities
│   └── index.ts             # Main entry point
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── .env                     # Environment variables
├── .env.template            # Template for environment variables
├── .gitignore
├── package.json
└── tsconfig.json
```

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Copy file .env.template và điền thông tin
cp .env.template .env
```

## Scripts

```bash
# Development mode với hot reload
npm run dev

# Build project
npm run build

# Production mode
npm start
```

## Embedding

Project hiện lấy embedding từ Google AI Studio Gemini API và dùng cho content-based recommendation.

Thiết lập một trong các biến môi trường sau:
- `GEMINI_API_KEY`
- `GOOGLE_AI_STUDIO_API_KEY`

Nếu muốn đổi model embedding, set thêm `GEMINI_EMBEDDING_MODEL`.

## Content-Based Recommendation Flow

Luồng đang chạy theo hướng "user xem nhiều sản phẩm -> tạo profile vector -> dùng vector đó để tìm sản phẩm phù hợp".

1. Frontend gọi endpoint track khi user xem hoặc click sản phẩm.
2. Backend lưu activity vào `product_activities`.
3. Backend lấy embedding của sản phẩm vừa track và cập nhật dần vào `customers.profileEmbedding`.
4. Khi cần gợi ý, backend dùng `profileEmbedding` của customer để tính cosine similarity với embedding của các sản phẩm active.
5. Nếu customer chưa có profile vector đủ dữ liệu, backend fallback sang lịch sử activity gần nhất để build tạm profile vector.

### API đang dùng

- `POST /products/track`
- `GET /products/recommendations?customerId=...&limit=10&historyLimit=20`
- `GET /products/:slug?customerId=...` sẽ tự track view khi user mở trang chi tiết sản phẩm.

### Frontend sử dụng như nào

Khi user mở trang chi tiết hoặc click vào một sản phẩm:

```ts
await fetch('/products/track', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		customerId,
		productId,
		action: 'view',
	}),
});
```

Khi render khối "Sản phẩm gợi ý cho bạn":

```ts
const response = await fetch(
	`/products/recommendations?customerId=${customerId}&limit=10&historyLimit=20`
);
const result = await response.json();
```

Frontend chỉ cần gửi `customerId` ổn định của user đang đăng nhập. Nếu muốn gợi ý theo click mạnh hơn, truyền `action: 'click'`; còn mở chi tiết sản phẩm thì dùng `action: 'view'`.

## API Endpoints

### Health Check
- **GET** `/health` - Kiểm tra trạng thái server

## Công nghệ sử dụng

- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment
- **dotenv** - Environment variables management
- **cors** - CORS middleware

## Development

Project sử dụng TypeScript với strict mode và path aliases (`@/*` -> `src/*`).

Để thêm feature mới:
1. Tạo folder trong `src/app/features/`
2. Implement business logic
3. Tạo routes trong feature folder
4. Import và sử dụng trong `src/index.ts`

## License

ISC
