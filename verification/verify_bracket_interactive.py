from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000/")
    page.wait_for_timeout(2000)

    try:
        page.click("text=Bypass Auth (Dev Only)")
        page.wait_for_timeout(2000)
    except Exception as e:
        print("Could not click Bypass Auth:", e)

    try:
        page.click("text=Brackets")
        page.wait_for_timeout(3000)
    except Exception as e:
        page.goto("http://localhost:3000/brackets")
        page.wait_for_timeout(3000)

    # Click a team to advance them
    page.click("button:has-text('Mexico')")
    page.wait_for_timeout(500)
    page.click("button:has-text('South Korea')")
    page.wait_for_timeout(500)

    # Click them again in round 2
    page.click("button:has-text('Mexico'):nth-child(1)")
    page.wait_for_timeout(500)

    page.screenshot(path="verification/screenshots/verification_interactive.png")

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
