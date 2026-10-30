import requests
import time

BASE_URL = "http://localhost:8080/api/items"
LIMIT = 12
TOTAL_PAGES = 42
TOTAL_RUNS = 100          # change to 1 if you just want to test

def run_one_pagination():
    for page in range(1, TOTAL_PAGES + 1):
        url = f"{BASE_URL}?page={page}&limit={LIMIT}&mode=pagination"
        response = requests.get(url)
        
        if response.status_code == 200:
            print(f"Page {page:2d} → OK")
        else:
            print(f"Page {page:2d} → Error {response.status_code}")
        
        # small delay so the server is not overloaded
        time.sleep(0.1)

if __name__ == "__main__":
    for run in range(1, TOTAL_RUNS + 1):
        print(f"\n=== Starting Run {run}/{TOTAL_RUNS} ===")
        run_one_pagination()
        print(f"=== Run {run} finished ===")
        
        # Wait a bit so you have time to check Prometheus
        if run < TOTAL_RUNS:
            print("Waiting 5 seconds before next run...")
            time.sleep(5)