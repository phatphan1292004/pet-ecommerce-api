# Báo cáo Video: Hệ thống Gợi ý Sản phẩm (Product Recommendation)

Tài liệu chi tiết chuẩn bị cho video thuyết trình phần **Gợi ý sản phẩm cá nhân hóa**.

---

## 1. Định nghĩa & Điểm mạnh công nghệ

### A. Định nghĩa về Vector Embedding (Nhúng Vector)
*   **Vector Embedding (Nhúng Vector):** Là một kỹ thuật biểu diễn các thực thể dữ liệu phi cấu trúc phức tạp (như thông tin chi tiết một sản phẩm bao gồm tên, mô tả, danh mục, thương hiệu) thành một chuỗi các con số (gọi là vector số thực) có số chiều cố định (ở đây là **768 chiều**).
*   **Nguyên lý hoạt động:** Mô hình học sâu (Deep Learning) sẽ ánh xạ ngữ nghĩa của sản phẩm lên không gian đa chiều. Các sản phẩm có thuộc tính, công dụng tương tự nhau (ví dụ: *"Hạt khô cho chó con"* và *"Thức ăn hạt dinh dưỡng cho cún cưng"*) sẽ có tọa độ vector nằm gần nhau trong không gian này.
*   **Cosine Similarity (Độ tương đồng Cosine):** Công thức toán học dùng để tính góc giữa hai vector trong không gian đa chiều, cho ra kết quả từ 0 đến 1. Chỉ số này càng gần 1, hai sản phẩm càng giống nhau về mặt ngữ nghĩa và công dụng.
*   **Customer Profile Embedding (Vector sở thích khách hàng):** Là vector đại diện cho xu hướng mua sắm của khách. Nó được tính bằng trung bình cộng (có trọng số tùy thuộc hành vi view=1 hay click=2) của các vector sản phẩm mà khách hàng đã tương tác, sau đó được chuẩn hóa L2 về độ dài bằng 1 để làm chuẩn so khớp.

### B. Điểm mạnh công nghệ
*   **Cá nhân hóa theo thời gian thực:** Nhờ thuật toán trung bình động có trọng số, hồ sơ sở thích (`profileEmbedding`) của khách hàng được cập nhật liên tục ngay khi họ có hành vi tương tác mới, giúp hệ thống lập tức phản hồi và thay đổi sản phẩm gợi ý phù hợp nhất.
*   **Độ chính xác cao nhờ thuật toán lai (Hybrid Scoring):** Sự kết hợp hoàn hảo giữa so khớp ngữ nghĩa vector AI và quy tắc kinh doanh thực tế (cộng điểm thưởng +15% trùng danh mục phụ, +8% trùng loài thú cưng và tối đa +25% trùng tag) giúp tránh các gợi ý phi lý (như gợi ý đồ ăn mèo cho người nuôi chó).
*   **Tối ưu hiệu năng tìm kiếm:** Chỉ thực hiện so khớp trên 400 sản phẩm ứng viên tiềm năng (đã lọc bớt các loài thú cưng không khớp hoặc sản phẩm đã xem) để giảm thiểu chi phí tính toán Cosine Similarity trên CPU.
