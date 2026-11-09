# Kiến trúc frontend Giai đoạn 3

## Cấu trúc và lựa chọn

frontend/src/app chứa router, guards, styles; components/ui và feedback cung cấp primitive; components/layout chứa public header/footer/account menu; features/auth chứa gateway/Session/provider/form/validation; features/public đọc catalog; features/account đọc hồ sơ và đổi mật khẩu; features/workspace chứa bốn shell/navigation và màn hình nghiệp vụ tương lai; lib/api/http tách transport; lib/runtime khởi tạo QueryClient và session; types/domain kiểm tra DTO bằng Zod. Unit/component test cạnh module; Playwright ở e2e/.

React 19 + TypeScript strict trên Node 24.20.0; Vite 8 là build/dev proxy. React Router 7 dùng data router, nested guards và lazy chunks. TanStack Query 5 quản lý server state, không thay bằng React state toàn cục. Fetch native tập trung, không Axios dư thừa. React Hook Form + Zod quản lý form/validation và kiểm tra response. Radix Dialog/Dropdown quản lý focus/keyboard; Lucide icon; Tailwind 4 + CSS token tập trung; Be Vietnam Pro local hỗ trợ tiếng Việt. Vitest + Testing Library, Playwright Chromium cho kiểm chứng thật. Phiên bản cụ thể khóa trong package-lock.json, không phụ thuộc latest lúc chạy.

## Authentication và đồng thời

Session là external store trong memory, React đọc qua useSyncExternalStore/AuthProvider. Trạng thái booting/authenticated/anonymous/unavailable tách biệt. Không localStorage, sessionStorage, IndexedDB, cookie JS tự lưu access token hoặc password. Domain Account chỉ nhận role/profile hợp lệ từ server, không decode JWT để cấp quyền. Backend vẫn là nguồn phân quyền cuối cùng.

Khởi động một lần, kể cả StrictMode: Web Lock → GET /auth/csrf → POST /auth/refresh (cookie tự gửi) → GET /auth/me bằng token mới → nhận Account → mở guard đúng role. Cookie thiếu/phiên không hợp lệ trở thành anonymous; lỗi mạng trở thành unavailable với retry, không giả là sai mật khẩu. Public pages vẫn dùng được nếu phiên không khôi phục được, trừ các thao tác cần xác thực.

Trong tab dùng Promise single-flight. Giữa tab dùng navigator.locks với tên cùng origin, khóa bao trọn CSRF GET và auth POST để không đua cookie CSRF/refresh. Tab tiếp theo sử dụng cookie mới do browser quản lý, không đọc hoặc broadcast refresh token. BroadcastChannel chỉ truyền changed/signed-out, không token, accountId, email hoặc role; tab khác xóa cache/state và xác minh lại khi cần. Browser thiếu Web Locks báo không hỗ trợ, không fallback khóa không an toàn. HMR đóng channel cũ; focus xác minh lại /auth/me.

GET bảo vệ bị 401 chỉ refresh một lần và retry GET một lần; GET retry vẫn 401 thì xóa phiên. Mutation không tự phát lại, kể cả khi refresh thành công; báo người dùng kiểm tra kết quả trước khi thử lại. Đổi mật khẩu/logout-all xác minh access bằng GET an toàn trước mutation, có thể refresh trước khi gửi, nhưng không retry mutation đã gửi. Sai current password không kích hoạt phát lại POST. Logout chỉ tuyên bố thành công sau khi backend xác nhận; lỗi mạng giữ trạng thái chưa đăng xuất và báo rõ.

Generation tăng khi xóa/chuyển identity; response riêng tư cũ bị hủy hoặc không được nhận sau chuyển tài khoản. Query key riêng tư luôn có accountId từ /auth/me; logout/chuyển identity cancel query và clear cache. Không giữ dashboard hoặc dữ liệu cá nhân trong lúc boot/unavailable.

## API và routing

Fetch kiểm tra base URL, credentials include, timeout 15 giây, AbortSignal liên kết, envelope ApiResponse và domain Zod. Lỗi chuẩn hóa tiếng Việt; không render SQL/stack trace và không log body/header/token/password. Query chỉ retry một lần cho GET 5xx; mutation retry false. Public GET không đính kèm Bearer cũ; protected GET dùng session.

GuestOnlyRoute, AuthenticatedRoute, RoleProtectedRoute đặt dưới SessionGate. Lazy page imports tách public/auth/account/workspace; không bundle logic dashboard vào nội dung trang public. Route error boundary và global ErrorBoundary dùng thông báo an toàn. Wrong role → /403, anonymous → /login, thiếu route → /404 view. Parent /restaurant, /driver, /admin redirect tới dashboard thay vì shell trống.

## Design system và accessibility

Thương hiệu HanoiFood: nền ngà, cam ấm, xanh lá đậm; color/type/spacing/radius/focus token trong styles.css, Tailwind theme dùng cùng hướng thiết kế. Bố cục public có hero minh họa SVG tự tạo, dữ liệu nhà hàng thật, hướng dẫn và CTA. Không dùng ảnh nhà hàng giả hoặc KPI giả. Font tự host; SVG nhẹ, không dependency ảnh từ CDN.

Button/Input/PasswordInput/Select/Checkbox/Card/Badge/Dialog/Dropdown/Tabs/Toast/Alert/Skeleton/Spinner/Empty/Error/Pagination/Breadcrumb/Avatar/PageHeader/ConfirmDialog có semantic/ARIA/keyboard phù hợp. Label và lỗi input nối aria-describedby, error aria-invalid, dialog trap/return focus, tabs hỗ trợ arrows/Home/End, skip link và reduced motion. Kiểm tra 375/768/1024/1440; không coi kiểm thử Chromium này là chứng nhận WCAG toàn diện hoặc kiểm chứng mọi trình duyệt.

Tài liệu tham khảo chính thức: [Vite](https://vite.dev/guide/), [React Router](https://reactrouter.com/start/data/installation), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API), [Playwright](https://playwright.dev/docs/intro). Runtime không tải nội dung từ các tài liệu này.
