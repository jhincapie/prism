from playwright.sync_api import sync_playwright

def verify_chart_loads():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000")
            page.wait_for_selector("text=Simulation Results", timeout=15000)

            # Wait a bit for the chart to render (it's canvas/SVG)
            page.wait_for_timeout(2000)

            # Take screenshot of the simulation tab
            page.screenshot(path="verification/chart_verified.png")
            print("Chart screenshot taken")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_chart_loads()
