from playwright.sync_api import sync_playwright

def verify_app_loads():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")
            # Wait for the "PRISM" title or header
            page.wait_for_selector("text=PRISM", timeout=10000)

            # Wait for simulation to run and chart to appear (ResultsView)
            page.wait_for_selector("text=Simulation Results", timeout=15000)

            # Click AI Analysis tab
            page.click("text=AI Analysis")

            # Take screenshot
            page.screenshot(path="verification/app_verified.png")
            print("Screenshot taken successfully")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_app_loads()
