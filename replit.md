# Zalo Bot Tool - Bot Trả Lời Tự Động

## Tổng Quan
Đây là bot tự động trả lời tin nhắn Zalo cho tài khoản cá nhân. Bot sử dụng thư viện `zca-js` để mô phỏng trình duyệt tương tác với Zalo Web.

## Tính Năng
- 🤖 Tự động trả lời tin nhắn cá nhân dựa trên từ khóa
- 🚫 Bỏ qua tin nhắn nhóm (chỉ xử lý tin nhắn 1-1)
- 📝 Ghi log tất cả tin nhắn
- ⏱️ Delay trả lời có thể tùy chỉnh
- 📌 Tự động đánh dấu chưa đọc sau khi trả lời
- 🔧 Cấu hình từ khóa linh hoạt qua file JSON

## Cấu Trúc Dự Án
```
├── bot.js                 # File chính chạy bot
├── config/
│   └── keywords.json      # Cấu hình từ khóa và câu trả lời
├── package.json           # Quản lý dependencies
└── README                 # Hướng dẫn cơ bản
```

## Cách Sử Dụng
1. Bot sẽ hiển thị QR code để đăng nhập
2. Quét QR code bằng app Zalo trên điện thoại
3. Sau khi đăng nhập thành công, bot sẽ tự động lắng nghe tin nhắn
4. Bot chỉ trả lời tin nhắn **CÁ NHÂN**, bỏ qua tin nhắn nhóm

## Cấu Hình Từ Khóa
Chỉnh sửa file `config/keywords.json` để thêm/sửa từ khóa:
- `keyword`: Từ khóa cần tìm
- `reply`: Câu trả lời tự động
- `exactMatch`: true = khớp chính xác, false = chứa từ khóa

## Cảnh Báo
⚠️ Sử dụng bot này có thể khiến tài khoản Zalo bị khóa hoặc cấm. Sử dụng với trách nhiệm của riêng bạn.

## Công Nghệ
- **Runtime**: Node.js
- **Thư viện chính**: zca-js v2.0.0
- **Xử lý ảnh**: sharp v0.32.6

## Ngày Nhập Dự Án
08/10/2025
