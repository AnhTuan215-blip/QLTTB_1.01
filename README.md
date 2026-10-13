# TBYT Manager — Cloudflare Workers + D1

Ứng dụng quản lý thiết bị y tế, Đơn hàng theo phiếu và Dự trù.

## Cấu hình đã chuẩn bị

| Thành phần | Giá trị |
| --- | --- |
| Cloudflare account | `bd8609811af764a55dcb1c351376f5b4` |
| D1 database ID | `8ce4f3e0-e3c5-48ee-b7c3-67745fa790d8` |
| Binding trong Worker | `DB` (viết hoa) |
| Wrangler environment | `production` |
| Worker name | `tbyt-manager` |
| Backend entry | `src/index.ts` |
| Static assets | `public/` |

ID tài khoản/database không phải mật khẩu. Không đưa API token vào mã nguồn.
Cấu hình production dùng ID D1 chính xác, không cần đoán tên database trên dashboard.
Local vẫn dùng `local-d1-db` và dữ liệu `.wrangler/state` hiện có.

## 1. Chuẩn bị mã nguồn trên GitHub

Dùng Node.js 22 trở lên (kèm npm). Đưa mã nguồn lên repository của bạn với các thành phần:

`public/`, `src/`, `migrations/`, `scripts/`, `tests/`, `docs/`, `schema.sql`, `wrangler.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `.nvmrc`, `README.md`.

Không tải `node_modules/`, `.wrangler/`, `work/`, `dist/`, `database_backup.sql`, `.env*`, `.dev.vars*` hoặc token lên GitHub. `.gitignore` bảo vệ khi dùng Git; khi tải file bằng trình duyệt, bạn vẫn phải tự loại các file này.

## 2. Kiểm tra và chuẩn bị D1 (làm một lần trước khi xuất bản)

Trong terminal tại thư mục dự án, chạy:

```powershell
npm ci
npx wrangler login
npm run db:check:remote
```

Lệnh kiểm tra chỉ đọc danh sách bảng và cấu trúc phần Đơn hàng / Dự trù. Sau khi xác nhận đúng account và D1 ở bảng trên, chạy:

```powershell
npm run db:setup:remote
```

Lệnh này kiểm tra toàn bộ bảng/cột cần thiết rồi:

- **Database đã đủ cấu trúc:** không thay đổi gì.
- **Database phiên bản cũ tương thích:** xuất bản sao lưu vào `work/backups/`, sau đó áp dụng migration `0001_request_sheets.sql`; giữ nguyên dữ liệu/ID hiện có.
- **Database trống:** sao lưu rồi tạo cấu trúc từ `schema.sql`, ghi nhận migration nền. Không nhập dữ liệu mẫu hay dữ liệu máy tính.
- **Database khác cấu trúc hoặc nâng cấp dở:** dừng, không tự sửa hay ghi đè.
- Nếu sao lưu thất bại, dừng trước khi thay đổi cấu trúc.

Không chạy `schema.sql` hoặc nhập `database_backup.sql` trực tiếp lên database đang có dữ liệu. Local và remote không tự đồng bộ dữ liệu. Nếu database đích trống, website mới cũng trống; chuyển dữ liệu local là một bước riêng, không thực hiện tự động.

`db:setup:remote` dành cho nâng cấp giao diện/phiếu của phiên bản này, không phải công cụ đồng bộ database hay tự động chạy mọi migration tương lai. Không thêm lệnh này vào build/deploy tự động.

## 3. Kết nối GitHub với Cloudflare

Trong Cloudflare, tạo/kết nối **Worker** với GitHub qua Workers & Pages (không chọn một dự án Pages tĩnh). Chọn repository và nhánh chính của bạn, rồi đặt:

| Thiết lập | Giá trị |
| --- | --- |
| Worker name | `tbyt-manager` |
| Root directory | Gốc repository, nơi có `package.json` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Node.js | 22 trở lên; có thể đặt build variable `NODE_VERSION=22` |

**Quan trọng:** không giữ deploy command mặc định `npx wrangler deploy` vì mặc định là cấu hình local. `npm run deploy` đã chọn `--env production` và đúng D1 của bạn.

Chỉ bật build cho nhánh production; chưa bật preview/nhánh thử nghiệm dùng chung D1 thật. Không cấu hình build output directory kiểu Pages: Wrangler đóng gói cả backend và `public/`.

Nếu tài khoản đã có Worker `tbyt-manager`, kết nối repository vào Worker đó thay vì tạo trùng. Nếu muốn tên khác, sửa `env.production.name` trong `wrangler.json` cho khớp trước khi triển khai. Kiểm tra đúng quyền sở hữu trước khi cập nhật Worker có sẵn.

Wrangler sẽ cấu hình D1 binding `DB` theo ID đã ghi. Sau khi deploy, kiểm tra Worker → Settings → Bindings có `DB` trỏ đúng database. Nếu gặp lỗi quyền, tài khoản/token bạn sử dụng cần quyền triển khai Worker và quyền D1 phù hợp trên đúng account; không gửi token vào chat hoặc commit token.

Tài liệu Cloudflare: [Build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Wrangler environments](https://developers.cloudflare.com/workers/wrangler/environments/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).

## Hoặc triển khai trực tiếp từ máy tính

Sau bước chuẩn bị D1:

```powershell
npm run build
npm run deploy
```

`build` chỉ kiểm tra TypeScript và đóng gói dry-run, không xuất bản hay gọi database remote. `deploy` mới tải website lên Cloudflare. Wrangler sẽ in URL `workers.dev` thực tế; không cần nhập URL dashboard D1 vào frontend.

## Kiểm tra sau khi triển khai

- Mở website bằng URL Worker do Cloudflare cung cấp.
- Mở `/api/health`: phải trả `{"status":"ok"}` (chỉ xác nhận Worker chạy).
- Mở `/api/bootstrap`: phải trả JSON các danh sách, không phải lỗi 500 (xác nhận D1/bảng hoạt động).
- Kiểm tra tổng tài sản, đơn hàng cũ và trang Dự trù; không tạo dữ liệu thử trên database thật nếu không cần.
- Lỗi `no such table` / `no such column`: chạy lại bước kiểm tra D1, không nhập đè backup. Lỗi `binding DB`: kiểm tra environment `production` và binding viết hoa `DB`.

## Chạy và kiểm thử local

```powershell
npm run dev
npm run test:cloudflare
npm run build
```

Mở http://127.0.0.1:8787. Không đổi ID database local để giữ dữ liệu chạy thử cũ. Các kiểm thử `test:requests` vẫn chỉ chạy trên QA riêng ở cổng 8791 theo `docs/workspace-upgrade.md`.

## Quyền truy cập website

Theo lựa chọn của bạn, cấu hình production bật địa chỉ public `workers.dev`. Ứng dụng hiện chưa có đăng nhập: bất kỳ ai truy cập được URL đều có thể đọc và sửa dữ liệu, không chỉ người bạn chủ động gửi link. Repository riêng tư không bảo vệ quyền truy cập website. Nên bổ sung đăng nhập hoặc Cloudflare Access nếu sau này cần giới hạn người dùng.

Mã nguồn đã chuẩn bị để triển khai; chưa xác minh schema/quyền trên D1 remote và chưa tự xuất bản website.
