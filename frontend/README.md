# HanoiFood Frontend — Giai đoạn 7

React + TypeScript strict + Vite. Kết nối backend thật; không có mock runtime hoặc credential mặc định. Frontend độc lập trong frontend/, không thay cấu trúc Maven.

Giao diện mới dùng nền kem, cam chủ đạo, Be Vietnam Pro local, ảnh món ăn WebP responsive và bốn workspace có nhận diện riêng. Xem [báo cáo nâng cấp UI](../docs/ui-upgrade-result.md), [design system](../docs/ui-design-system.md), [nguồn ảnh và prompt](../docs/ui-assets.md).

## Chạy trên Windows

Yêu cầu Node >=22.12 (đã kiểm thử Node 24.20.0), npm, backend Giai đoạn 2 đã được migration và cấu hình đúng. Dùng npm.cmd nếu PowerShell chặn npm.ps1; không cần đổi execution policy.

```powershell
cd "F:\New folder\food-delivery\frontend"
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Mở **http://localhost:5173**. Dùng hostname localhost nhất quán, không trộn với 127.0.0.1 cho browser. Dev proxy mặc định gọi backend 127.0.0.1:18080. Việc chạy frontend không tự khởi động MySQL/backend hoặc tự tạo database/tài khoản.

VITE_API_BASE_URL=/api là cấu hình public. API_PROXY_TARGET là cấu hình server Vite, không được expose qua VITE_. Không cho database password, key, token hoặc ADMIN password vào .env frontend.

## Proxy, cookie và production

Vite giữ Host gốc (changeOrigin:false) để request cùng origin vẫn có nghĩa cùng origin với backend; không xóa hoặc giả Origin từ client khác. Proxy ánh xạ /api/* tới /*, và **chỉ đổi cookie Path=/auth thành /api/auth**. Cookie Secure/HttpOnly/SameSite=Strict được giữ nguyên. XSRF cookie Path=/ giữ nguyên. Login/logout và xóa cookie dùng cùng mapping.

Chromium thật đã kiểm chứng Secure cookie trên HTTP localhost. Đây là ngoại lệ loopback của trình duyệt, không phải cách triển khai production. Production cần HTTPS, UI/API cùng site, reverse proxy /api và cookie-path mapping tương ứng, SPA history fallback, origin allowlist backend chính xác; không dùng Vite dev/preview làm server production. Nếu gọi API cross-origin, cấu hình VITE_API_BASE_URL và CORS/site/cookie phù hợp, không dùng wildcard credentials hoặc hạ bảo mật cookie.

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Preview chạy localhost:4173 và có cùng proxy cho kiểm chứng local. dist/ là artifact build; không chứa credential hoặc private key. Tất cả font/illustration được phục vụ local, không cần CDN ảnh/font.

## E2E với backend thật

```powershell
npx.cmd playwright install chromium
$env:FOOD_E2E_CREDENTIAL_FILE='F:\New folder\food-delivery-mysql-test\phase3\credentials.json'
$env:FOOD_E2E_BASE_URL='http://localhost:4173'
$env:FOOD_E2E_RESULTS_FILE='F:\New folder\food-delivery-mysql-test\phase3\logs\e2e-production-results.json'
$env:FOOD_E2E_SCREENSHOT_DIR='F:\New folder\food-delivery-mysql-test\phase3\logs\production-screenshots'
$env:FOOD_E2E_DIAGNOSTIC_DIR='F:\New folder\food-delivery-mysql-test\phase3\logs\browser-diagnostics'
npm.cmd run test:e2e
```

Cần frontend preview/dev và backend test chạy trước. Credential file chỉ dùng bởi Node Playwright, ngoài repository; không phải VITE env và không được bundle. Thiếu file làm suite báo ERROR, không skip hoặc fallback mock.

File JSON chứa CUSTOMER, CUSTOMER_OTHER, PASSWORD_CUSTOMER, RESTAURANT, DRIVER, ADMIN (mỗi mục có email/password), cùng catalog {restaurantId,name,foodName,menuId}. Cấp tài khoản test riêng bằng API backend trong **fooddelivery_stage2_rehearsal trên MySQL riêng 3307**; RESTAURANT/DRIVER do ADMIN tạo. Không tự bootstrap ADMIN ở database hiện tại. PASSWORD_CUSTOMER dùng riêng cho test đổi mật khẩu, cần fixture mới cho mỗi lần chạy. Không reset dữ liệu rehearsal. Script chuẩn bị và evidence của lượt nghiệm thu nằm ngoài Git ở thư mục phase3.

Trace/video/screenshot tự động khi lỗi được tắt để tránh ghi password/token. Ảnh responsive chủ động chỉ chụp trang public/form trống và trang đã đăng nhập, không ghi JWT/cookie value. Tài khoản fixture có giới hạn login backend; chuẩn bị fixture mới và restart **backend test được sở hữu** khi cần bắt đầu một lượt nghiệm thu mới, không tắt limiter.

Bộ E2E hiện có 16 kịch bản: 10 luồng chức năng, 4 bài responsive tại 375/768/1024/1440px và 2 bài kiểm tra ảnh local, tải chunk, tương phản, sticky header và reduced motion. Có 22 ảnh cho mỗi breakpoint; modal/dropdown chụp viewport, các trang chụp full page. Khi chụp bằng chứng, animation được hoàn tất để tránh ảnh dừng giữa hiệu ứng mở. Console guard ghi loại lỗi và đường dẫn đã bỏ query, không ghi nội dung request/response hoặc credential; phân biệt 401 dự kiến và lỗi mạng được cố ý tạo trong test.

## Phạm vi nền tảng Giai đoạn 3 (lịch sử)

Hoàn thiện public pages, login/register/session/refresh/logout/logout-all/password, hồ sơ đọc thật, guard và bốn workspace. Cart/order/menu-management/delivery/admin-management là màn hình giới thiệu Giai đoạn 4–7, không số liệu giả và không mutation nghiệp vụ. Hồ sơ cơ bản hiện đọc thông tin; chỉnh sửa hồ sơ chưa thuộc lượt này. Xem ../docs/phase3-architecture.md, phase3-routes.md, phase3-api-integration.md, phase3-result.md.

Chỉ sử dụng một origin frontend chuẩn trong cùng browser profile: không mở đồng thời dev 5173 và preview 4173 với cùng cookie. Cookie không phân biệt port, còn Web Locks/BroadcastChannel phân biệt origin. Kiểm thử mỗi lượt dùng browser context riêng.

## Giai đoạn 4 — Đặt món Customer

Đã tích hợp nhà hàng/thực đơn phân trang server, chi tiết món, cart, checkout COD, đơn/history/detail, trạng thái, hủy/đổi địa chỉ, đánh giá và sửa hồ sơ. Xem [kiến trúc](../docs/phase4-architecture.md), [route](../docs/phase4-customer-routes.md), [API](../docs/phase4-api-integration.md), [test](../docs/phase4-test-results.md) và [bàn giao](../docs/phase4-result.md). Phần Phạm vi Giai đoạn3 phía trên mô tả lịch sử nền tảng; các chức năng Customer tương ứng đã được thay bằng luồng thật, các role khác vẫn theo giai đoạn riêng.

Backend cần bản có6 GET chỉ đọc đã phê duyệt; không chạy migration/schema update khi khởi động. Kiểm thử độc lập dùng MySQL127.0.0.1:3307/fooddelivery_stage4_e2e và ddl-auto=validate. Không dùng database fooddelivery hoặc3309; không reset rehearsal. Bằng chứng/config/credential riêng nằm ngoài Git tại F:/New folder/food-delivery-mysql-test/phase4-20261109. App SQL account chỉ có SELECT/INSERT/UPDATE/DELETE trên database Stage4; migrator test riêng chỉ có quyền trên database này.

Để chạy E2E, đặt FOOD_E2E_CREDENTIAL_FILE tới credentials.json bên ngoài repository; file giữ schema auth cũ và stage4 gồm các ID QA thật (restaurantId,otherRestaurantId,closedRestaurantId,menuId,secondMenuId,unavailableMenuId,otherMenuId,closedMenuId,codPaymentMethodId,restaurantName,foodName,secondFoodName,customerId,otherCustomerId). Không copy file này vào frontend, VITE env hoặc Git. Chuẩn bị PASSWORD_CUSTOMER mới cho mỗi lượt kiểm tra password. New Customer E2E tự đăng ký fixture riêng qua API; không sửa trạng thái đơn bằng SQL. API Restaurant/Driver chỉ dùng từ test được phân quyền để hoàn tất COD.

Chạy cùng lệnh kiểm tra ở trên; E2E cần backend18080 và một origin frontend chuẩn localhost4173 hoặc5173. Không dùng hai origin đồng thời trong cùng cookie profile. Không tự động retry checkout; khi kết quả chưa rõ, dùng kiểm tra trên server/lịch sử, không tự gửi lại POST. Không có idempotency endpoint hoặc payment gateway giả. Ví dụ biến evidence Stage4:

```powershell
$env:FOOD_E2E_CREDENTIAL_FILE='F:\New folder\food-delivery-mysql-test\phase4-20261109\credentials.json'
$env:FOOD_E2E_BASE_URL='http://localhost:4173'
$env:FOOD_E2E_RESULTS_FILE='F:\New folder\food-delivery-mysql-test\phase4-20261109\logs\e2e-final-results.json'
$env:FOOD_E2E_SCREENSHOT_DIR='F:\New folder\food-delivery-mysql-test\phase4-20261109\logs\screenshots'
$env:FOOD_E2E_DIAGNOSTIC_DIR='F:\New folder\food-delivery-mysql-test\phase4-20261109\logs\browser-final'
npm.cmd run test:e2e
```

Sau kiểm thử phải dừng tiến trình mình khởi động, giữ datadir/log. Production vẫn cần HTTPS, reverse proxy và cookie/origin mapping đúng; chưa deploy public.

## Giai đoạn 5 — Restaurant Management

Dashboard/profile/menu/order processing/reviews/analytics đã dùng API thật. Xem [kiến trúc](../docs/phase5-architecture.md), [routes](../docs/phase5-restaurant-routes.md), [API](../docs/phase5-api-integration.md), [quy tắc](../docs/phase5-business-rules.md), [kết quả](../docs/phase5-test-results.md), [bàn giao](../docs/phase5-result.md). Chỉ RESTAURANT; giá và trạng thái bán thuộc menu riêng, FoodItem là catalog chung. Thêm/sửa/availability có baseline expected pair; không retry mutation. Khi kết quả chưa rõ phải đọc máy chủ; bản nháp cũ cần rebase tường minh.

Backend phải có bốn GET management và conditional PUT đã phê duyệt. Schema/dependency/auth client giữ nguyên. Test mới dùng fooddelivery_stage5_e2e trên127.0.0.1:3307, Hibernate validate/OSIV=false; tuyệt đối không ghi3309/fooddelivery hoặc reset Stage1/2/4. External evidence tại F:/New folder/food-delivery-mysql-test/phase5-20261109.

Chạy typecheck, lint, format:check, test, build và test:e2e như phần trên. Đổi biến FOOD_E2E_CREDENTIAL_FILE/RESULTS_FILE/SCREENSHOT_DIR/DIAGNOSTIC_DIR sang thư mục Stage5; credential còn khóa stage4 để hồi quy cũ và bổ sung OTHER_RESTAURANT. Chuẩn bị PASSWORD_CUSTOMER mới mỗi lượt auth password E2E. Không đưa credential vào VITE env, source, Git hoặc output báo cáo. Chỉ một frontend origin localhost4173 với backend18080.

Thống kê tiền là SUM(subtotal) COMPLETED+SUCCESS theo paidAt, loại shipping, trước đối soát; không phải thực nhận hoặc lợi nhuận. Không có ảnh/upload/review reply/payout giả. Sau test dừng đúng backend/preview/MySQL test do mình tạo, giữ datadir/log, không dừng MySQL80.

## Giai đoạn 6 — Driver Management

Tài xế dùng auth/session hiện có. Bảy route mới dưới /driver: dashboard,deliveries,available,deliveries/:id,history,profile,analytics. Chỉ own Driver; cơ chế tự nhận chuyến đã có, không giả Admin assignment/GPS hoặc thu nhập. Pickup→Delivering→Delivered/COD giữ nguyên backend. Khi mất response, chỉ refetch; accept có kiểm tra own detail/pool và khóa nếu chưa rõ.

Xem [architecture](../docs/phase6-architecture.md), [routes](../docs/phase6-driver-routes.md), [API](../docs/phase6-api-integration.md), [rules](../docs/phase6-business-rules.md), [security](../docs/phase6-security-tests.md), [test results](../docs/phase6-test-results.md), [result](../docs/phase6-result.md). Backend có bốn GET Driver đã phê duyệt; quyền65route cũ, schema/dependency/isolation giữ nguyên. Bản sửa cancelOrder đọc lại Delivery dưới khóa Order→Delivery đã được phê duyệt riêng, kèm test snapshot và assertion hồi quy.

Test mới chỉ fooddelivery_stage6_e2e ở127.0.0.1:3307, validate/OSIV=false, backend18080/previewlocalhost4173. Evidence/config bên ngoài Git tại F:/New folder/food-delivery-mysql-test/phase6-20261109. Credential schema giữ stage4 cho hồi quy và thêm DRIVER_OTHER. Không reset rehearsal Stage1–5 hoặc ghi3309/fooddelivery. Chuẩn bị PASSWORD_CUSTOMER mới cho auth regression.

Chạy các lệnh typecheck/lint/format:check/test/build ở trên; chạy E2E Driver bằng npm.cmd exec playwright -- test driver.spec.ts và hồi quy bằng: npm.cmd exec playwright -- test auth.spec.ts customer.spec.ts restaurant.spec.ts responsive.spec.ts ui-upgrade.spec.ts. Đổi FOOD_E2E_* evidence sang Stage6. Hai batch chạy riêng với backend test được sở hữu khởi động lại giữa lượt, giữ nguyên limiter10/email100/IP/15phút, không nâng/tắt bảo mật để đạt PASS. Không chạy song song cùng fixture hoặc hai frontend origin chung cookie.

Sau test dừng đúng backend/preview/MySQL test mình tạo, giữ datadir/log, MySQL80 tiếp tục chạy. Chưa deploy production. Không có map API có phí hoặc gửi địa chỉ đến bên thứ ba.

## Admin Management — Giai đoạn 7

20route /admin/*: dashboard, accounts/list+detail, customers/list+detail, restaurants/list+new+detail, drivers/list+new+detail, orders/list+detail, deliveries/list+detail, payments/list+detail-by-order, reviews/dialog, analytics và profile. ADMIN ACTIVE; guard frontend và quyền backend độc lập. Không đăng nhập riêng hoặc credential mặc định.

Backend thêm12GET đã phê duyệt dưới /admin-management; count/filter/page tại MySQL, tối đa50item/page. Tái dùng GET detail cũ khi phù hợp, POST /restaurants và /drivers cho tạo hồ sơ cùng Account, PUT hồ sơ cũ với confirmation. PUT /admin/accounts/{id}/status gửi expectedStatus, kiểm lại actor/session sau khóa và bảo vệ ADMIN ACTIVE. Không đổi role, assign/reassign, Order/Delivery/Payment status hoặc audit schema.

KPI toàn tập có định nghĩa nguồn/kỳ: mọi thời gian tách cohort đơn tạo trong kỳ; thanh toán thành công ghi nhận tính paidAt với COMPLETED/SUCCESS/matching amount, không phải lợi nhuận/tiền thực nhận. Business timestamps LocalDateTime theo JVM; test chỉ định riêng Asia/Ho_Chi_Minh, auth ClockUTC giữ nguyên. Preset lấy businessToday từ backend, không UTC date của browser. Xem [định nghĩa reporting](../docs/phase7-reporting-definitions.md).

Cache theo account; invalidate sau mutation, không optimistic hoặc tự retry POST/PUT khi chưa rõ kết quả. Status recovery GET đúng account, GET lỗi giữ khóa/manual check. Tạo profile response mất thì clear password, kiểm email/role chính xác trong GET có giới hạn; không thấy ở page đầu không chứng minh chưa tạo. Password chỉ memory, không trim/lowercase hoặc persist. Hồ sơ ADMIN dùng Me; không name/role editor giả.

Test Giai đoạn7 chỉ fooddelivery_stage7_e2e ở127.0.0.1:3307, validate/OSIV=false. Schema-only từ Stage6, fixture mới;3QA lịch sử không copy/repair. Evidence/config/credential và scripts ở F:/New folder/food-delivery-mysql-test/phase7-20261110, ngoài Git. Không chạy server/test với datasource main3309. Không dùng các script test như migration production.

Playwright dùng ba batch trên cùng artifact: admin.spec.ts (20), driver.spec.ts (16), rồi auth.spec.ts/customer.spec.ts/restaurant.spec.ts/responsive.spec.ts/ui-upgrade.spec.ts (34). Khởi động lại đúng backend test giữa batch để giữ limiter hiện có, không tắt/nâng hạn mức. Fixture credential JSON cần các role cũ, stage4/catalog metadata, DRIVER_OTHER/OTHER_RESTAURANT và ADMIN_OTHER/ADMIN_BROWSER_C/D/E/ADMIN_RACE_A/B; tất cả random và ngoài Git. Race actors/PASSWORD_CUSTOMER phải tạo fixture mới nếu chạy lại, không reset dữ liệu cũ để che kết quả. Các ADMIN browser được phân bổ để không vượt10login/email/15phút.

```powershell
$env:FOOD_E2E_BASE_URL = 'http://localhost:4173'
$env:FOOD_E2E_CREDENTIAL_FILE = '<external-test-dir>\credentials.json'
npm.cmd exec playwright -- test admin.spec.ts
# Dừng/khởi động lại chỉ backend test đã xác minh sở hữu trước batch kế tiếp.
npm.cmd exec playwright -- test driver.spec.ts
# Fixture password mới và backend test mới trước batch auth/hồi quy.
npm.cmd exec playwright -- test auth.spec.ts customer.spec.ts restaurant.spec.ts responsive.spec.ts ui-upgrade.spec.ts
```

Xem [architecture](../docs/phase7-architecture.md), [routes](../docs/phase7-admin-routes.md), [API](../docs/phase7-api-integration.md), [business rules](../docs/phase7-business-rules.md), [security](../docs/phase7-security-tests.md), [test results](../docs/phase7-test-results.md), [handover](../docs/phase7-result.md). Backend/runtime test và preview phải dừng sau nghiệm thu; giữ logs/data và không dừng MySQL80 hoặc tiến trình chưa xác minh chủ sở hữu. Không commit/push/deploy.

## Phase 8 — audit and isolated HTTPS staging

The UI now submits the revision displayed by Customer/Restaurant/Driver/Admin forms.
A stale/ABA revision returns409, preserves the draft and requires explicit reload;
background refetch must not silently replace the revision. New Zod bootstrap configuration
uses `jitless` parsing so a strict `script-src self` CSP does not trigger dynamic-code probes.
No unsafe-eval exception was added. Unit/component verification is309 tests at this revision.
Authentication snapshots are published once by AuthProvider so route guards and protected
children observe the same logout/account-switch state. Pointer-opened mobile navigation
explicitly focuses its trigger so Escape also works on WebKit.

Browser environment: FOOD_E2E_BROWSER=chromium|firefox|webkit. For the private local CA only,
FOOD_E2E_BASE_URL=https://localhost:18443 and FOOD_E2E_LOCAL_TLS=true restrict browser TLS
exceptions to that origin. Node/API probes additionally trust the external CA using
NODE_EXTRA_CA_CERTS; independent Python probes verify the CA and hostname. This is not
public production TLS certification. The Windows root trust store was not changed.

The existing70 cases run for each engine; `e2e/phase8.spec.ts` adds strict precondition,
actual ABA draft retention, concurrent cart and HTTP contract cases. Run these extra cases
only with the isolated backend's `fooddelivery.concurrency.require-preconditions=true`.
Invoke `npm.cmd exec playwright -- test --config playwright.phase8.config.ts` for those
five cases. The added full-audit case verifies fractional menu/cart/checkout prices;
the original four security/concurrency cases remain unchanged. The default config
contains the 70 compatibility cases. Both configurations
are mandatory acceptance gates; separating their server modes does not disable a gate.
Compatibility regressions retain the defaultfalse. Do not run audit logins in parallel
with shared E2E actors or weaken the login limiter after a harness-induced429.

See [staging](../docs/phase8-staging-guide.md), [cross-browser results](../docs/phase8-cross-browser.md),
[performance](../docs/phase8-performance-results.md) and [handover](../docs/phase8-result.md).
Retain all failed/interrupted attempts as evidence and report them separately from the
frozen-artifact acceptance run. No public hosting or frontend authentication rewrite.

Full audit, 11 November 2026:315 frontend unit/component tests, plus70 compatibility
and5 strict cases per browser. The current audit also fixes stale retry401 session
invalidation and preserves two server decimal places when displaying money. See the
[full-audit results](../docs/full-audit-test-results.md); Phase8 counts above are history.
