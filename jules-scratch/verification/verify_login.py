from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the login page
        page.goto("http://localhost:3000")

        # Wait for the login form to be visible
        expect(page.locator("#login-form")).to_be_visible()

        # Fill in the login form
        page.fill("input[name='usuario']", "testuser")
        page.fill("input[name='senha']", "test123")

        # Click the login button
        page.click("button[type='submit']")

        # Wait for a specific, visible element on the dashboard
        dashboard_heading = page.get_by_role("heading", name="Evolução de Receitas")
        expect(dashboard_heading).to_be_visible(timeout=15000)

        # Take a screenshot of the dashboard
        page.screenshot(path="jules-scratch/verification/dashboard_screenshot.png")
        print("Screenshot saved to jules-scratch/verification/dashboard_screenshot.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
        raise e

    finally:
        # Clean up
        context.close()
        browser.close()

with sync_playwright() as playwright:
    run(playwright)