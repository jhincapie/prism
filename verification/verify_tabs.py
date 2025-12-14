from playwright.sync_api import sync_playwright

def verify_tabs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")
            page.wait_for_selector("text=Simulation Results", timeout=15000)

            # 1. Verify Milestones
            page.click("text=Milestones")
            page.wait_for_timeout(1000) # Wait for render
            page.screenshot(path="verification/tab_milestones.png")
            print("Milestones screenshot taken")

            # 2. Verify FIRE
            page.click("text=FIRE")
            page.wait_for_timeout(1000) # Wait for render
            page.screenshot(path="verification/tab_fire.png")
            print("FIRE screenshot taken")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_tabs()
