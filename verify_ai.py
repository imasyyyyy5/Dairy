from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    page.goto("http://localhost:3000/app.html")
    page.evaluate('localStorage.setItem("mdn_profile", JSON.stringify({name: "My Dairy", role: "farmer", animals: [], onboarded: true}))')
    page.goto("http://localhost:3000/app.html")
    page.wait_for_timeout(2000)

    try:
        page.locator('#m-newpage button:has-text("Cancel")').click(timeout=1000)
        page.wait_for_timeout(1000)
    except:
        pass

    # CUJ 1: Check Milkmen due right alignment in Calc Tab
    page.evaluate("document.querySelector('.nb[onclick*=\"calc\"]').click()")
    page.wait_for_timeout(1000)
    page.screenshot(path="/home/jules/verification/screenshots/calc_tab.png")
    page.wait_for_timeout(1000)

    # CUJ 2: Check AI chat button formatting
    page.evaluate("document.querySelector('.nb[onclick*=\"graphs\"]').click()")
    page.wait_for_timeout(1000)

    # We will expand it manually by directly changing the variable if needed or clicking the mini-in.
    page.evaluate("""
        if(document.querySelector('#aic-mini-in')){
            document.querySelector('#aic-mini-in').focus();
            setTimeout(() => {
              if (typeof aiMessages !== 'undefined') {
                aiMessages.push({ role:'assistant', content: 'Here is the PDF you requested!\\n\\n[ACTION: viewHisaabForMilkmen() | Open Milkmen PDF]\\n\\n[ACTION: openSettings() | Settings]' });
                aiRenderLog();
              }
            }, 100);
        }
    """)
    page.wait_for_timeout(1000)
    page.screenshot(path="/home/jules/verification/screenshots/ai_chat.png")
    page.wait_for_timeout(1000)

    try:
        page.locator('button:has-text("Open Milkmen PDF")').click(force=True, timeout=1000)
    except:
        pass
    page.wait_for_timeout(1000)

    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use mobile emulation to ensure goTab functions correctly if needed
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            viewport={'width': 375, 'height': 812},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
