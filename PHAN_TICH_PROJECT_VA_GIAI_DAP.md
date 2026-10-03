

# PHẦN 1: PHÂN TÍCH TOÀN DIỆN DỰ ÁN BTL_IOT

## 1. Tổng quan hệ thống
Hệ thống cho phép **giám sát trực tiếp 3 chỉ số môi trường** (nhiệt độ, độ ẩm, ánh sáng) từ cảm biến vật lý (ESP32 + DHT11 + LDR), trực quan hóa dữ liệu trên **bảng điều khiển realtime (biểu đồ kép 2 trục Y)**, đồng thời **điều khiển bật/tắt 2 đèn LED** qua giao thức **MQTT** kết hợp cơ chế phản hồi trạng thái thật và chống kẹt lệnh (timeout).

---
## 2. Kiến trúc tổng thể & 3 Luồng dữ liệu cốt lõi

```
┌───────────────────────────┐                      ┌──────────────────────────┐
│      ESP32 DevKit         │   sensor_data (JSON) │     Mosquitto Broker     │
│   DHT11 + LDR + 2x LED    │ ───────────────────► │       (Port: 8386)       │
│  (Chu kỳ gửi mẫu: 2s)    │ ◄─────────────────── │                          │
└─────────────┬─────────────┘    device_control    └────────────┬─────────────┘
              │                  device_response                │
              │                                                 ▼
              │                                    ┌──────────────────────────┐
              │                                    │     Node.js Backend      │
              │                                    │  Express + mysql2 + mqtt │
              │                                    │  (http://localhost:3000) │
              │                                    └────────────┬─────────────┘
              │                                                 │ REST API (/api)
              │                                                 ▼
              │                                    ┌──────────────────────────┐
              │                                    │      React Frontend      │
              │                                    │   Vite + Recharts + CSS  │
              │                                    │  (http://localhost:5173) │
              └────────────────────────────────────┴──────────────────────────┘
```

### 3 Luồng dữ liệu quan trọng:
1. **Luồng thu thập cảm biến (Sensor Ingestion):**
   * ESP32 định kỳ **2 giây/lần** đọc nhiệt độ, độ ẩm (DHT11) và ánh sáng (LDR) $\rightarrow$ đóng gói JSON:
     ```json
     {"device_id": "B23DCCN587", "temp": 29.5, "humi": 58.8, "light": 2700}
     ```
   * ESP32 publish lên topic `sensor_data` $\rightarrow$ Backend nhận qua MQTT callback $\rightarrow$ gọi `sensorController.saveSensorSample` tách thành 3 bản ghi insert vào bảng `datasensors` trong MySQL.
2. **Luồng điều khiển thiết bị (Device Control & Feedback):**
   * Người dùng nhấn công tắc trên Web $\rightarrow$ Frontend gửi `POST /api/device/action` `{ device_id: "LED_1", action: "ON" }`.
   * Backend ghi 1 dòng trạng thái `loading` vào bảng `action` $\rightarrow$ publish JSON `{ "room_id": "room1", "led1": "on" }` lên topic `device_control`.
   * ESP32 nhận lệnh $\rightarrow$ kích hoạt chân GPIO $\rightarrow$ publish xác nhận trạng thái thật lên topic `device_response` `{ "led1": "ON" }`.
   * Backend bắt `device_response` $\rightarrow$ ghi thêm 1 dòng trạng thái thật `ON` (hoặc `OFF`) vào bảng `action`.
3. **Luồng Timeout (Chống kẹt lệnh khi mất mạng/hỏng thiết bị):**
   * Nếu ESP32 mất kết nối hoặc không phản hồi sau **5 giây** (`ACTION_TIMEOUT_MS = 5000`), Backend tự động hủy timer và ghi bản ghi `FAILED` vào bảng `action`.
   * Frontend thông qua cơ chế polling nhận thấy lệnh thất bại $\rightarrow$ tự động revert công tắc về trạng thái cũ và bắn thông báo Toast lỗi.

---

## 3. Phân tích chi tiết 4 tầng công nghệ

