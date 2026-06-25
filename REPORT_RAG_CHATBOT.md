# Báo cáo Video: Trợ lý ảo RAG Chatbot

Tài liệu chi tiết chuẩn bị cho video thuyết trình phần **Trợ lý ảo RAG Chatbot** kết hợp cơ sở tri thức nội bộ và mô hình Google Gemini.

---

## 1. Định nghĩa & Phương pháp RAG
*   **RAG (Retrieval-Augmented Generation - Tạo lập tăng cường truy xuất):** Kỹ thuật tối ưu hóa câu trả lời của mô hình ngôn ngữ lớn (LLM - Google Gemini) bằng cách ép nó tham chiếu thông tin từ một cơ sở tri thức bên ngoài đáng tin cậy trước khi tạo ra câu trả lời cho khách hàng.
    *   *Giai đoạn 1: Truy xuất (Retrieval):* Khi khách hỏi, hệ thống chuyển câu hỏi thành Vector Embedding và thực hiện tìm kiếm tương đồng trên cơ sở tri thức MongoDB để lấy ra tài liệu liên quan nhất.
    *   *Giai đoạn 2: Tạo câu trả lời (Generation):* Hệ thống kết hợp câu hỏi ban đầu và nội dung tài liệu vừa tìm được thành một Prompt ngữ cảnh đầy đủ, gửi lên Google Gemini để sinh câu trả lời chính xác và tự nhiên.
*   **Khái niệm Vector Embedding & Vector Search (Thành phần cốt lõi của RAG):**
    *   *Vector Embedding là gì?* Là quá trình chuyển đổi câu chữ phi cấu trúc (ví dụ: câu hỏi *"Mèo rụng lông thì tắm bằng gì?"*) thành một chuỗi các con số thực (vector) có số chiều cố định (ở đây là **768 chiều**). Chuỗi số này đại diện cho "tọa độ ý nghĩa ngữ nghĩa" của câu văn trong không gian toán học đa chiều. Hai câu văn có từ ngữ khác nhau nhưng cùng ý nghĩa (ví dụ: *"phí ship bao nhiêu"* và *"phí giao hàng thế nào"*) sẽ có các vector nằm rất gần nhau.
    *   *Ứng dụng trong tìm kiếm:* Hệ thống tính toán độ gần nhau giữa vector câu hỏi và vector tài liệu tri thức bằng công thức tương đồng Cosine (Cosine Similarity). Nhờ đó, chatbot có thể hiểu được ý định thực sự của khách hàng mà không bị phụ thuộc vào việc trùng khớp từ khóa chính xác từng ký tự (Keyword Matching).
*   **Điểm mạnh:**
    *   Tránh **ảo tưởng thông tin (hallucination)** của AI về những quy định riêng của shop: Bằng cách giới hạn phạm vi trả lời của Gemini chỉ được dựa trên [KNOWLEDGE BASE CONTEXT] được cung cấp. Nếu dữ liệu thiếu, AI sẽ dùng mẫu câu chăm sóc khách hàng lịch sự thay vì tự bịa ra thông tin sai lệch về shop.
    *   Cung cấp câu trả lời thực tế (phí ship, chính sách đổi trả) kèm thẻ sản phẩm mua được ngay: Hệ thống thực hiện truy xuất song song thông tin chính sách và danh sách sản phẩm liên quan. React Frontend sẽ bắt lấy dữ liệu này để tự động kết xuất thành các thẻ card sản phẩm trực quan sinh động bên dưới câu trả lời văn bản của AI.
    *   Cập nhật dữ liệu thời gian thực mà không cần huấn luyện lại mô hình AI: Khi cửa hàng thay đổi chính sách giao hàng hoặc có thêm sản phẩm mới, nhân viên chỉ cần cập nhật dữ liệu và sinh vector embedding lưu vào MongoDB. Chatbot sẽ lập tức truy xuất được thông tin mới mà không tốn chi phí huấn luyện lại (re-train) mô hình AI.
