import { it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { createCustomerApi } from './customer/api';
import { createRestaurantApi } from './restaurant-management/api';
import { createDriverApi } from './driver-management/api';
import { createAdminApi } from './admin-management/api';
import { RestaurantProfileForm } from './restaurant-management/ProfilePage';
import { DriverProfileForm } from './driver-management/ProfilePage';
import { account } from '@/test/fixtures';
const common = {
  name: 'Original',
  phoneNumber: '0900000000',
  address: 'Isolated revision test',
  version: 4,
  createdAt: null,
};
const restaurant = { ...common, restaurantId: 1, restaurantStatus: true };
const driver = {
  ...common,
  driverId: 1,
  email: 'driver@test.invalid',
  licensePlate: 'QA08',
  driveStatus: true,
};

it('Customer API preserves the supplied form revision and strips privilege fields', async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ...common, customerId: 1, email: 'customer@test.invalid', version: 5 });
  await createCustomerApi(request, () => account()).update({ ...common, expectedVersion: 4 }, 1);
  expect(request).toHaveBeenCalledWith('/customers/1', {
    method: 'PUT',
    body: {
      name: common.name,
      phoneNumber: common.phoneNumber,
      address: common.address,
      expectedVersion: 4,
    },
  });
});
it('Restaurant API forwards the form revision instead of discarding it', async () => {
  const request = vi.fn().mockResolvedValue({ ...restaurant, version: 5 });
  await createRestaurantApi(request, () => account('RESTAURANT')).updateProfile({
    ...restaurant,
    expectedVersion: 4,
  });
  expect(request.mock.calls[0][1].body.expectedVersion).toBe(4);
});
it('Driver API forwards the form revision instead of discarding it', async () => {
  const request = vi.fn().mockResolvedValue({ ...driver, version: 5 });
  await createDriverApi(request, () => account('DRIVER')).updateProfile({
    ...driver,
    expectedVersion: 4,
  });
  expect(request.mock.calls[0][1].body.expectedVersion).toBe(4);
});
it('Admin status writer forwards revision along with expected state', async () => {
  const request = vi.fn().mockResolvedValue({ ...account('CUSTOMER'), status: 'DISABLED' });
  await createAdminApi(request, () => account('ADMIN', 99)).status(1, 'DISABLED', 'ACTIVE', 4);
  expect(request.mock.calls[0][1].body).toEqual({
    status: 'DISABLED',
    expectedStatus: 'ACTIVE',
    expectedVersion: 4,
  });
});
it('Admin full-profile writer preserves revision and rejects a negative revision', async () => {
  const request = vi.fn().mockResolvedValue({ ...restaurant, email: 'r@test.invalid', version: 5 });
  const api = createAdminApi(request, () => account('ADMIN', 99));
  await api.saveRestaurant(1, { ...restaurant, expectedVersion: 4 });
  expect(request.mock.calls[0][1].body.expectedVersion).toBe(4);
  await expect(api.saveRestaurant(1, { ...restaurant, expectedVersion: -1 })).rejects.toBeDefined();
  expect(request).toHaveBeenCalledTimes(1);
});
it('Restaurant draft keeps its original revision even when query data changes', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  function Harness() {
    const [current, setCurrent] = useState(restaurant);
    return (
      <>
        <button onClick={() => setCurrent({ ...restaurant, version: 6 })}>
          Receive refreshed data
        </button>
        <RestaurantProfileForm profile={current} busy={false} onSave={save} />
      </>
    );
  }
  const router = createMemoryRouter([{ path: '/', Component: Harness }]);
  render(<RouterProvider router={router} />);
  await userEvent.type(screen.getByLabelText('Tên nhà hàng'), ' draft');
  await userEvent.click(screen.getByRole('button', { name: 'Receive refreshed data' }));
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thông tin nhà hàng' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0].expectedVersion).toBe(4);
  expect(save.mock.calls[0][0].name).toContain('draft');
});
it('Driver draft advances revision only after its own successful save', async () => {
  const save = vi.fn().mockResolvedValue({ ...driver, version: 5 });
  const router = createMemoryRouter([
    {
      path: '/',
      Component: () => <DriverProfileForm profile={driver} busy={false} onSave={save} />,
    },
  ]);
  render(<RouterProvider router={router} />);
  await userEvent.type(screen.getByLabelText('Họ tên tài xế'), ' draft');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ tài xế' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(save.mock.calls[0][0].expectedVersion).toBe(4);
  await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ tài xế' }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(save.mock.calls[1][0].expectedVersion).toBe(5);
});