### 3.1. Hardware & Firmware (ESP32)
* **File mã nguồn:** `000docs/002_arduino_code/code_iot2/code_iot2.ino`
* **Sơ đồ chân (Pinout):**
  * `GPIO 4`: DHT11 DATA (kèm trở kéo pull-up 10kΩ).
  * `GPIO 34 (ADC)`: Cầu phân áp quang trở LDR (chuyển đổi ADC 0–4095 về mức lux 0–1000).
  * `GPIO 12`: LED 1 (kèm điện trở 220Ω chống cháy LED).
  * `GPIO 13`: LED 2 (kèm điện trở 220Ω).
* **Kỹ thuật lập trình:**
  * Sử dụng `millis()` không dùng hàm `delay()` gây treo vi điều khiển $\rightarrow$ đảm bảo vòng lặp `client.loop()` luôn xử lý tức thì các gói tin MQTT điều khiển đến.
  * Tự động reconnect WiFi và MQTT Broker khi mất kết nối.

### 3.2. Cơ sở dữ liệu (MySQL `iot_db`)
* **File:** `000docs/scripts/schema.sql` và `seed.sql`.
* **Cấu trúc 5 bảng:**
  1. `users`: Lưu thông tin cá nhân SV (`id`, `name`, `msv`, `github_link`, `figma_link`, `apidocs_link`, `baocao_link`).
  2. `sensors`: Danh mục cảm biến chuẩn hóa (`Temperature`, `Humidity`, `Light`).
  3. `devices`: Danh mục thiết bị chấp hành (`LED_1`, `LED_2`).
  4. `datasensors`: Lưu toàn bộ giá trị đo (`id`, `sensorID`, `value`, `created_at`). Khóa ngoại nối `sensors(id)`.
  5. `action`: Lưu toàn bộ lịch sử thao tác (`id`, `userID`, `deviceID`, `action`, `status`, `created_at`).
* **Đặc điểm kiến trúc:**
  * Toàn bộ khóa chính `id` là chuỗi ngẫu nhiên 10 ký tự (`VARCHAR(10)`).
  * Đánh chỉ mục Index tối ưu truy vấn: `idx_created`, `idx_sensor_created`, `idx_device_status`.

### 3.3. Backend Node.js (RESTful API)
* **Thư viện:** Node.js (ES Modules), Express 4.19, `mysql2/promise`, `mqtt.js`, `cors`, `dotenv`.
* **Cấu trúc module:**
  * `config/env.js`: Quản lý tập trung biến môi trường, có fallback giá trị mặc định.
  * `config/db.js`: Khởi tạo Connection Pool MySQL 10 kết nối, tự giải phóng tài nguyên.
  * `config/mqtt.js`: Khởi tạo MQTT Client kết nối Mosquitto, tự reconnect sau mỗi 3s nếu broker tắt.
  * `controllers/`: Phân tách rành mạch `sensorController.js`, `deviceController.js`, `profileController.js`.
  * `utils/timeRange.js`: Module phân tích thời gian đa cấp (năm `2026`, tháng `2026-09`, ngày `2026-09-14`, giờ, phút, giây) đúng theo yêu cầu khắt khe của bài toán lọc dữ liệu.
  * `utils/queryBuilder.js`: Xây dựng câu lệnh SQL có tham số hóa (Prepared Statement), triệt tiêu nguy cơ SQL Injection.

### 3.4. Frontend React 18 (Vite SPA)
* **Công nghệ:** React 18, Vite 5, Recharts, Axios.
* **4 Màn hình chuẩn:**
  1. **Dashboard:**
     * 3 Thẻ số liệu cảm biến với màu sắc động cảnh báo theo ngưỡng.
     * Biểu đồ đường Realtime 2 trục Y (Trái: °C & %; Phải: Lux).
     * Bảng điều khiển công tắc LED (nền xanh khi ON, spinner khi LOADING).
     * Trạng thái Live / Sensor Offline (dựa trên thời gian dữ liệu trong 10s).
  2. **DataSensor (Dữ liệu cảm biến):**
     * Bảng dữ liệu phân trang, tùy chỉnh số dòng mỗi trang (`Rows/page`).
     * Bộ lọc đa năng theo Loại cảm biến, Giá trị, SensorID và Thời gian đa cấp.
     * Hỗ trợ đảo chiều sắp xếp (mới nhất / cũ nhất).
  3. **ActionHistory (Lịch sử thao tác):**
     * Bảng lịch sử các lệnh tác động thiết bị.
     * Bộ lọc theo thiết bị (`LED_1`, `LED_2`), hành động (`ON`, `OFF`), trạng thái (`ON`, `OFF`, `LOADING`, `FAILED`) và thời gian.
  4. **Profile (Hồ sơ cá nhân):**
     * Hiển thị avatar, thông tin sinh viên, mã SV.
     * 4 Card điều hướng trực tiếp: GitHub repo, Figma design, Postman API Docs, Báo cáo Google Drive.
