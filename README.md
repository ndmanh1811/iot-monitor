# Hệ thống IoT Giám sát Cảm biến & Điều khiển Thiết bị (IoT Monitor)

Dự án ứng dụng Web thời gian thực kết nối vi điều khiển ESP8266 qua giao thức **MQTT**, quản lý cơ sở dữ liệu **MySQL**, điều phối dữ liệu qua **Node.js (Express + WebSocket)** và giao diện hiển thị **Frontend (HTML5, TailwindCSS, ApexCharts)**.

---

## 🌟 Tính năng chính

1. **Giám sát thời gian thực (Realtime Dashboard):**
   - Đọc dữ liệu Nhiệt độ (°C), Độ ẩm (%) và Ánh sáng (Lux) từ ESP8266 gửi lên theo chu kỳ 2 giây.
   - Biểu đồ sóng uốn lượn đa trục (ApexCharts) hiển thị 8 mốc thời gian thực cố định, loại bỏ hoàn toàn đứt đoạn và không bị số liệu ảo khi kết nối lại.
   - Bộ lọc linh hoạt cho phép xem từng thông số riêng lẻ hoặc tất cả cùng lúc.

2. **Điều khiển thiết bị ngoại vi (Device Control):**
   - Điều khiển bật/tắt 3 thiết bị: Đèn LED, Quạt thông gió, Máy điều hòa.
   - Cơ chế máy trạng thái (FSM): Gửi lệnh điều khiển (`PENDING`) qua MQTT tới ESP8266, nhận phản hồi thực tế để xác nhận trạng thái (`SUCCESS` / `FAILED`).
   - Tự động đồng bộ trạng thái switch khi tải lại trang, khử hiện tượng giật nút toggle.

3. **Bảng dữ liệu cảm biến & Lịch sử thao tác:**
   - Tra cứu, tìm kiếm toán học (`>`, `<`, `>=`, `<=`), lọc theo khoảng giá trị hoặc ngày giờ linh hoạt.
   - Sắp xếp đa chiều (giảm dần, tăng dần, mặc định) và phân trang thu gọn thông minh.
   - Đồng bộ thời gian thực qua WebSocket mà không bị reset trang đang xem.

4. **Xử lý mất kết nối tự động (Smart Offline Handling):**
   - Tự động phát hiện khi ESP8266 hoặc MQTT Broker mất kết nối quá thời gian quy định (watchdog 4.5s).
   - Làm mờ nhẹ biểu đồ, khóa tương tác và hiển thị lớp phủ xoay loading `"Đang kết nối lại..."` tối giản.
   - Khi kết nối lại thành công, hệ thống tự động khôi phục độ nét và nạp dữ liệu sạch vào biểu đồ.

---

## 📁 Cấu trúc thư mục

```text
├── database/
│   └── init_database.sql        # Kịch bản khởi tạo bảng & dữ liệu mẫu MySQL
├── frontend/
│   ├── tongquan.html            # Trang Tổng quan & Biểu đồ Realtime
│   ├── dulieucambien.html       # Trang Bảng tra cứu dữ liệu cảm biến
│   ├── lichsuthietbi.html       # Trang Lịch sử thao tác bật/tắt thiết bị
│   ├── hosocanhan.html          # Trang Quản lý hồ sơ & liên kết cá nhân
│   ├── index.html               # Điều hướng mặc định tới tongquan.html
│   └── js/
│       ├── apexcharts.min.js    # Thư viện biểu đồ
│       ├── api.js               # Quản lý gọi API RESTful & WebSocket
│       ├── colors.js            # Hệ thống mã màu tập trung
│       ├── dashboard.js         # Logic biểu đồ & điều khiển thiết bị
│       ├── history.js           # Logic bảng lịch sử thiết bị
│       ├── profile.js           # Logic hồ sơ cá nhân
│       └── sensor-data.js       # Logic bảng dữ liệu cảm biến
├── src/
│   ├── config/                  # Kết nối Database (MySQL), MQTT Client, WebSocket Server
│   ├── controllers/             # Điều hướng request & response
│   ├── middlewares/             # Xác thực, xử lý lỗi tập trung
│   ├── routes/                  # Định tuyến các RESTful API endpoints (/api/v1/...)
│   ├── services/                # Nghiệp vụ CSDL, logic xử lý mốc thời gian biểu đồ
│   ├── utils/                   # Định dạng thời gian, chuẩn hóa phản hồi API
│   └── app.js                   # Cấu hình Express app & nạp routes
├── .env.example                 # Mẫu cấu hình biến môi trường
├── .gitignore                   # Loại trừ file rác, file bảo mật, tài liệu đề tài
├── package.json                 # Khai báo dependencies của dự án Node.js
└── server.js                    # File khởi động chính của Backend Server
```

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Khởi tạo Cơ sở dữ liệu (MySQL)
- Đảm bảo MySQL đang chạy (ví dụ qua XAMPP hoặc MySQL Server cục bộ tại port 3306).
- Mở MySQL Workbench hoặc phpMyAdmin, chạy toàn bộ file:
  ```sql
  database/init_database.sql
  ```

### 2. Cài đặt Backend
1. Cài đặt các thư viện Node.js:
   ```bash
   npm install
   ```
2. Tạo file cấu hình `.env` dựa trên `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Điền mật khẩu MySQL (`DB_PASSWORD`) và thông tin Broker MQTT nếu có.*

3. Khởi động máy chủ:
   ```bash
   node server.js
   # hoặc: npm start
   ```
   *Máy chủ sẽ lắng nghe tại `http://localhost:5000`.*

### 3. Mở giao diện Frontend
- Mở tệp `frontend/tongquan.html` trực tiếp trên trình duyệt hoặc chạy qua tiện ích **Live Server** (VS Code / WebStorm).
