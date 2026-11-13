// Real isolated HTTPS UI checks; no response bodies/tokens/passwords are logged.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireFrontend = createRequire(path.resolve(__dirname, '../../frontend/package.json'));
const { chromium } = requireFrontend('@playwright/test');
const work = 'F:/New folder/fooddelivery-admin-reports-20261113';
const base = 'https://127.0.0.1:18447';
const auth = JSON.parse(fs.readFileSync(work + '/secrets/fixture-auth.json', 'utf8'));
const checks = [];
function check(name, condition) { checks.push({ name, pass: !!condition }); if (!condition) throw new Error('Check failed'); }
async function login(page, role) {
  await page.goto(base + '/login');
  await page.getByLabel('Email', { exact: true }).fill(role + '@reports.invalid');
  await page.getByLabel('Mật khẩu', { exact: true }).fill(auth.password);
  await page.getByRole('button', { name: /^Đăng nhập/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    fs.mkdirSync(work + '/screenshots', { recursive: true });
    const anon = await browser.newContext({ ignoreHTTPSErrors: true }); const ap = await anon.newPage();
    await ap.goto(base + '/admin/reports/orders'); await ap.waitForURL('**/login'); check('anonymous-route-login', true); await anon.close();
    for (const role of ['customer', 'restaurant', 'driver']) {
      const ctx = await browser.newContext({ ignoreHTTPSErrors: true }); const page = await ctx.newPage(); await login(page, role);
      for (const kind of ['orders', 'delivery']) { await page.goto(base + '/admin/reports/' + kind); await page.waitForURL('**/403'); check(role + '-route-denied-' + kind, true); }
      await ctx.close();
    }
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true, acceptDownloads: true }); const page = await ctx.newPage();
    const jsErrors = []; page.on('pageerror', () => jsErrors.push('pageerror'));
    await login(page, 'admin');
    await page.goto(base + '/admin/reports'); await page.getByRole('heading', { name: 'Trung tâm báo cáo' }).waitFor(); check('center-two-reports', await page.getByRole('link', { name: /^Mở báo cáo/ }).count() === 2);
    for (const kind of ['orders', 'delivery']) {
      await page.goto(base + '/admin/reports/' + kind); await page.getByRole('button', { name: 'Xuất Excel', exact: true }).waitFor();
      await page.getByLabel('Từ ngày', { exact: true }).fill('2026-11-01'); await page.getByLabel('Đến ngày', { exact: true }).fill('2026-11-30');
      const response = page.waitForResponse((r) => r.url().includes('/reports/' + kind + '?') && r.url().includes('to=2026-11-30'));
      await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click(); const r = await response; check(kind + '-filtered-api200', r.status() === 200);
      const data = (await r.json()).data;
      if (kind === 'orders') {
        await page.getByText('Giá trị hoàn thành đã thanh toán', { exact: true }).waitFor();
        check('sql-api-ui-orders', (await page.getByText('Giá trị hoàn thành đã thanh toán', { exact: true }).locator('..').innerText()).includes('240.000') && data.summary.amount === 240000);
        check('chart-date-no-utc-shift', data.series[0].day === '2026-11-01');
        check('trend-visible', await page.getByRole('img', { name: /Xu hướng giá trị/ }).count() === 1);
      } else { check('sql-api-ui-delivery', data.summary.successRate === 71.43 && (await page.locator('body').innerText()).includes('71,43%')); check('driver-name-preserved', await page.getByText('T'+String.fromCharCode(224)+'i x'+String.fromCharCode(7871)+' M'+String.fromCharCode(7897)+'t', { exact: true }).count() > 0); check('missing-failure-honest', await page.getByText('Không có trạng thái FAILED', { exact: true }).count() === 1); }
      const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Xuất Excel', exact: true }).click(); const file = await download; await file.saveAs(work + '/browser-' + kind + '.xlsx'); check(kind + '-download-name', file.suggestedFilename().startsWith(kind === 'orders' ? 'BaoCaoDoanhThuDonHang_' : 'BaoCaoHieuSuatGiaoHang_'));
      for (const width of [375, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 1000 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(150);
        check(kind + '-responsive-' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: work + '/screenshots/' + kind + '-' + width + '.png', fullPage: true });
      }
      await page.getByLabel(kind === 'orders' ? 'Mã nhà hàng' : 'Mã tài xế', { exact: true }).fill('999');
      const empty = page.waitForResponse((r) => r.url().includes('/reports/' + kind + '?') && r.url().includes('Id=999')); await page.getByRole('button', { name: 'Áp dụng bộ lọc' }).click(); await empty; await page.getByRole('heading', { name: 'Không có dữ liệu chi tiết' }).waitFor(); check(kind + '-empty-state', true);
    }
    check('no-unhandled-browser-errors', jsErrors.length === 0); await ctx.close();
    fs.writeFileSync(work + '/browser-results.json', JSON.stringify({ status: 'PASS', pass: checks.length, fail: 0, browser: 'Chromium', testOrigin: base, checks }, null, 2));
    console.log(JSON.stringify({ status: 'PASS', checks: checks.length, screenshots: 8 }));
  } finally { await browser.close(); }
})().catch(() => { fs.writeFileSync(work + '/browser-failure.json', JSON.stringify({ status: 'FAIL', checks, rawDetailsWithheld: true }, null, 2)); console.log(JSON.stringify({ status: 'FAIL', lastCheck: checks.at(-1), detailsWithheld: true })); process.exitCode = 1; });
