# 📚 vbook-extensions

Kho lưu trữ các extension dành cho ứng dụng **VBook** — hỗ trợ đọc truyện từ nhiều nguồn thông qua hệ thống plugin mở rộng.

---

## ⚡ Cách sử dụng trên ứng dụng VBook

Nhập URL repository sau vào VBook để truy cập toàn bộ danh sách extension:

```text
https://raw.githubusercontent.com/Skadiii9812/vbook-extensions/main/plugin.json
```

**Các bước thực hiện:**

1. Mở VBook app
2. Vào **Extensions** / **Kho tiện ích**
3. Dán repository URL ở trên
4. Chọn extension muốn dùng và tiến hành cài đặt

> 💡 Đây là phương thức được khuyến nghị để nhận cập nhật nhanh và ổn định.

---

## 🔧 Cài đặt

### 📦 Cài thủ công bằng ZIP

1. Tải file `plugin.zip` trong thư mục extension tương ứng
2. Import vào VBook app

> 💡 Phù hợp khi cần kiểm tra nhanh một extension cụ thể mà không cần thêm toàn bộ repository.

---

## 🔄 Cập nhật Extension

1. Mở VBook app → vào phần **Extensions**
2. Tìm extension cần cập nhật → nhấn **Kiểm tra cập nhật** (hoặc pull-to-refresh)
3. Nếu có bản mới → nút **Cập nhật** sẽ xuất hiện → nhấn để tải về

> ⚠️ Lưu ý: ứng dụng không tự động thông báo khi có cập nhật. Cần vào trang Extensions để kiểm tra thủ công.

---

## 🛠️ Xử lý khi chưa thấy cập nhật

1. Kéo xuống để làm mới danh sách repository
2. Mở extension cần cập nhật rồi nhấn **Kiểm tra cập nhật** lại
3. Nếu vừa push lên GitHub, chờ vài phút để CDN cập nhật file mới
4. Kiểm tra lại repository URL có khớp với URL ở trên không
5. Nếu vẫn chưa nhận được cập nhật, xoá extension cũ rồi cài lại từ repository
