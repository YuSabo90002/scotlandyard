import { test, expect, Page } from '@playwright/test';

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
  await page.goto('/');

  // Wait for connection
  await expect(page.getByText('接続中')).toBeVisible({ timeout: 10000 });

  // Click join room
  await page.getByRole('button', { name: /ルームに参加/ }).click();

  // Enter room ID and player name
  await page.getByPlaceholder('例: ABC123').fill(roomId);
  await page.getByPlaceholder('名前を入力').fill(playerName);

  // Submit
  await page.getByRole('button', { name: /参加/ }).click();

  // Wait for waiting room screen
  await expect(page.getByRole('heading', { name: /ルーム待機中/ })).toBeVisible({ timeout: 5000 });
}

test.describe('Scotland Yard Game Flow', () => {
  test('should connect to WebSocket server successfully', async ({ page }) => {
    await page.goto('/');

    // Check for successful connection message
    await expect(page.getByText('接続中')).toBeVisible({ timeout: 10000 });

    // Verify main menu is displayed
    await expect(page.getByRole('button', { name: /ルームを作成/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /ルームに参加/ })).toBeVisible();
  });

  test('should create a room successfully', async ({ page }) => {
    const roomId = await createRoom(page, 'テストプレイヤー1');

    // Verify room ID is displayed
    expect(roomId).toMatch(/^[A-Z0-9]{6,8}$/);

    // Verify waiting room is shown
    await expect(page.getByText(/参加プレイヤー/)).toBeVisible();
    await expect(page.getByText(/テストプレイヤー1/)).toBeVisible();
  });

  test('should allow a second player to join the room', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Player 1 creates room
      const roomId = await createRoom(page1, 'プレイヤー1');

      // Player 2 joins room
      await joinRoom(page2, roomId, 'プレイヤー2');

      // Verify both players see each other in the player list
      await expect(page1.locator('.player-name', { hasText: 'プレイヤー2' })).toBeVisible({ timeout: 5000 });
      await expect(page2.locator('.player-name', { hasText: 'プレイヤー1' })).toBeVisible({ timeout: 5000 });
      await expect(page2.locator('.player-name', { hasText: 'プレイヤー2' })).toBeVisible({ timeout: 5000 });

      // Verify player count
      await expect(page1.getByText(/参加プレイヤー \(2\/6\)/)).toBeVisible();
      await expect(page2.getByText(/参加プレイヤー \(2\/6\)/)).toBeVisible();
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('should start game with 3 players', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    // Capture console logs for debugging
    page1.on('console', msg => console.log('Page1 console:', msg.text()));
    page1.on('pageerror', err => console.error('Page1 error:', err.message));

    try {
      // Player 1 creates room
      const roomId = await createRoom(page1, 'プレイヤー1');

      // Players 2 and 3 join
      await joinRoom(page2, roomId, 'プレイヤー2');
      await joinRoom(page3, roomId, 'プレイヤー3');

      // Wait for all players to see each other
      await expect(page1.getByText(/参加プレイヤー \(3\/6\)/)).toBeVisible();
      await expect(page2.getByText(/参加プレイヤー \(3\/6\)/)).toBeVisible();
      await expect(page3.getByText(/参加プレイヤー \(3\/6\)/)).toBeVisible();

      // Host (player 1) starts the game
      await page1.getByRole('button', { name: /ゲーム開始/ }).click();

      // Wait a bit for the game to initialize
      await page1.waitForTimeout(3000);

      // Debug: Check what's being rendered
      const appHTML = await page1.locator('.app-main').innerHTML();
      console.log('App main content:', appHTML.substring(0, 500));

      // Check for GameBoard component or error messages
      const hasGameBoard = appHTML.includes('game-board') || appHTML.includes('GameBoard');
      const hasCanvas = appHTML.includes('canvas');
      const hasError = appHTML.includes('error') || appHTML.includes('Error');
      console.log('Has GameBoard:', hasGameBoard, 'Has Canvas:', hasCanvas, 'Has Error:', hasError);

      // Wait for game to start - check for game board canvas
      await expect(page1.locator('canvas')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('canvas')).toBeVisible({ timeout: 10000 });
      await expect(page3.locator('canvas')).toBeVisible({ timeout: 10000 });
    } finally {
      await page1.close();
      await page2.close();
      await page3.close();
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('should display game board correctly for all players', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      // Setup: Create room and add 3 players
      const roomId = await createRoom(page1, 'プレイヤー1');
      await joinRoom(page2, roomId, 'プレイヤー2');
      await joinRoom(page3, roomId, 'プレイヤー3');

      // Start game
      await page1.getByRole('button', { name: /ゲーム開始/ }).click();

      // Wait for game board to load on all pages
      await Promise.all([
        page1.waitForSelector('canvas', { timeout: 15000 }),
        page2.waitForSelector('canvas', { timeout: 15000 }),
        page3.waitForSelector('canvas', { timeout: 15000 }),
      ]);

      // Verify game board elements are visible
      for (const page of [page1, page2, page3]) {
        // Check for Mr. X panel (should not throw undefined error)
        const mrXPanel = page.getByRole('heading', { name: 'Mr. X' });
        await expect(mrXPanel).toBeVisible();

        // Check for detectives panel
        const detectivesPanel = page.getByRole('heading', { name: '刑事' });
        await expect(detectivesPanel).toBeVisible();

        // Verify Phaser canvas is rendered
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();

        // Check that there are no JavaScript errors about undefined mrX
        const errors: string[] = [];
        page.on('pageerror', error => {
          errors.push(error.message);
        });

        // Wait a bit for any errors to appear
        await page.waitForTimeout(1000);

        // Verify no undefined mrX errors
        const mrXErrors = errors.filter(e => e.includes("mrX") && e.includes("undefined"));
        expect(mrXErrors).toHaveLength(0);
      }
    } finally {
      await page1.close();
      await page2.close();
      await page3.close();
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('should not allow non-host to start game', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Player 1 creates room (host)
      const roomId = await createRoom(page1, 'プレイヤー1');

      // Player 2 joins (non-host)
      await joinRoom(page2, roomId, 'プレイヤー2');

      // Player 2 should not see start button or it should be disabled
      const startButton = page2.getByRole('button', { name: /ゲーム開始/ });
      await expect(startButton).not.toBeVisible();
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('should not allow game start with less than 3 players', async ({ page }) => {
    await createRoom(page, 'プレイヤー1');

    // Try to click start button (should be disabled or show error)
    const startButton = page.getByRole('button', { name: /ゲーム開始/ });

    // Button should be disabled
    await expect(startButton).toBeDisabled();

    // Verify minimum player message
    await expect(page.getByText(/最低3人のプレイヤーが必要/)).toBeVisible();
  });
});
