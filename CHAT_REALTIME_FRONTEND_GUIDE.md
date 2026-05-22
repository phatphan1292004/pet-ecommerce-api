# Chat Realtime Frontend Guide

Tai lieu nay huong dan frontend tich hop chat realtime voi backend (`Express + Socket.IO + MongoDB`) theo dung flow:

1. Mo man hinh chat
2. Goi REST API de lay lich su
3. Ket noi socket
4. Join room conversation
5. Gui tin nhan qua socket
6. Server luu DB + broadcast
7. UI cap nhat ngay

## 1) Yeu cau

- Frontend can cai `socket.io-client`
- Co `conversationId` cho moi box chat
- Co thong tin nguoi gui: `senderId`, `senderName`
- Neu gui anh: can co `imageUrl`

```bash
npm i socket.io-client
```

## 2) REST API (load history)

### GET danh sach conversation (de hien list o admin)

- Endpoint: `GET /chat/conversations?limit=50`

Response mau:

```json
{
  "success": true,
  "message": "Conversations fetched successfully",
  "data": [
    {
      "conversationId": "conv_123",
      "lastMessage": "Hello",
      "lastMessageType": "text",
      "lastImageUrl": null,
      "lastMessageAt": "2026-05-21T09:10:20.000Z",
      "lastSenderId": "user_1",
      "lastSenderName": "Nam",
      "unreadCount": 2
    }
  ]
}
```

### GET messages theo conversation

- Endpoint: `GET /chat/conversations/:conversationId/messages?limit=50`
- Muc dich: lay lich su tin nhan luc vao chat

Response mau:

```json
{
  "success": true,
  "message": "Messages fetched successfully",
  "data": [
    {
      "_id": "682d96fbf7fa0f1453072fc1",
      "conversationId": "conv_123",
      "senderId": "user_1",
      "senderName": "Nam",
      "message": "Xin chao",
      "messageType": "text",
      "imageUrl": null,
      "isRead": false,
      "createdAt": "2026-05-21T09:10:20.000Z",
      "updatedAt": "2026-05-21T09:10:20.000Z"
    }
  ]
}
```

Giai thich them:

- `messageType`: `text` | `image`
- `imageUrl`: URL anh neu `messageType = image`
- `isRead`: tin nhan da duoc ben con lai doc hay chua

## 3) Socket events

### Client -> Server

- `join_conversation`

```json
{ "conversationId": "conv_123" }
```

- `send_message`

```json
{
  "conversationId": "conv_123",
  "senderId": "user_1",
  "senderName": "Nam",
  "message": "Hello realtime",
  "messageType": "text",
  "imageUrl": null,
  "isRead": false
}
```

Neu gui anh:

```json
{
  "conversationId": "conv_123",
  "senderId": "user_1",
  "senderName": "Nam",
  "messageType": "image",
  "imageUrl": "https://cdn.example.com/chat/abc.jpg"
}
```

### Server -> Client

- `joined_conversation`
- `new_message`
- `chat_error`

## 4) React/Next.js sample (de xai ngay)

```tsx
import { useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

type ChatMessage = {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string | null;
  message: string;
  messageType: "text" | "image";
  imageUrl: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export default function ChatBox({
  conversationId,
  currentUserId,
  currentUserName,
}: {
  conversationId: string;
  currentUserId: string;
  currentUserName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  const socket: Socket = useMemo(
    () =>
      io(API_BASE_URL, {
        transports: ["websocket"],
        autoConnect: true,
      }),
    []
  );

  // 1) load history
  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch(
        `${API_BASE_URL}/chat/conversations/${conversationId}/messages?limit=50`
      );
      const json = await res.json();
      if (mounted && json?.success) setMessages(json.data || []);
    })();
    return () => {
      mounted = false;
    };
  }, [conversationId]);

  // 2) connect socket + join room + listen
  useEffect(() => {
    socket.emit("join_conversation", { conversationId });

    const onNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    const onChatError = (err: { message: string }) => {
      console.error("chat_error:", err.message);
    };

    socket.on("new_message", onNewMessage);
    socket.on("chat_error", onChatError);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("chat_error", onChatError);
    };
  }, [socket, conversationId]);

  // 3) send message via socket
  const sendMessage = () => {
    const message = text.trim();
    if (!message) return;

    socket.emit("send_message", {
      conversationId,
      senderId: currentUserId,
      senderName: currentUserName,
      message,
      messageType: "text",
    });

    setText("");
  };

  return (
    <div>
      <div style={{ height: 300, overflowY: "auto", border: "1px solid #ddd", padding: 12 }}>
        {messages.map((m) => (
          <p key={m._id}>
            <b>{m.senderName || m.senderId}:</b>{" "}
            {m.messageType === "image" ? (
              <img src={m.imageUrl || ""} alt="chat" style={{ maxWidth: 200, display: "block" }} />
            ) : (
              m.message
            )}
            {m.senderId === currentUserId ? (
              <span style={{ marginLeft: 8, fontSize: 12, color: "#777" }}>
                {m.isRead ? "da doc" : "chua doc"}
              </span>
            ) : null}
          </p>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhap tin nhan..." />
        <button onClick={sendMessage}>Gui</button>
      </div>
    </div>
  );
}
```

## 5) Best practices nen ap dung

- Join room moi khi `conversationId` thay doi
- Debounce hoac disable nut gui neu text rong
- Scroll xuong cuoi khi co `new_message`
- Hien trang thai reconnect (`socket.connected`)
- Handle `chat_error` de thong bao nguoi dung
- Khi current user la nguoi gui, dung `isRead` de hien trang thai ben con lai da doc hay chua
- Neu la nhan vien (admin), `isRead` van duoc hieu la ben con lai (user) da doc

## 6) Optional fallback (khong bat buoc)

Neu muon gui tin nhan qua REST (du phong), co endpoint:

- `POST /chat/messages`

Body:

```json
{
  "conversationId": "conv_123",
  "senderId": "user_1",
  "senderName": "Nam",
  "message": "Tin nhan tu REST",
  "messageType": "text",
  "imageUrl": null
}
```

Khuyen nghi van dung socket la luong chinh de UX realtime tot nhat.
