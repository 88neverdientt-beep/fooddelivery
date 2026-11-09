import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet, Link, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AuthenticatedRoute, GuestOnlyRoute, RoleProtectedRoute, SessionGate } from './guards';
import { Spinner, StatusPage, ErrorState } from '@/components/feedback';
import { ApiError } from '@/lib/api/http';
const Home = lazy(() =>
  import('@/features/public/PublicPages').then((m) => ({ default: m.HomePage })),
);
const Restaurants = lazy(() =>
  import('@/features/public/PublicPages').then((m) => ({ default: m.RestaurantListPage })),
);
const Restaurant = lazy(() =>
  import('@/features/public/RestaurantDetail').then((m) => ({ default: m.RestaurantDetailPage })),
);
const Food = lazy(() =>
  import('@/features/public/FoodDetail').then((m) => ({ default: m.FoodDetailPage })),
);
const Cart = lazy(() => import('@/features/cart/CartPage').then((m) => ({ default: m.CartPage })));
const Checkout = lazy(() =>
  import('@/features/checkout/CheckoutPage').then((m) => ({ default: m.CheckoutPage })),
);
const Orders = lazy(() =>
  import('@/features/orders/OrderPages').then((m) => ({ default: m.OrdersPage })),
);
const OrderDetail = lazy(() =>
  import('@/features/orders/OrderPages').then((m) => ({ default: m.OrderDetailPage })),
);
const MyRatings = lazy(() =>
  import('@/features/ratings/RatingPages').then((m) => ({ default: m.MyRatingsPage })),
);
const Login = lazy(() =>
  import('@/features/auth/AuthPages').then((m) => ({ default: m.LoginPage })),
);
const Register = lazy(() =>
  import('@/features/auth/AuthPages').then((m) => ({ default: m.RegisterPage })),
);
const Account = lazy(() =>
  import('@/features/account/AccountPages').then((m) => ({ default: m.AccountPage })),
);
const Password = lazy(() =>
  import('@/features/account/AccountPages').then((m) => ({ default: m.ChangePasswordPage })),
);
const Workspace = lazy(() =>
  import('@/features/workspace/Workspace').then((m) => ({ default: m.WorkspaceLayout })),
);
const Dashboard = lazy(() =>
  import('@/features/workspace/Workspace').then((m) => ({ default: m.DashboardPage })),
);
const Future = lazy(() =>
  import('@/features/workspace/Workspace').then((m) => ({ default: m.FutureFeaturePage })),
);
const ManagementDashboard = lazy(() =>
  import('@/features/restaurant-management/DashboardPages').then((m) => ({
    default: m.RestaurantDashboard,
  })),
);
const ManagementAnalytics = lazy(() =>
  import('@/features/restaurant-management/DashboardPages').then((m) => ({
    default: m.RestaurantAnalyticsPage,
  })),
);
const ManagementProfile = lazy(() =>
  import('@/features/restaurant-management/ProfilePage').then((m) => ({
    default: m.RestaurantProfilePage,
  })),
);
const ManagementMenu = lazy(() =>
  import('@/features/restaurant-management/MenuPages').then((m) => ({
    default: m.RestaurantMenuPage,
  })),
);
const ManagementMenuEdit = lazy(() =>
  import('@/features/restaurant-management/MenuPages').then((m) => ({
    default: m.RestaurantMenuEditor,
  })),
);
const ManagementOrders = lazy(() =>
  import('@/features/restaurant-management/OrderPages').then((m) => ({
    default: m.RestaurantOrdersPage,
  })),
);
const ManagementOrderDetail = lazy(() =>
  import('@/features/restaurant-management/OrderPages').then((m) => ({
    default: m.RestaurantOrderDetail,
  })),
);
const ManagementReviews = lazy(() =>
  import('@/features/restaurant-management/ReviewsPage').then((m) => ({
    default: m.RestaurantReviewsPage,
  })),
);
const managementPages: Record<string, import('react').ReactNode> = {
  dashboard: <ManagementDashboard />,
  profile: <ManagementProfile />,
  menu: <ManagementMenu />,
  'menu/new': <ManagementMenuEdit />,
  'menu/:id/edit': <ManagementMenuEdit />,
  orders: <ManagementOrders />,
  'orders/:id': <ManagementOrderDetail />,
  reviews: <ManagementReviews />,
  analytics: <ManagementAnalytics />,
};
function LazyOutlet() {
  return (
    <Suspense fallback={<Spinner label="Đang mở trang…" />}>
      <Outlet />
    </Suspense>
  );
}
function RouteFailure() {
  return (
    <div className="container error-page">
      <ErrorState error={new ApiError(500, 'ROUTE')} />
      <Link to="/" className="button button-primary">
        Về trang chủ
      </Link>
    </div>
  );
}
const roleRoutes = (
  [
    ['CUSTOMER', 'customer', ['profile', 'cart', 'checkout', 'orders', 'orders/:id', 'ratings']],
    [
      'RESTAURANT',
      'restaurant',
      [
        'dashboard',
        'profile',
        'menu',
        'menu/new',
        'menu/:id/edit',
        'orders',
        'orders/:id',
        'reviews',
        'analytics',
      ],
    ],
    ['DRIVER', 'driver', ['dashboard', 'profile', 'deliveries']],
    ['ADMIN', 'admin', ['dashboard', 'accounts', 'restaurants', 'drivers']],
  ] as const
).map(([role, path, children]) => ({
  element: <RoleProtectedRoute role={role} />,
  children: [
    {
      path,
      element: <Workspace />,
      children: [
        {
          index: true,
          element: role === 'CUSTOMER' ? <Dashboard /> : <Navigate to="dashboard" replace />,
        },
        ...children.map((child) => ({
          path: child,
          element:
            role === 'RESTAURANT' ? (
              managementPages[child]
            ) : child === 'profile' ? (
              <Account />
            ) : child === 'dashboard' ? (
              <Dashboard />
            ) : role === 'CUSTOMER' ? (
              child === 'cart' ? (
                <Cart />
              ) : child === 'checkout' ? (
                <Checkout />
              ) : child === 'orders' ? (
                <Orders />
              ) : child === 'orders/:id' ? (
                <OrderDetail />
              ) : (
                <MyRatings />
              )
            ) : (
              <Future />
            ),
        })),
      ],
    },
  ],
}));
export const routes = [
  {
    element: <PublicLayout />,
    errorElement: <RouteFailure />,
    children: [
      {
        element: <LazyOutlet />,
        children: [
          { index: true, element: <Home /> },
          { path: 'restaurants', element: <Restaurants /> },
          { path: 'restaurants/:id', element: <Restaurant /> },
          { path: 'restaurants/:id/food/:foodId', element: <Food /> },
          { path: '403', element: <StatusPage forbidden /> },
          { path: '404', element: <StatusPage /> },
          { path: '*', element: <StatusPage /> },
          {
            element: <SessionGate />,
            children: [
              {
                element: <GuestOnlyRoute />,
                children: [
                  { path: 'login', element: <Login /> },
                  { path: 'register', element: <Register /> },
                ],
              },
              {
                element: <AuthenticatedRoute />,
                children: [
                  { path: 'account', element: <Account /> },
                  { path: 'account/change-password', element: <Password /> },
                  ...roleRoutes,
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
export const router = createBrowserRouter(routes);
