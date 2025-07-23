import { test, expect } from '@playwright/test';

test.describe('Lesson Creation', () => {
  test('should create a lesson with tutor and student', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're on login page and handle authentication
    if (page.url().includes('login') || page.locator('input[type="email"]').isVisible()) {
      // Fill in login credentials
      await page.fill('input[type="email"]', 'luka@dgcgroup.co');
      await page.fill('input[type="password"]', 'Lukste11');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate to lessons page through sidebar
    // Look for the tutoring section in sidebar and click lessons
    await page.click('[data-testid="sidebar-tutoring"], .sidebar-item:has-text("Tutoring")');
    await page.click('[data-testid="sidebar-lessons"], .sidebar-item:has-text("Lessons")');
    
    // Wait for lessons page to load
    await page.waitForSelector('text="Lessons"', { timeout: 10000 });
    
    // Click on "Add Lesson" button or similar
    await page.click('button:has-text("Add Lesson"), button:has-text("Create Lesson"), [data-testid="add-lesson-button"]');
    
    // Wait for the lesson creation form to appear
    await page.waitForSelector('form, [data-testid="lesson-form"]', { timeout: 5000 });
    
    // Fill in the lesson form
    // Title field
    await page.fill('input[name="title"], [data-testid="lesson-title"]', 'Math Tutoring Session');
    
    // Select tutor from dropdown
    await page.click('[data-testid="tutor-select"], select[name="tutor_id"], input[name="tutor_id"]');
    await page.waitForTimeout(1000); // Let dropdown load
    await page.click('option:first-child, [role="option"]:first-child, .select-option:first-child');
    
    // Select student from dropdown  
    await page.click('[data-testid="student-select"], select[name="student_id"], input[name="student_id"]');
    await page.waitForTimeout(1000); // Let dropdown load
    await page.click('option:first-child, [role="option"]:first-child, .select-option:first-child');
    
    // Set start time (today + 1 hour)
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const startTimeString = startTime.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    
    await page.fill('input[name="start_time"], [data-testid="start-time"]', startTimeString);
    
    // Set end time (2 hours from now)
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const endTimeString = endTime.toISOString().slice(0, 16);
    
    await page.fill('input[name="end_time"], [data-testid="end-time"]', endTimeString);
    
    // Optional: Add description
    await page.fill('textarea[name="description"], [data-testid="lesson-description"]', 'Algebra and geometry review session');
    
    // Optional: Select a service if dropdown exists
    const serviceSelect = page.locator('select[name="service_id"], [data-testid="service-select"]');
    if (await serviceSelect.isVisible()) {
      await serviceSelect.click();
      await page.waitForTimeout(500);
      await page.click('option:nth-child(2), [role="option"]:nth-child(2)'); // Skip first option which might be placeholder
    }
    
    // Optional: Select location if dropdown exists
    const locationSelect = page.locator('select[name="location_id"], [data-testid="location-select"]');
    if (await locationSelect.isVisible()) {
      await locationSelect.click();
      await page.waitForTimeout(500);
      await page.click('option:first-child, [role="option"]:first-child');
    }
    
    // Submit the form
    await page.click('button[type="submit"], button:has-text("Create Lesson"), button:has-text("Save Lesson"), [data-testid="submit-lesson"]');
    
    // Wait for success indication
    await page.waitForTimeout(2000);
    
    // Verify lesson was created - look for success message or return to lessons list
    await expect(page.locator('text="Lesson created successfully", text="Success", .success-message')).toBeVisible({ timeout: 10000 });
    
    // Verify we can see the lesson in the lessons table
    await expect(page.locator('text="Math Tutoring Session"')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Lesson creation test completed successfully');
  });
  
  test('should validate required fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Handle authentication if needed
    if (page.url().includes('login') || page.locator('input[type="email"]').isVisible()) {
      await page.fill('input[type="email"]', 'luka@dgcgroup.co');
      await page.fill('input[type="password"]', 'Lukste11');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }
    
    // Navigate to lessons and try to create lesson
    await page.click('[data-testid="sidebar-tutoring"], .sidebar-item:has-text("Tutoring")');
    await page.click('[data-testid="sidebar-lessons"], .sidebar-item:has-text("Lessons")');
    await page.click('button:has-text("Add Lesson"), button:has-text("Create Lesson")');
    
    // Try to submit form without filling required fields
    await page.click('button[type="submit"], button:has-text("Create Lesson"), button:has-text("Save Lesson")');
    
    // Verify validation messages appear
    await expect(page.locator('text="required", text="This field is required", .error-message')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Form validation test completed successfully');
  });
});