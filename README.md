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