* **Custom Hook `usePolling.js`:**
  * Quản lý vòng lặp polling mượt mà, sử dụng `AbortController` hủy bỏ request cũ khi người dùng đổi bộ lọc nhanh.
  * Tự ngắt polling khi tab trình duyệt bị ẩn (`document.hidden`) để giảm tải cho máy chủ.
  * In-memory cache theo fingerprint tổ hợp `trang:bộ-lọc:chiều-sắp-xếp` tránh chớp nháy màn hình.

---

## 4. Đối chiếu với yêu cầu 4 bài báo cáo của Thầy Nguyễn Quốc Uy

| Bài / Tiêu chí | Yêu cầu của Thầy Uy | Hiện trạng dự án BTL_IOT | Đánh giá |
| :--- | :--- | :--- | :--- |
| **Bài 1 (SRS & Thiết kế)** | - Đặc tả Use Case chi tiết<br>- Thiết kế Sequence Diagram<br>- Thiết kế DB 5 bảng đúng tên<br>- Vẽ wireframe Figma & mô tả REST API | Đầy đủ tài liệu docx trong `000docs/001_BAOCAO`, Figma PNG/SVG, Schema SQL và Postman collection. | **Đạt xuất sắc** |
| **Bài 2 (Hardware & MQTT)** | - Mosquitto Broker<br>- 3 Topics: `sensor_data`, `device_control`, `device_response`<br>- Định dạng JSON chuẩn<br>- ESP32 pub cảm biến chu kỳ 2s | ESP32 nạp code chạy ổn định 3 topic, đọc DHT11 + LDR mỗi 2s. File `mosquitto.conf` cấu hình sẵn port 8386 và userpass. | **Đạt xuất sắc** |
| **Bài 3 (Web & REST API)** | - Chuẩn RESTful API (không dùng MVC render view)<br>- 4 màn hình Dashboard, DataSensor, ActionHistory, Profile<br>- Bật tắt có trạng thái `loading` rồi mới chuyển `ON`/`OFF`<br>- Tìm kiếm thời gian linh hoạt (xóa giây tìm theo phút, theo giờ, ngày) | React SPA + Node.js REST API. `timeRange.js` giải quyết trọn vẹn yêu cầu tìm kiếm thời gian đa cấp. Bảng action lưu đủ trạng thái `loading` $\rightarrow$ `ON`/`FAILED`. | **Đạt xuất sắc** |
| **Bài 4 (Demo & Bảo vệ)** | - Demo mượt mà, không lỗi crash<br>- Trả lời câu hỏi luồng, giải thích code<br>- Live code tính năng mở rộng theo ý thầy | Mã nguồn phân tách rõ ràng, clean code, có sẵn dữ liệu mẫu (`seed.sql`) để demo kể cả khi không cắm phần cứng. | **Sẵn sàng bảo vệ** |

---

## 5. Lưu ý thực nghiệm & Bộ câu hỏi vấn đáp bảo vệ

### 1. Cấu hình mạng khi cắm mạch thật:
* ESP32 và máy tính chạy Mosquitto Broker phải **cùng một mạng LAN** (hoặc phát WiFi từ điện thoại/laptop).
* Kiểm tra IP máy tính qua lệnh `ipconfig` và cập nhật biến `mqtt_server` trong file `.ino` trước khi nạp code lên ESP32.
* Broker đang cấu hình port **`8386`**, cần đảm bảo tường lửa Windows không chặn port này.

