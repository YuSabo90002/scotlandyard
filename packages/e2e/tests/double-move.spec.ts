import { test, expect, type Page } from '@playwright/test';

/**
 * Helper function to create a room and return the room ID
 */
async function createRoom(page: Page, playerName: string): Promise<string> {
  // Navigate to homepage
  await page.goto('/');

  // Wait for connection
  await expect(page.getByText('接続中')).toBeVisible({ timeout: 10000 });

  // Click create room
  await page.getByRole('button', { name: /ルームを作成/ }).click();

  // Enter player name
  await page.getByPlaceholder('名前を入力').fill(playerName);

  // Submit
  await page.getByRole('button', { name: /作成/ }).click();

  // Wait for waiting room screen - look for "ルーム待機中" heading
  await expect(page.getByRole('heading', { name: /ルーム待機中/ })).toBeVisible({ timeout: 5000 });

  // Extract room ID from the waiting room display
  const roomIdText = await page.locator('text=/^[A-Z0-9]{6,8}$/').first().textContent();
  const roomId = roomIdText?.trim() || '';

  return roomId;
}

/**
 * Helper function to join a room
 */
async function joinRoom(page: Page, roomId: string, playerName: string): Promise<void> {
  // Navigate to homepage
  await page.goto('/');

  // Wait for connection
  await expect(page.getByText('接続中')).toBeVisible({ timeout: 10000 });

  // Click join room
  await page.getByRole('button', { name: /ルームに参加/ }).click();

  // Enter player name
  await page.getByPlaceholder('名前を入力').fill(playerName);

  // Enter room ID
  await page.getByPlaceholder('例: ABC123').fill(roomId);

  // Submit
  await page.getByRole('button', { name: /参加/ }).click();

  // Wait for waiting room screen
  await expect(page.getByRole('heading', { name: /ルーム待機中/ })).toBeVisible({ timeout: 5000 });
}

test.describe('Double Move and Position Reveal', () => {
  test('should reveal Mr. X position at correct turns', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      // Setup: Create room and join players
      const roomId = await createRoom(page1, 'Mr. X');
      await joinRoom(page2, roomId, '刑事1');
      await joinRoom(page3, roomId, '刑事2');

      // Start game
      await page1.getByRole('button', { name: /ゲーム開始/ }).click();

      // Wait for game to start
      await Promise.all([
        page1.waitForSelector('canvas', { timeout: 15000 }),
        page2.waitForSelector('canvas', { timeout: 15000 }),
        page3.waitForSelector('canvas', { timeout: 15000 }),
      ]);

      // Check initial state - Mr. X position should be hidden for detectives
      const mrXPositionText = await page2.locator('.player-card.mrx').getByText(/位置:/).textContent();
      expect(mrXPositionText).toContain('???');

      // Check that move count is displayed
      const moveCountDisplay = page2.getByText(/Mr\. Xの移動回数:/);
      await expect(moveCountDisplay).toBeVisible();

      // Check next reveal turn is shown (should be turn 3)
      const nextRevealElement = page2.locator('.info-row').filter({ hasText: '次の位置公開:' });
      await expect(nextRevealElement).toBeVisible();
      const nextRevealText = await nextRevealElement.locator('.value').textContent();
      expect(nextRevealText).toContain('3手目');

    } finally {
      await page1.close();
      await page2.close();
      await page3.close();
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('should show Mr. X position to Mr. X player only', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      // Setup: Create room and join players
      const roomId = await createRoom(page1, 'Mr. X');
      await joinRoom(page2, roomId, '刑事1');
      await joinRoom(page3, roomId, '刑事2');

      // Start game
      await page1.getByRole('button', { name: /ゲーム開始/ }).click();

      // Wait for game to start
      await Promise.all([
        page1.waitForSelector('canvas', { timeout: 15000 }),
        page2.waitForSelector('canvas', { timeout: 15000 }),
        page3.waitForSelector('canvas', { timeout: 15000 }),
      ]);

      // Mr. X (page1) should see their position
      const mrXPanel1 = page1.locator('.player-card.mrx');
      const positionText1 = await mrXPanel1.getByText(/位置:/).textContent();
      expect(positionText1).toMatch(/位置:\s*\d+/); // Should show a number

      // Detective (page2) should see ??? for Mr. X position
      const mrXPanel2 = page2.locator('.player-card.mrx');
      const positionText2 = await mrXPanel2.getByText(/位置:/).textContent();
      expect(positionText2).toContain('???');

    } finally {
      await page1.close();
      await page2.close();
      await page3.close();
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('should display double move ticket count for Mr. X', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      // Setup: Create room and join players
      const roomId = await createRoom(page1, 'Mr. X');
      await joinRoom(page2, roomId, '刑事1');
      await joinRoom(page3, roomId, '刑事2');

      // Start game
      await page1.getByRole('button', { name: /ゲーム開始/ }).click();

      // Wait for game to start
      await Promise.all([
        page1.waitForSelector('canvas', { timeout: 15000 }),
        page2.waitForSelector('canvas', { timeout: 15000 }),
        page3.waitForSelector('canvas', { timeout: 15000 }),
      ]);

      // Mr. X should see DOUBLE ticket count in the panel
      const mrXPanel = page1.locator('.player-card.mrx');
      const doubleTicket = mrXPanel.getByText(/DOUBLE:/);
      await expect(doubleTicket).toBeVisible();

      // Should show initial count (2)
      const ticketText = await doubleTicket.textContent();
      expect(ticketText).toContain('2');

    } finally {
      await page1.close();
      await page2.close();
      await page3.close();
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('should show double move button for Mr. X', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      // Setup: Create room and join players
      const roomId = await createRoom(page1, 'Mr. X');
      await joinRoom(page2, roomId, '刑事1');
      await joinRoom(page3, roomId, '刑事2');

      // Start game
      await page1.getByRole('button', { name: /ゲーム開始/ }).click();

      // Wait for game to start
      await Promise.all([
        page1.waitForSelector('canvas', { timeout: 15000 }),
        page2.waitForSelector('canvas', { timeout: 15000 }),
        page3.waitForSelector('canvas', { timeout: 15000 }),
      ]);

      // Wait a moment for game state to fully initialize
      await page1.waitForTimeout(2000);

      // Mr. X (page1) should see double move button
      const doubleMoveButton = page1.getByRole('button', { name: /ダブルムーブ開始/ });
      await expect(doubleMoveButton).toBeVisible({ timeout: 10000 });

      // Detectives should not see double move button
      const detectiveDoubleMoveButton = page2.getByRole('button', { name: /ダブルムーブ開始/ });
      await expect(detectiveDoubleMoveButton).not.toBeVisible();

    } finally {
      await page1.close();
      await page2.close();
      await page3.close();
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });
});
