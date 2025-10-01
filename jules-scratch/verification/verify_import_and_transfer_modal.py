from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app and log in
        page.goto("http://localhost:3000")

        # Wait for the login form to be visible
        expect(page.locator("#login-form")).to_be_visible(timeout=10000)

        page.fill("#login-usuario", "admin")
        page.fill("#login-senha", "admin00")
        page.click("#login-submit")

        # 2. Wait for navigation to complete and navigate to the Importar page
        expect(page.locator("#page-title")).to_have_text("Dashboard", timeout=10000)

        # Click the navigation link for "Importar"
        page.click("a[data-view='importar']")

        # 3. Verify the Importar page and take a screenshot
        expect(page.locator("#page-title")).to_have_text("Importar Dados")

        # Check if the refactored forms are present
        expect(page.locator("#importar-form-proprietarios")).to_be_visible()
        expect(page.locator("#importar-form-imoveis")).to_be_visible()
        expect(page.locator("#importar-form-participacoes")).to_be_visible()
        expect(page.locator("#importar-form-alugueis")).to_be_visible()

        page.screenshot(path="jules-scratch/verification/01_import_page.png")
        print("Screenshot of the import page taken.")

        # 4. Click the "Nova Transferência" button and verify the modal
        page.click("#btn-novas-transferencias")

        # Wait for the modal to appear and be visible
        modal = page.locator("#modal-transferencias")
        expect(modal).to_be_visible(timeout=5000)

        # Check for the modal title
        expect(modal.locator(".modal-title")).to_have_text("Nova Transferência")

        # Take a screenshot of the modal
        page.screenshot(path="jules-scratch/verification/02_transfer_modal.png")
        print("Screenshot of the new transfer modal taken.")

        # 5. Verify the modal can be closed
        # Using the 'data-bs-dismiss' attribute is a reliable way to find the close button
        close_button = modal.locator("button[data-bs-dismiss='modal']")
        close_button.click()

        # Wait for the modal to be hidden
        expect(modal).to_be_hidden(timeout=5000)
        print("Modal closed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)