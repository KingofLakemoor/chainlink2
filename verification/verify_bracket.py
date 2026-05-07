from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000/")
    page.wait_for_timeout(2000)

    # Try clicking Bypass Auth (Dev Only) if it exists
    try:
        page.click("text=Bypass Auth (Dev Only)")
        page.wait_for_timeout(2000)
    except Exception as e:
        print("Could not click Bypass Auth:", e)

    # Navigate using UI instead of goto
    try:
        page.click("text=Brackets")
        page.wait_for_timeout(3000)
    except Exception as e:
        print("Could not click Brackets:", e)
        # fallback
        page.goto("http://localhost:3000/brackets")
        page.wait_for_timeout(3000)

    # Take a screenshot to verify we are there
    page.screenshot(path="verification/screenshots/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
