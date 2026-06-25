# Báo cáo Video: Chat Realtime (Socket.io)

Tài liệu chi tiết chuẩn bị cho video thuyết trình phần **Chat thời gian thực (Chat Socket)** giữa Khách hàng và Admin.

---

## 1. Định nghĩa & Điểm mạnh công nghệ

### A. Định nghĩa Chat Socket (WebSocket)
*   **Chat Socket (WebSocket):** Là một giao thức truyền tải dữ liệu hai chiều liên tục (full-duplex) trên một kết nối TCP duy nhất. Khác với giao thức HTTP truyền thống (Client gửi yêu cầu, Server mới phản hồi), WebSocket giữ cho kết nối giữa Client và Server luôn mở (Persistent Connection), cho phép cả hai bên chủ động gửi dữ liệu cho nhau bất kỳ lúc nào mà không tốn công thiết lập lại kết nối.

### B. Điểm mạnh công nghệ
*   **Realtime tức thời:** Nhận tin nhắn cực nhanh (<10ms) ngay khi đối phương nhấn gửi mà không cần tải lại trang (F5) hoặc chờ đợi kéo dữ liệu (polling).
*   **Tối ưu tài nguyên hệ thống:** Loại bỏ hoàn toàn cơ chế HTTP Polling (Client liên tục gửi request sau mỗi vài giây để check tin nhắn mới). Điều này giúp tiết kiệm băng thông mạng và giảm tải CPU cho máy chủ.
*   **Cơ chế Admin Room:** Tự động điều hướng và phát tín hiệu báo tin nhắn mới đến tất cả nhân viên trực page thông qua room chung (`io.to('admin')`) giúp các tư vấn viên nhận chuông báo và chấm đỏ realtime ngay lập tức.