### 2. Các câu hỏi vấn đáp thường gặp:
* **Câu hỏi 1 (Luồng xử lý):** *"Khi bấm nút bật LED trên màn hình, luồng dữ liệu chạy thế nào?"*  
  $\rightarrow$ **Trả lời:** Frontend gửi REST POST `/api/device/action` $\rightarrow$ Backend lưu bản ghi trạng thái `loading` vào MySQL $\rightarrow$ Publish MQTT topic `device_control` $\rightarrow$ ESP32 nhận lệnh, bật chân GPIO thật $\rightarrow$ ESP32 publish xác nhận topic `device_response` $\rightarrow$ Backend lưu thêm bản ghi trạng thái thật `ON` $\rightarrow$ Frontend poll nhận kết quả và đổi màu công tắc + hiển thị Toast.
* **Câu hỏi 2 (Truy vấn SQL):** *"Viết câu lệnh SQL lấy 5 giá trị nhiệt độ cao nhất trong ngày hôm nay?"*
  ```sql
  SELECT * FROM datasensors 
  WHERE sensorID = (SELECT id FROM sensors WHERE name = 'Temperature')
    AND DATE(created_at) = CURDATE()
  ORDER BY value DESC 
  LIMIT 5;
  ```
* **Câu hỏi 3 (Kịch bản Live code):** *"Cảnh báo vượt ngưỡng nhiệt độ > 35°C"*  
  $\rightarrow$ Vào `Dashboard.jsx`, kiểm tra giá trị `latest?.temperature > 35`, nếu đúng thì thêm class CSS đổi màu nền thẻ cảnh báo đỏ hoặc kích hoạt Toast cảnh báo.

---

# PHẦN 2: THẢO LUẬN KIẾN TRÚC — CÓ NÊN ĐỔI SANG WEBSOCKET THAY VÌ POLLING?

## 1. Kết luận nhanh
> **KHÔNG NÊN ĐỔI.** Giữ nguyên kiến trúc HTTP Polling (`usePolling`) hiện tại là phương án **tối ưu, an toàn và dễ đạt điểm tối đa nhất** cho bài tập lớn này.

---

## 2. So sánh chi tiết `usePolling` vs `WebSocket`

| Tiêu chí | `usePolling` (Hiện tại) | Nếu đổi sang `WebSocket` |
| :--- | :--- | :--- |
| **Độ phức tạp Backend** | Rất thấp: Viết các REST controller độc lập, chỉ thao tác MySQL. | Cao: Phải dựng thêm server WebSocket (`ws` hoặc `socket.io`), quản lý client connection, quản lý phòng/kênh, đồng bộ event MQTT sang socket emit. |
| **Độ phức tạp Frontend** | Rất thấp: Gọi API Service qua hook `usePolling(getDataLatest, 2000)`. | Cao: Quản lý vòng đời socket (`onopen`, `onmessage`, `onerror`, `onclose`), xử lý kết nối lại khi rớt mạng, dễ lỗi duplicate connection trên React 18. |
| **Khả năng kiểm thử (Test)** | Cực kỳ dễ: Mở Postman bấm Send là kiểm tra được ngay từng API. | Phức tạp: Không test luồng dữ liệu bằng HTTP Request cơ bản trên Postman được. |
| **Hiệu năng với tần suất 2s** | Hoàn toàn nhẹ nhàng, không gây ảnh hưởng gì tới CPU/RAM trên localhost. | Không tạo ra khác biệt rõ rệt về trải nghiệm người dùng vì bản thân phần cứng cũng chỉ phát dữ liệu mỗi 2 giây. |
| **Khả năng Live code khi thi** | Sửa đổi hoặc thêm cảm biến cực nhanh trong 3 phút. | Dễ phát sinh lỗi bất đồng bộ hoặc gõ nhầm tên event socket khi đang đứng trước hội đồng. |

---

## 3. 4 lý do không nên đổi sang WebSocket trong đồ án này

