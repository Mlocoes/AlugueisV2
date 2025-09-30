from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Navigate to the app and log in
        page.goto("http://localhost:3000")

        # Target the main login screen form to avoid ambiguity
        login_screen = page.locator("#login-screen")
        expect(login_screen).to_be_visible(timeout=10000)

        login_screen.get_by_label("Usuário").fill("admin")
        login_screen.get_by_label("Senha").fill("admin")
        login_screen.get_by_role("button", name="Entrar").click()

        # 2. Navigate to the "Extras" page
        # Wait for navigation to complete and a known element on the dashboard to be visible
        expect(page.get_by_role("heading", name="Dashboard")).to_be_visible(timeout=10000)

        # Click the "Extras" link in the sidebar
        page.get_by_role("link", name="Extras").click()

        # 3. Wait for the transfers table to load and click the first edit button
        # Wait for the table to be populated
        expect(page.locator("#transferencias-table-body tr")).to_have_count(1, timeout=15000)

        # Find and click the first edit button in the transfers table
        first_edit_button = page.locator("#transferencias-table-body .btn-outline-primary").first
        expect(first_edit_button).to_be_enabled()
        first_edit_button.click()

        # 4. Verify the modal content
        modal = page.locator("#modal-transferencias")
        expect(modal).to_be_visible()

        # Check if the title is correct
        modal_title = modal.locator("#modalTransferenciasLabel")
        expect(modal_title).to_have_text("Editar Transferência")

        # Check if some data is loaded (e.g., the transfer name is not empty)
        transfer_name_input = modal.locator("#transferencia-nome")
        expect(transfer_name_input).not_to_be_empty()

        print("✅ Verification successful: Edit modal opened with correct title and data.")

        # 5. Take a screenshot for visual confirmation
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("📸 Screenshot saved to jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"❌ Verification failed: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        print("📸 Error screenshot saved to jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)