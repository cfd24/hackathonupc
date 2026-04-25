import requests
import time

def test_compare_high_load():
    url = "http://localhost:8080/compare"
    payload = {
        "boxes": 1000,
        "destinations": 20,
        "fullness": "high"
    }
    
    print(f"Sending request to {url} with 75% fullness stress test...")
    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=30)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"Success! Response received in {elapsed:.2f} seconds.")
            
            for algo in ['simple', 'greedy']:
                metrics = data[algo]
                print(f"\nResults for {algo}:")
                print(f"  Total Time: {metrics['total_time']:.2f}s")
                print(f"  Pallets/hour: {metrics['pallets_per_hour']}")
                print(f"  Occupancy: {metrics['occupancy']:.2%}")
                # Note: full_pallets_pct is not in the JSON response yet, 
                # but we can check the server logs for the printed value.
                # Actually, I should probably add it to the JSON response.
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_compare_high_load()
