# Báo cáo chuẩn bị Video: Chat Realtime (Socket.io)

Tài liệu rút gọn chuẩn bị nhanh cho video thuyết trình phần **Chat thời gian thực (Chat Socket)** giữa Khách hàng và Admin.

---

## 1. Định nghĩa ngắn gọn

*   **Chat Socket (WebSocket):** Giao thức kết nối 2 chiều liên tục (Persistent) giữa Client và Server.
*   **Điểm mạnh:** 
    *   **Realtime tức thời:** Nhận tin nhắn trong <10ms ngay khi đối phương bấm gửi (không cần tải lại trang/F5).
    *   **Tối ưu tài nguyên:** Không cần Polling (gửi HTTP liên tục để kiểm tra tin nhắn mới).
    *   **Admin Room:** Tự động phát tín hiệu báo tin nhắn mới đến nhân viên trực page (`io.to('admin')`).

---

## 2. Luồng hoạt động (Workflow)

```
[Khách hàng]  ──(join_conversation)──► [Socket Server] ◄──(join_conversation)── [Admin]
     │                                     │                                     │
     ├───► emit('send_message') ───────────┤                                     │
     │     (Tin nhắn lưu vào MongoDB)      │                                     │
     │                                     ├───► emit('new_message') ───────────►│ (Hiện tin nhắn)
     │                                     └───► emit('new_message_admin') ─────►│ (Chuông báo)
```

---

## 3. Mã nguồn cốt lõi

### Backend ([chatSocket.ts](file:///d:/Nam4/pet-ecommerce-api/src/app/socket/chatSocket.ts))
Xử lý sự kiện đăng ký phòng và phân phối tin nhắn:

```typescript
// 1. Client join vào phòng chat riêng theo conversationId
socket.on('join_conversation', (payload) => {
  socket.join(payload.conversationId);
});

// 2. Nhận tin nhắn, lưu vào DB và phát sóng ngay lập tức
socket.on('send_message', async (payload) => {
  const savedMessage = await chatService.createMessage(payload);
  
  // Phát tới tất cả client trong phòng chat này
  io.to(payload.conversationId).emit('new_message', savedMessage);
  
  // Thông báo tới phòng chung của các Admin
  io.to('admin').emit('new_message_admin', savedMessage);
});
```

### Frontend (React/Next.js)
Đăng ký lắng nghe và giải phóng bộ nhớ để tránh rò rỉ kết nối:

```typescript
useEffect(() => {
  socket.emit("join_conversation", { conversationId });

  // Nhận tin nhắn mới từ Server và thêm vào giao diện
  const onNewMessage = (msg) => setMessages((prev) => [...prev, msg]);
  socket.on("new_message", onNewMessage);

  // Dọn dẹp listener khi đóng box chat hoặc đổi cuộc trò chuyện (Hết sức quan trọng)
  return () => {
    socket.off("new_message", onNewMessage);
  };
}, [conversationId]);
```

---

## 4. Kịch bản thuyết trình nhanh (1.5 phút)

1.  **Giới thiệu (15s):**
    *   *"Em xin báo cáo về phần Chat Realtime. Tính năng này được xây dựng trên thư viện Socket.io bằng giao thức WebSocket để phản hồi tin nhắn khách hàng tức thời."*
2.  **Cơ chế hoạt động (30s):**
    *   *"Khi mở hộp chat, Client gửi sự kiện `join_conversation` để Server đưa vào một Room riêng. Khi có tin nhắn mới qua sự kiện `send_message`, Backend sẽ lưu vào MongoDB rồi phát sóng ngay tới Room đó và báo hiệu cho các tài khoản Admin trong Room `admin`."*
3.  **Demo thực tế (45s):**
    *   *Thao tác:* Mở 2 cửa sổ song song (Trái là Khách, Phải là Admin). Nhắn tin qua lại để chỉ ra tin nhắn hiện lên ngay lập tức mà không cần F5. Đồng thời chỉ ra chuông báo tin nhắn mới phía Admin.
4.  **Chỉ code cốt lõi (30s):**
    *   Mở file [chatSocket.ts](file:///d:/Nam4/pet-ecommerce-api/src/app/socket/chatSocket.ts). Giải thích hàm `socket.join` và lệnh `io.to().emit()` để phát tán tin nhắn realtime.
