import { lazy, Suspense } from 'react';
import {
  AdminProfilePage as AdminProfile,
  AdminCustomerDetail,
  AdminOrderDetail,
  AdminPaymentDetail,
} from '@/features/admin-management/ExistingPages';
import {
  BusinessReportCenter,
  BusinessReportPage,
} from '@/features/admin-management/BusinessReports';
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
const DriverDashboard = lazy(() =>
  import('@/features/driver-management/DashboardPages').then((m) => ({
    default: m.DriverDashboard,
  })),
);
const DriverAnalytics = lazy(() =>
  import('@/features/driver-management/DashboardPages').then((m) => ({
    default: m.DriverAnalyticsPage,
  })),
);
const DriverProfile = lazy(() =>
  import('@/features/driver-management/ProfilePage').then((m) => ({
    default: m.DriverProfilePage,
  })),
);
const DriverDeliveries = lazy(() =>
  import('@/features/driver-management/DeliveryPages').then((m) => ({
    default: m.DriverDeliveriesPage,
  })),
);
const DriverDetail = lazy(() =>
  import('@/features/driver-management/DeliveryPages').then((m) => ({
    default: m.DriverDeliveryDetailPage,
  })),
);
const DriverAvailable = lazy(() =>
  import('@/features/driver-management/DeliveryPages').then((m) => ({
    default: m.DriverAvailablePage,
  })),
);
const DriverHistory = lazy(() =>
  import('@/features/driver-management/DeliveryPages').then((m) => ({
    default: m.DriverHistoryPage,
  })),
);
const driverPages: Record<string, import('react').ReactNode> = {
  dashboard: <DriverDashboard />,
  profile: <DriverProfile />,
  deliveries: <DriverDeliveries />,
  'deliveries/:id': <DriverDetail />,
  available: <DriverAvailable />,
  history: <DriverHistory />,
  analytics: <DriverAnalytics />,
};
const AdminDriverDetail = lazy(() =>
  import('@/features/admin-management/ProfilePages').then((m) => ({
    default: m.AdminDriverProfileDetail,
  })),
);
const Phase70 = lazy(() =>
  import('@/features/admin-management/DashboardPages').then((module) => ({
    default: module.AdminDashboard,
  })),
);
const Phase71 = lazy(() =>
  import('@/features/admin-management/DashboardPages').then((module) => ({
    default: module.AdminAnalyticsPage,
  })),
);
const Phase72 = lazy(() =>
  import('@/features/admin-management/ListPages').then((module) => ({
    default: module.AdminAccountsPage,
  })),
);
const Phase73 = lazy(() =>
  import('@/features/admin-management/ListPages').then((module) => ({
    default: module.AdminCustomersPage,
  })),
);
const Phase74 = lazy(() =>
  import('@/features/admin-management/ListPages').then((module) => ({
    default: module.AdminRestaurantsPage,
  })),
);
const Phase75 = lazy(() =>
  import('@/features/admin-management/ListPages').then((module) => ({
    default: module.AdminDriversPage,
  })),
);
const Phase76 = lazy(() =>
  import('@/features/admin-management/ListPages').then((module) => ({
    default: module.AdminOrdersPage,
  })),
);
const Phase77 = lazy(() =>
  import('@/features/admin-management/ListPages').then((module) => ({
    default: module.AdminDeliveriesPage,
  })),
);
const Phase78 = lazy(() =>
  import('@/features/admin-management/ListPages').then((module) => ({
    default: module.AdminPaymentsPage,
  })),
);
const Phase79 = lazy(() =>
  import('@/features/admin-management/ListPages').then((module) => ({
    default: module.AdminReviewsPage,
  })),
);
const Phase710 = lazy(() =>
  import('@/features/admin-management/AccountPage').then((module) => ({
    default: module.AdminAccountDetail,
  })),
);
const Phase711 = lazy(() =>
  import('@/features/admin-management/ProfilePages').then((module) => ({
    default: module.AdminRestaurantDetail,
  })),
);
const Phase712 = lazy(() =>
  import('@/features/admin-management/DeliveryDetail').then((module) => ({
    default: module.AdminDeliveryDetail,
  })),
);
const AdminCreateRestaurant = lazy(() =>
  import('@/features/admin-management/CreatePages').then((m) => ({
    default: m.AdminCreateRestaurant,
  })),
);
const AdminCreateDriver = lazy(() =>
  import('@/features/admin-management/CreatePages').then((m) => ({ default: m.AdminCreateDriver })),
);
const adminExistingPages: Record<string, import('react').ReactNode> = {
  reports: <BusinessReportCenter />,
  'reports/orders': <BusinessReportPage key="orders-report" kind="orders" />,
  'reports/delivery': <BusinessReportPage key="delivery-report" kind="delivery" />,
  'restaurants/new': <AdminCreateRestaurant />,
  'drivers/new': <AdminCreateDriver />,
  dashboard: <Phase70 />,
  analytics: <Phase71 />,
  accounts: <Phase72 />,
  customers: <Phase73 />,
  restaurants: <Phase74 />,
  drivers: <Phase75 />,
  orders: <Phase76 />,
  deliveries: <Phase77 />,
  payments: <Phase78 />,
  reviews: <Phase79 />,
  'accounts/:id': <Phase710 />,
  'restaurants/:id': <Phase711 />,
  'deliveries/:id': <Phase712 />,
  profile: <AdminProfile />,
  'customers/:id': <AdminCustomerDetail />,
  'drivers/:id': <AdminDriverDetail />,
  'orders/:id': <AdminOrderDetail />,
  'payments/orders/:orderId': <AdminPaymentDetail />,
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
    [
      'DRIVER',
      'driver',
      ['dashboard', 'profile', 'deliveries', 'deliveries/:id', 'available', 'history', 'analytics'],
    ],
    [
      'ADMIN',
      'admin',
      [
        'reports',
        'reports/orders',
        'reports/delivery',
        'dashboard',
        'profile',
        'accounts',
        'accounts/:id',
        'customers',
        'customers/:id',
        'restaurants',
        'restaurants/new',
        'restaurants/:id',
        'drivers',
        'drivers/new',
        'drivers/:id',
        'orders',
        'orders/:id',
        'deliveries',
        'deliveries/:id',
        'payments',
        'payments/orders/:orderId',
        'reviews',
        'analytics',
      ],
    ],
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
            ) : role === 'DRIVER' ? (
              driverPages[child]
            ) : role === 'ADMIN' && adminExistingPages[child] ? (
              adminExistingPages[child]
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
