import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Set viewport to a mobile size
        await page.set_viewport_size({"width": 375, "height": 812}) # iPhone X

        # Go to the application
        await page.goto("http://localhost:3000")

        # Wait for the login modal to be visible
        login_modal = page.locator("#loginModal")
        await expect(login_modal).to_be_visible(timeout=10000)

        # Fill in the credentials
        await page.locator("#usuario").fill("admin")
        await page.locator("#senha").fill("admin")

        # Click the login button
        await page.locator("#loginForm button[type='submit']").click()

        # Wait for the dashboard to be visible after login
        dashboard = page.locator("#dashboard")
        await expect(dashboard).to_be_visible(timeout=10000)

        # Click the sidebar toggle to open the menu
        sidebar_toggle = page.locator("#sidebar-toggle")
        await expect(sidebar_toggle).to_be_visible()
        await sidebar_toggle.click()

        # Click on the "Proprietários" link in the sidebar
        proprietarios_link = page.locator("a[href='#proprietarios']")
        await proprietarios_link.click()

        # Wait for the proprietarios tab to be visible
        proprietarios_tab = page.locator("#proprietarios")
        await expect(proprietarios_tab).to_be_visible()

        # Wait for the table to be populated, assuming at least one row will appear
        # We target a td with the data-label we added
        await expect(page.locator("td[data-label='Proprietário']").first).to_be_visible(timeout=10000)

        # Wait a moment for animations to complete
        await page.wait_for_timeout(500)

        # Take a screenshot
        await page.screenshot(path="jules-scratch/verification/responsive_proprietarios.png")

        await browser.close()

asyncio.run(main())
