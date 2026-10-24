from playwright.sync_api import sync_playwright
import time

PAGE_URL = "http://localhost:8080/infinite"
TOTAL_RUNS = 25
SCROLLS_PER_RUN = 42          # same amount of data as pagination (42 pages)
PAUSE_BETWEEN_SCROLLS = 0.8   # seconds (adjust if loading is slow)
PAUSE_BETWEEN_RUNS = 5        # seconds so you can check Prometheus

def run_one_infinite_scroll(page):
    page.goto(PAGE_URL)
    page.wait_for_load_state("networkidle")

    for i in range(SCROLLS_PER_RUN):
        # Scroll to the bottom
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        
        # Wait for new items to load
        time.sleep(PAUSE_BETWEEN_SCROLLS)
        
        print(f"  Scroll {i+1}/{SCROLLS_PER_RUN}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # set True if you don't want to see the browser
        context = browser.new_context()
        page = context.new_page()

        for run in range(1, TOTAL_RUNS + 1):
            print(f"\n=== Starting Infinite Scroll Run {run}/{TOTAL_RUNS} ===")
            run_one_infinite_scroll(page)
            print(f"=== Run {run} finished ===")

            if run < TOTAL_RUNS:
                print(f"Waiting {PAUSE_BETWEEN_RUNS} seconds... (check Prometheus now)")
                time.sleep(PAUSE_BETWEEN_RUNS)

        browser.close()
        print("\nAll runs completed.")

if __name__ == "__main__":
    main()