### Lý do 1: Đúng trọng tâm yêu cầu của Thầy Nguyễn Quốc Uy
* Thầy Uy yêu cầu rõ ràng: **"phải theo restful api, không dùng MVC"**, kiểm tra input/output của API trên Postman và xem tài liệu API Docs.
* Việc dùng REST API kết hợp Polling đảm bảo 100% các Use Case từ UC1 đến UC5 đều có Endpoint tương ứng hiển thị đẹp mắt trong Postman Collection. Nếu chuyển sang WebSocket, luồng Dashboard bị tách khỏi chuẩn REST API.

### Lý do 2: Bản chất tần suất phần cứng là 2 giây/lần
* ESP32 phát dữ liệu định kỳ mỗi 2 giây (`SENSOR_INTERVAL = 2000`).
* Kể cả khi WebSocket truyền tin với độ trễ 5ms thì giao diện người dùng cũng chỉ nhảy số mỗi 2 giây. Do đó, Polling chu kỳ 2s là **khớp nhịp hoàn hảo** với phần cứng, không gây trễ mắt nhìn.

### Lý do 3: Tối ưu hóa sẵn có của Hook `usePolling`
* Dự án đã có hook `usePolling.js` chất lượng cao:
  * Tích hợp `AbortController` hủy bỏ request cũ khi người dùng chuyển trang hoặc đổi bộ lọc.
  * Tự động tạm dừng khi ẩn tab (`document.hidden`) giúp tiết kiệm băng thông.
  * Lưu bộ nhớ tạm theo fingerprint (`cacheKey`) giúp chuyển qua lại giữa các trang không bị chớp giật giao diện.

### Lý do 4: An toàn tuyệt đối khi bảo vệ và Live code
* Khi thầy yêu cầu mở code chỉ ra đoạn xử lý, kiến trúc REST controller rành mạch hơn nhiều so với việc nhảy qua lại giữa socket event listener và handler.
* Khi thầy yêu cầu live code mở rộng thêm cảm biến hoặc cảnh báo, bạn chỉ cần sửa câu truy vấn SQL và thêm thẻ giao diện, không phải can thiệp vào tầng truyền dẫn mạng socket.

---

## 4. Mẫu câu trả lời "ăn trọn điểm" khi Thầy hỏi vấn đáp

Nếu trong buổi bảo vệ thầy giáo hỏi: *"Tại sao em không dùng WebSocket để đẩy dữ liệu realtime mà lại dùng Polling?"*, bạn hãy tự tin trả lời như sau:

> *"Dạ thưa thầy, em đã phân tích và cân nhắc kỹ giữa WebSocket và HTTP Polling dựa trên đặc thù của bài toán:*
> 1. ***Về chu kỳ phần cứng:*** *ESP32 của em phát dữ liệu cảm biến định kỳ cố định 2 giây/lần. Việc Polling chu kỳ 2s hoàn toàn đồng bộ với nhịp phát của phần cứng mà không làm giao diện bị trễ.*
> 2. ***Về chuẩn kiến trúc:*** *Em muốn tuân thủ triệt để kiến trúc RESTful API chuẩn mực như thầy yêu cầu, giúp hệ thống dễ dàng tài liệu hóa bằng Postman/Swagger và kiểm thử độc lập từng Endpoint.*
> 3. ***Về tối ưu hóa:*** *Phía Frontend em đã cài đặt hook `usePolling` có tích hợp `AbortController` để tránh rò rỉ bộ nhớ, tự động dừng polling khi tab trình duyệt bị ẩn và có cơ chế cache tránh chớp nháy giao diện.*
> 4. ***Về khả năng mở rộng:*** *Với quy mô bài toán hiện tại thì Polling là giải pháp vừa vặn và ổn định nhất. Nếu sau này hệ thống mở rộng lên hàng nghìn thiết bị và tần suất lấy mẫu tính bằng mili-giây, em sẽ nâng cấp lên WebSocket hoặc Server-Sent Events (SSE) sau ạ."*

👉 Câu trả lời này thể hiện tư duy của một kỹ sư phần mềm thực thụ: **hiểu rõ bài toán, đánh giá được trade-off và chọn giải pháp phù hợp nhất thay vì chạy theo công nghệ phức tạp không cần thiết.**
