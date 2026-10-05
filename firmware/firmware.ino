#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ================= 1. CẤU HÌNH WIFI & MQTT =================
const char* ssid = "Manh";
const char* password = "18112005";

const char* mqtt_server = "10.34.8.85";
const int mqtt_port = 6767;
const char* mqtt_user = "nguyenducmanh";
const char* mqtt_pass = "B23DCCN532";

const char* TOPIC_CONTROL  = "iot/devices/control";
const char* TOPIC_RESPONSE = "iot/devices/response";
const char* TOPIC_SENSOR   = "iot/sensors/data";

const int SENSOR_DEVICE_ID = 4;

// ================= 2. CẤU HÌNH PHẦN CỨNG =================
#define DHTPIN 4
#define DHTTYPE DHT11
#define LIGHT_PIN A0

#define LED1_PIN 5
#define LED2_PIN 12
#define LED3_PIN 13

const int ALLOWED_PINS[] = {
  LED1_PIN,
  LED2_PIN,
  LED3_PIN
};

const int ALLOWED_PINS_COUNT = 3;

DHT dht(DHTPIN, DHTTYPE);

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSensorMsg = 0;
const unsigned long SENSOR_INTERVAL = 2000; // Đặt chuẩn 2000ms (2 giây/lần)

// ================= 3. KẾT NỐI WIFI =================
void setup_wifi() {
  delay(10);

  Serial.println();
  Serial.print("Dang ket noi WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n=> Da ket noi WiFi thanh cong!");
  Serial.print("IP ESP8266: ");
  Serial.println(WiFi.localIP());
}

// ================= 4. KIỂM TRA PIN HỢP LỆ =================
bool isPinAllowed(int pin) {
  for (int i = 0; i < ALLOWED_PINS_COUNT; i++) {
    if (ALLOWED_PINS[i] == pin) {
      return true;
    }
  }
  return false;
}

// ================= 5. GỬI ACK VỀ BACKEND =================
void sendAck(
  const String& requestId,
  int deviceId,
  int pin,
  const char* status,
  const char* state
) {
  StaticJsonDocument<200> doc;

  doc["request_id"] = requestId;
  doc["device_id"] = deviceId;
  doc["pin"] = pin;
  doc["status"] = status;
  doc["state"] = state;

  char buffer[200];
  size_t n = serializeJson(doc, buffer);

  client.publish(
    TOPIC_RESPONSE,
    (const uint8_t*)buffer,
    n,
    false
  );

  Serial.print("-> Da gui ACK: ");
  Serial.println(buffer);
}

// ================= 6. CALLBACK - NHẬN LỆNH =================
void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  message.reserve(length);

  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Nhan lenh [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  if (String(topic) != TOPIC_CONTROL) {
    return;
  }

  // ================= ĐỌC JSON =================
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, message);

  if (err) {
    Serial.print("Loi parse JSON: ");
    Serial.println(err.c_str());
    return;
  }

  String requestId = doc["request_id"] | "";
  int deviceId     = doc["device_id"] | -1;
  String action    = doc["action"] | "";
  int pin          = doc["pin"] | -1;

  if (requestId == "") {
    Serial.println("-> Lenh khong co request_id");
    return;
  }

  if (action != "ON" && action != "OFF") {
    Serial.println("-> Action khong hop le");
    sendAck(requestId, deviceId, pin, "FAILED", "INVALID_ACTION");
    return;
  }

  // Điều khiển tất cả LED (pin = -1)
  if (pin == -1) {
    if (action == "ON") {
      digitalWrite(LED1_PIN, HIGH);
      digitalWrite(LED2_PIN, HIGH);
      digitalWrite(LED3_PIN, HIGH);
      Serial.println("-> DA BAT TAT CA LED");
      sendAck(requestId, deviceId, -1, "SUCCESS", "ALL_ON");
    } else {
      digitalWrite(LED1_PIN, LOW);
      digitalWrite(LED2_PIN, LOW);
      digitalWrite(LED3_PIN, LOW);
      Serial.println("-> DA TAT TAT CA LED");
      sendAck(requestId, deviceId, -1, "SUCCESS", "ALL_OFF");
    }
    return;
  }

  // Điều khiển từng LED đơn lẻ
  if (!isPinAllowed(pin)) {
    Serial.print("-> Pin khong hop le: ");
    Serial.println(pin);
    sendAck(requestId, deviceId, pin, "FAILED", "INVALID_PIN");
    return;
  }

  if (action == "ON") {
    digitalWrite(pin, HIGH);
    Serial.print("-> DA BAT LED pin ");
    Serial.println(pin);
    sendAck(requestId, deviceId, pin, "SUCCESS", "ON");
  } else {
    digitalWrite(pin, LOW);
    Serial.print("-> DA TAT LED pin ");
    Serial.println(pin);
    sendAck(requestId, deviceId, pin, "SUCCESS", "OFF");
  }
}

// ================= 7. KẾT NỐI LẠI MQTT =================
void reconnect() {
  while (!client.connected()) {
    Serial.print("Dang ket noi MQTT...");

    String clientId = "ESP8266Client-";
    clientId += String(random(0xffff), HEX);

    if (client.connect(
      clientId.c_str(),
      mqtt_user,
      mqtt_pass
    )) {
      Serial.println(" Thanh cong!");
      client.subscribe(TOPIC_CONTROL, 1);
    } else {
      Serial.print(" That bai, rc=");
      Serial.print(client.state());
      Serial.println(", thu lai sau 5s...");
      delay(5000);
    }
  }
}

// ================= 8. SETUP =================
void setup() {
  Serial.begin(115200);

  // Cấu hình chân output cho 3 LED
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);

  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  // Kết nối WiFi & MQTT
  setup_wifi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setBufferSize(512);

  // Khởi động DHT
  dht.begin();
  delay(1000);

  lastSensorMsg = millis();
}

// ================= 9. GỬI DỮ LIỆU CẢM BIẾN =================
void publishSensorData() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  int rawLight = analogRead(LIGHT_PIN);
  int lightVal = 1023 - rawLight;

  Serial.print("Nhiet do: ");
  if (isnan(temp)) Serial.print("Loi!"); else Serial.print(temp);
  Serial.print(" *C | Do am: ");
  if (isnan(hum)) Serial.print("Loi!"); else Serial.print(hum);
  Serial.print(" % | Anh sang: ");
  Serial.println(lightVal);

  StaticJsonDocument<384> doc;
  doc["device_id"] = SENSOR_DEVICE_ID;
  JsonArray readings = doc.createNestedArray("readings");

  if (!isnan(temp)) {
    JsonObject r1 = readings.createNestedObject();
    r1["sensor_type"] = "TEMP";
    r1["value"] = temp;
  }

  if (!isnan(hum)) {
    JsonObject r2 = readings.createNestedObject();
    r2["sensor_type"] = "HUMI";
    r2["value"] = hum;
  }

  JsonObject r3 = readings.createNestedObject();
  r3["sensor_type"] = "LIGHT";
  r3["value"] = lightVal;

  char buffer[384];
  size_t n = serializeJson(doc, buffer);

  client.publish(
    TOPIC_SENSOR,
    (const uint8_t*)buffer,
    n,
    false
  );

  Serial.print("-> Da gui: ");
  Serial.println(buffer);
}

// ================= 10. LOOP (CHU KỲ ĐỀU ĐẶN 2 GIÂY) =================
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setup_wifi();
  }

  if (!client.connected()) {
    reconnect();
  }

  client.loop();

  if (millis() - lastSensorMsg >= SENSOR_INTERVAL) {
    lastSensorMsg = millis(); 
    publishSensorData();
  }
}
