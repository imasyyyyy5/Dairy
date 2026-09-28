from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    # Set seed data to bypass onboarding and have a page
    page.goto("http://localhost:3000/app.html")
    page.evaluate('localStorage.setItem("mdn_profile", JSON.stringify({name: "My Dairy", role: "farmer", animals: [], onboarded: true}))')

    # We need to dismiss m-newpage if it opens, let's close all modals.
    page.goto("http://localhost:3000/app.html")
    page.wait_for_timeout(2000)

    # Click Cancel on the New Page modal using playwright
    try:
        page.locator('#m-newpage button:has-text("Cancel")').click(timeout=1000)
        page.wait_for_timeout(1000)
    except:
        pass

    # Click on the Calc tab to see expenses
    page.locator('button:has-text("Calc")').click()
    page.wait_for_timeout(1000)

    # Add an expense
    page.locator('button[onclick="openExpenseModal()"]').click()
    page.wait_for_timeout(1000)
    page.get_by_placeholder("e.g. Feed, Medical...").fill("Test Expense")
    page.locator('#m-exp-cost').fill("100")
    page.locator('button:has-text("Save Expense")').click()
    page.wait_for_timeout(1000)

    # Try deleting the expense to show the confirmation dialog
    page.locator('button[onclick*="deleteExpense"]').click()
    page.wait_for_timeout(1000)

    # Take screenshot at the key moment (showing the confirmation dialog)
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

    # The timeout is 5 seconds, so we wait 6 seconds max
    page.wait_for_timeout(6000)

    # Confirm deletion
    page.locator('#m-confirm button:has-text("Confirm")').click()
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()  # MUST close context to save the video
            browser.close()
