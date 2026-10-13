# Giao diện Workspace — 13/10/2026

Triển khai Cloudflare và kết nối D1: xem [README](../README.md). Cấu hình production đã tách khỏi database local.

## Cách sử dụng

- Đơn hàng → Tạo phiếu đặt hàng → chọn khoa/phòng, thêm nhiều thiết bị → Lưu phiếu. Mỗi lần lưu phiếu mới là một nhóm riêng, kể cả cùng khoa và ngày.
- Danh sách hiển thị khoa/phòng và thông tin tóm tắt. Bấm phiếu để xem toàn bộ thiết bị, chỉnh sửa, xuất Excel hoặc xóa có xác nhận.
- Dự trù dùng cùng quy trình. Mỗi thiết bị có tên, **một** số lượng cần, lý do và mức độ: Ưu tiên / Không cần gấp.
- Mỗi phiếu tối đa 100 thiết bị; lưu các dòng cùng một giao dịch database.
- Các đơn hàng lịch sử được giữ nguyên ID và nội dung. Do dữ liệu cũ không có mã lần tạo, mỗi dòng cũ nằm trong một phiếu riêng; không tự đoán và ghép các lần đặt khác nhau.

## Database

Database đang chạy: D1 local tại `.wrangler/state`.

Bản sao lưu trước nâng cấp: `work/backups/before-workspace-20261013.sql`.

Migration `migrations/0001_request_sheets.sql` đã áp dụng vào database local ngày 13/10/2026. Nó bổ sung `request_sheets`, `orders.sheet_id` và `estimate_items`, không xóa các đơn cũ.

Với một bản cài đặt cũ khác, sao lưu trước rồi chạy:

```powershell
node node_modules/wrangler/bin/wrangler.js d1 export tbyt-db --local --output backup-before-upgrade.sql
node node_modules/wrangler/bin/wrangler.js d1 migrations apply tbyt-db --local
```

`schema.sql` dành cho database mới hoàn toàn và đã chứa cấu trúc mới. Không chạy migration 0001 trên database vừa khởi tạo bằng schema này. Không nhập schema/backup vào database đang sử dụng để cập nhật giao diện.

## Chạy ứng dụng

```powershell
node node_modules/wrangler/bin/wrangler.js dev --port 8787 --local
```

Mở http://127.0.0.1:8787. Chưa triển khai lên Cloudflare remote.

## Kiểm thử

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit`.
- API: `node tests/request-sheets.cjs` — chỉ chạy với server QA riêng tại cổng 8791.
- QA sử dụng bản sao database tại `work/qa-state`, không trỏ cổng 8791 vào database chính:

```powershell
node node_modules/wrangler/bin/wrangler.js dev --port 8791 --local --persist-to work/qa-state
```

- 75 kiểm tra API đạt: CRUD, tách các lần tạo, cập nhật giữ ID, dữ liệu không hợp lệ, rollback, nhập nhiều dòng, biên 100 thiết bị và bảo toàn dữ liệu cũ.
- Đã mở kiểm tra tất cả phân hệ, thử tạo/sửa nhiều thiết bị cho Đơn hàng và Dự trù trên trình duyệt; kiểm tra giao diện ở 1440px và 390px.
- Dữ liệu thử được tạo và dọn trên QA, không thêm vào database chính.
