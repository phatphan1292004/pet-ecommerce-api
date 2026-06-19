# Báo cáo chuẩn bị Video: Hệ thống Gợi ý Sản phẩm (Product Recommendation)

Tài liệu rút gọn chuẩn bị nhanh cho video thuyết trình phần **Gợi ý sản phẩm** trong dự án Pet E-commerce.

---

## 1. Định nghĩa ngắn gọn

*   **Hệ thống gợi ý sản phẩm:** Sử dụng thuật toán **Hybrid Content-Based Vector Search** (Tìm kiếm vector lai dựa trên nội dung).
*   **Cơ chế hoạt động:**
    1.  **Theo vết hành vi (User Activity):** Lưu lại hành động `view` (xem, trọng số = 1) và `click` (nhấp vào xem chi tiết, trọng số = 2) của người dùng.
    2.  **Hồ sơ sở thích khách hàng (Customer Profile Vector):** Tính trung bình động có trọng số của các vector sản phẩm đã tương tác để tạo thành Vector sở thích cá nhân (`customer.profileEmbedding`).
    3.  **Công thức chấm điểm đề xuất lai (Hybrid Scoring):**
        $$\text{Điểm đề xuất} = \text{CosineSimilarity} \times (1 + \text{Bonus})$$
        *   *Bonus trùng danh mục phụ (subcategory):* +15%
        *   *Bonus trùng nhãn gắn (tags):* +3% mỗi thẻ trùng (tối đa 25%)
        *   *Bonus trùng loài (chó/mèo):* +8%

---

## 2. Luồng hoạt động (Workflow)

```
[Khách hàng xem/click/mua sản phẩm] ──► [Lưu hoạt động (trọng số 1 hoặc 2 hoặc 4)]
                                             │
                                             ▼
[Tính trung bình vector & chuẩn hóa] ──► [Cập nhật Hồ sơ sở thích người dùng]
                                             │
                                             ▼
[Tính Cosine Similarity + Điểm thưởng Bonus] ──► [Gợi ý top sản phẩm phù hợp nhất]
```

---

## 3. Mã nguồn cốt lõi ([ProductService.ts](file:///d:/Nam4/pet-ecommerce-api/src/app/features/guest/product/ProductService.ts))

### A. Cập nhật Profile Embedding theo hành vi
```typescript
// Tính trung bình động có trọng số khi người dùng tương tác sản phẩm mới
for (let i = 0; i < nextLength; i += 1) {
  const currentValue = existingEmbedding[i] ?? 0;
  const incomingValue = embedding[i] ?? 0;
  combined[i] = ((currentValue * existingWeight) + (incomingValue * normalizedWeight)) / totalWeight;
}
customer.profileEmbedding = this.normalizeVector(combined); // Chuẩn hóa về độ dài 1
```

### B. Thuật toán chấm điểm lai kết hợp luật nghiệp vụ
```typescript
private scoreRecommendation(candidate, embedding, tags, subcategoryIds, species): number {
  // 1. Tính toán độ tương đồng Cosine cơ bản
  const baseScore = cosineSimilarity(embedding, candidate.embedding ?? []);
  if (baseScore <= 0) return 0;

  let bonus = 0;
  // 2. Cộng điểm thưởng theo các điều kiện nghiệp vụ
  if (trùngSubcategory) bonus += 0.15;
  if (trùngTags) bonus += Math.min(0.25, tagHits * 0.03);
  if (trùngLoàiThúCưng) bonus += 0.08;

  // 3. Nhân hệ số điểm thưởng
  return baseScore * (1 + bonus);
}
```

---

## 4. Kịch bản thuyết trình nhanh (1.5 phút)

1.  **Giới thiệu (15s):**
    *   *"Em xin báo cáo về phần Gợi ý sản phẩm thông minh. Hệ thống tự động cá nhân hóa sản phẩm dựa trên thuật toán so khớp vector và luật nghiệp vụ thực tế."*
2.  **Cơ chế hoạt động (30s):**
    *   *"Mỗi khi người dùng xem hoặc nhấp vào sản phẩm, hệ thống lưu hoạt động theo trọng số 1 hoặc 2 và cập nhật vector sở thích của khách hàng. Khi gợi ý, hệ thống tính độ tương đồng Cosine giữa vector sở thích này với các sản phẩm ứng viên, rồi cộng điểm thưởng bonus cho sản phẩm cùng danh mục, cùng tag hoặc cùng loài thú cưng."*
3.  **Demo thực tế (45s):**
    *   *Thao tác:* Vào tài khoản mới $\rightarrow$ phần gợi ý hiển thị sản phẩm mặc định. Bấm xem 2-3 gói hạt/pate cho mèo $\rightarrow$ F5 lại trang chủ $\rightarrow$ Chỉ ra danh sách gợi ý đã tự động chuyển đổi sang các loại hạt/pate cho mèo con.
4.  **Chỉ code cốt lõi (30s):**
    *   Mở file [ProductService.ts](file:///d:/Nam4/pet-ecommerce-api/src/app/features/guest/product/ProductService.ts). Giải thích nhanh cách cộng dồn vector sở thích và hàm chấm điểm `scoreRecommendation` với công thức `CosineSimilarity * (1 + Bonus)`.
