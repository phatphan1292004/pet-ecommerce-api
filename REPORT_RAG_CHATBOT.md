# Báo cáo chuẩn bị Video: Trợ lý ảo RAG Chatbot

Tài liệu rút gọn chuẩn bị nhanh cho video thuyết trình phần **RAG Chatbot** trong dự án Pet E-commerce.

---

## 1. Định nghĩa ngắn gọn

*   **RAG (Retrieval-Augmented Generation):** Kỹ thuật kết hợp **Truy xuất dữ liệu (Retrieval)** từ cơ sở dữ liệu nội bộ và **Mô hình ngôn ngữ lớn (Generation - Google Gemini)** để trả lời câu hỏi.
*   **Tại sao cần?**
    *   Tránh **ảo tưởng thông tin (hallucination)** của AI về những quy định riêng của shop.
    *   Cung cấp câu trả lời thực tế (phí ship, chính sách đổi trả) kèm thẻ sản phẩm mua được ngay.
    *   Cập nhật dữ liệu thời gian thực mà không cần huấn luyện lại mô hình AI.

---

## 2. Luồng hoạt động (Workflow)

```
[Khách hỏi] ──► [Sinh Vector bằng Gemini Embedding]
                       │
                       ├─► [Vector Search DB] ──► Lấy bài viết chính sách
                       ├─► [Keyword Search DB] ──► Lấy sản phẩm liên quan
                       │
                       ▼
[Ghép vào Prompt cấu trúc nghiêm ngặt] ──► [Gửi Google Gemini LLM]
                                               │
                                               ▼
[Trả về UI] ◄── [Text câu trả lời + Thẻ card sản phẩm + Nguồn tham chiếu]
```

---

## 3. Mã nguồn cốt lõi

### A. Hàm điều phối chính ([ChatRagService.ts](file:///d:/Nam4/pet-ecommerce-api/src/app/features/authenticated/chat/ChatRagService.ts))
```typescript
async askQuestion(payload: RagQuestionPayload): Promise<RagAnswerResponse> {
  // 1. Lấy vector của câu hỏi người dùng
  const queryEmbedding = await getGoogleAiStudioEmbedding(question);

  // 2. Truy xuất song song Tri thức và Sản phẩm liên quan
  const [kbResults, productResults] = await Promise.all([
    this.searchKnowledgeBase(queryEmbedding, kbLimit), // Tìm bằng Vector Search
    this.getProductSuggestions(question, queryEmbedding, productLimit) // Tìm bằng Keyword / Vector Search
  ]);

  // 3. Ghép Prompt và gọi Gemini sinh câu trả lời
  const prompt = this.buildPrompt(question, kbResults, productResults);
  const answer = await generateGeminiResponse(prompt);

  return { answer, sources: kbResults, products: productResults };
}
```

### B. Luật Prompt nghiêm ngặt ([ChatPrompt.ts](file:///d:/Nam4/pet-ecommerce-api/src/app/features/authenticated/chat/ChatPrompt.ts))
Phân chia các kịch bản phản hồi để tối ưu giao diện:
*   **Trường hợp 1 (Có sản phẩm):**
    *   *Khách hỏi cụ thể sản phẩm:* AI chỉ trả về duy nhất câu: `"Hiện tại cửa hàng của chúng tôi đang có những mặt hàng sau."` (Cấm liệt kê tên/giá bằng chữ vì UI React sẽ tự vẽ thẻ sản phẩm riêng ở dưới).
    *   *Khách cần tư vấn triệu chứng:* Đưa ra lời khuyên ngắn, kèm câu dẫn giới thiệu sản phẩm bên dưới.
*   **Trường hợp 2 (Chỉ có tri thức chính sách):** Trả lời chính xác dựa theo tài liệu tri thức, không bịa đặt.
*   **Trường hợp 3 (Thiếu thông tin):** Trả lời bằng mẫu câu chăm sóc khách hàng lịch sự để hướng dẫn liên hệ hotline.

---

## 4. Kịch bản thuyết trình nhanh (1.5 phút)

1.  **Giới thiệu (15s):**
    *   *"Em xin báo cáo về phần trợ lý ảo thông minh RAG Chatbot. Hệ thống giúp chatbot trả lời chính xác thông tin nội bộ của shop và gợi ý sản phẩm ngay trong khung chat."*
2.  **Cơ chế hoạt động (30s):**
    *   *"Khi khách hàng hỏi, hệ thống tạo vector câu hỏi để truy xuất các bài viết chính sách bằng Vector Search trên MongoDB, kết hợp tìm kiếm sản phẩm. Toàn bộ thông tin này được làm ngữ cảnh đưa vào Prompt để Gemini trả lời chính xác, tránh ảo tưởng."*
3.  **Demo thực tế (45s):**
    *   *Thao tác:* Nhập câu hỏi chính sách: *"Shop giao hàng thế nào, bao lâu nhận được?"* $\rightarrow$ chatbot trả lời chính xác theo tài liệu tri thức. Nhập câu hỏi tư vấn: *"Mèo rụng lông dùng gì?"* $\rightarrow$ chatbot đưa ra lời khuyên và tự hiển thị danh sách thẻ sản phẩm sữa tắm mèo rụng lông ngay phía dưới.
4.  **Chỉ code cốt lõi (30s):**
    *   Mở file [ChatRagService.ts](file:///d:/Nam4/pet-ecommerce-api/src/app/features/authenticated/chat/ChatRagService.ts). Giải thích bước tạo embedding, truy xuất song song `Promise.all` và gửi prompt lên Gemini. Chỉ ra các luật phân loại phản hồi nghiêm ngặt trong [ChatPrompt.ts](file:///d:/Nam4/pet-ecommerce-api/src/app/features/authenticated/chat/ChatPrompt.ts).
