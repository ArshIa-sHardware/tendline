import { test, expect, type Page } from '@playwright/test';
import { freshState } from '../src/lib/model';
const owner = '11111111-1111-4111-8111-111111111111';
const user = {
  id: owner,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'alex@example.com',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
const token = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(
    JSON.stringify({
      sub: owner,
      role: 'authenticated',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url'),
  'test-signature',
].join('.');
const session = {
  access_token: token,
  refresh_token: 'test-refresh',
  token_type: 'bearer',
  expires_in: 3600,
  user,
};
async function mockService(page: Page) {
  let record = {
    id: '33333333-3333-4333-8333-333333333333',
    owner_id: owner,
    revision: 0,
    content: freshState(),
    updated_at: new Date().toISOString(),
  };
  const calls: { path: string; method: string; data: unknown }[] = [];
  await page.route('https://notebook-test.supabase.co/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    calls.push({ path: url.pathname, method: request.method(), data: request.postDataJSON() });
    let response: unknown = {};
    if (url.pathname.endsWith('/token')) response = session;
    else if (url.pathname.endsWith('/user')) response = user;
    else if (url.pathname.endsWith('/signup')) response = { user, session: null };
    else if (url.pathname.includes('/rest/v1/notebooks')) {
      if (request.method() === 'PATCH') {
        record = {
          ...record,
          content: request.postDataJSON().content,
          revision: record.revision + 1,
        };
      }
      response = request.method() === 'GET' ? [record] : record;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
      headers: { 'access-control-allow-origin': '*' },
    });
  });
  return { calls, record: () => record };
}
async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Email address').fill('alex@example.com');
  await page.getByLabel('Password', { exact: true }).fill('correct-password-123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The days between visits.' })).toBeVisible();
}
function nav(page: Page) {
  return page.getByRole('navigation', { name: 'Main navigation', exact: true });
}

test('demo preserves sleep, caregiver, symptoms, medication, timeline and visit report', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mockService(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Try Demo mode' }).click();
  await expect(page.getByText('Demo mode', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Edit sleep log|Record last night’s sleep/ }).click();
  await page.getByRole('combobox', { name: 'Who is writing' }).selectOption('cp');
  await expect(page.getByText('And your own sleep?')).toBeVisible();
  await page.getByRole('radio', { name: 'I barely slept', exact: true }).check();
  await page.getByLabel(/Anything else/).fill('Caregiver note from browser test');
  await page.getByRole('button', { name: 'Update this night', exact: true }).click();
  await nav(page).getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Record an observation' }).click();
  await page.getByRole('button', { name: /^Medication/ }).click();
  await page.getByLabel('Medicine name', { exact: true }).fill('Example medicine');
  await page.getByLabel('Amount taken', { exact: true }).fill('1 tablet');
  await page.getByRole('button', { name: 'Save medication dose' }).click();
  await page.getByRole('button', { name: 'Log symptoms', exact: true }).click();
  await page.locator('summary').filter({ hasText: 'Moving' }).click();
  await page.getByRole('radio', { name: 'Slow or stiff', exact: true }).check();
  await page.getByRole('button', { name: 'Save check-in', exact: true }).click();
  await nav(page).getByRole('button', { name: 'Journal', exact: true }).click();
  await expect(page.getByText(/Caregiver note from browser test/)).toBeAttached();
  await expect(page.locator('.day-events').first()).toBeVisible();
  await nav(page).getByRole('button', { name: 'Visit note', exact: true }).click();
  await expect(page.getByLabel('Visit note', { exact: true })).toContainText(
    'Caregiver note from browser test',
  );
  expect(errors).toEqual([]);
});

test('real SDK login, cloud save, reload, offline queue, sync and logout', async ({
  page,
  context,
}) => {
  const service = await mockService(page);
  await login(page);
  await nav(page).getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Record an observation' }).click();
  await page.getByRole('button', { name: /^Medication/ }).click();
  await page.getByLabel('Medicine name', { exact: true }).fill('Example medicine');
  await page.getByLabel('Amount taken', { exact: true }).fill('1 tablet');
  await page.getByRole('button', { name: 'Save medication dose' }).click();
  await expect.poll(() => service.record().content.entries.length).toBe(1);
  await page.reload();
  await expect(page.getByText('Saved to your account', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.getByLabel('Keep a copy on this device for offline use').check();
  await nav(page).getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Record an observation' }).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: /^Medication/ }).click();
  await page.getByLabel('Medicine name', { exact: true }).fill('Example laxative');
  await page.getByLabel('Amount taken', { exact: true }).fill('5 mL');
  await page.getByLabel('This medicine is a laxative').check();
  await page.getByRole('button', { name: 'Save medication dose' }).click();
  await expect(
    page.getByText('On this device · cloud sync pending', { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Retry sync' }).click();
  await expect.poll(() => service.record().content.entries.length).toBe(2);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  expect(
    await page.evaluate((id) => localStorage.getItem(`bedside-cloud-v4:${id}`), owner),
  ).toBeNull();
  expect(service.calls.some((c) => c.path.endsWith('/token'))).toBe(true);
});

test('signup and email reset use Supabase Auth endpoints', async ({ page }) => {
  const service = await mockService(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Email address').fill('new@example.com');
  await page.getByLabel('Password', { exact: true }).fill('twelve-character-password');
  await page.getByLabel('Confirm password').fill('twelve-character-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText(/Check your email to confirm/)).toBeVisible();
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(/If an account exists/)).toBeVisible();
  expect(service.calls.some((c) => c.path.endsWith('/signup'))).toBe(true);
  expect(service.calls.some((c) => c.path.endsWith('/recover'))).toBe(true);
});

test('recovery link opens new-password form before notebook', async ({ page }) => {
  const service = await mockService(page);
  await page.goto(
    `/?reset=1#access_token=${token}&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=recovery`,
  );
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByLabel('Password', { exact: true }).fill('my-new-password-1234');
  await page.getByLabel('Confirm password').fill('my-new-password-1234');
  await page.getByRole('button', { name: 'Save new password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The days between visits.' })).toBeVisible();
  expect(service.calls.some((c) => c.path.endsWith('/user') && c.method === 'PUT')).toBe(true);
});

test('conflicts keep pending notes and require an explicit cloud reload', async ({ page }) => {
  await mockService(page);
  await login(page);
  await page.route('**/rest/v1/notebooks?**', async (route) => {
    if (route.request().method() === 'PATCH')
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    else await route.fallback();
  });
  await nav(page).getByRole('button', { name: 'Today', exact: true }).click();
  await page.getByRole('button', { name: 'Record an observation' }).click();
  await page.getByRole('button', { name: /^Medication/ }).click();
  await page.getByLabel('Medicine name', { exact: true }).fill('Example medicine');
  await page.getByLabel('Amount taken', { exact: true }).fill('1 tablet');
  await page.getByRole('button', { name: 'Save medication dose' }).click();
  await expect(page.getByText('Another copy changed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download current notes' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Took a dose/ })).toBeDisabled();
});

test('mobile layout has no horizontal overflow and all navigation is reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockService(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Try Demo mode' }).click();
  for (const label of ['Today', 'Calendar', 'Journal', 'Visit note', 'Settings']) {
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('button', { name: label, exact: true })
      .click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
