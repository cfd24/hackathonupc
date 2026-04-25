import requests
import time

def run_comparison(fullness):
    url = "http://localhost:8080/compare"
    payload = {
        "boxes": 1000,
        "destinations": 20,
        "fullness": fullness
    }
    
    print(f"\n>>> TESTING FULLNESS: {fullness.upper()} <<<")
    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=60)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"Server response in {elapsed:.2f}s")
            
            # Print Table Header
            print(f"{'Metric':<20} | {'Simple':<15} | {'Greedy':<15}")
            print("-" * 55)
            
            metrics = [
                ('Total Time (m)', lambda d: round(d['total_time']/60, 2)),
                ('Pallets/Hour', lambda d: d['pallets_per_hour']),
                ('Efficiency (%)', lambda d: round(d['full_pallets_pct'], 1)),
                ('Relocations', lambda d: d['relocations']),
                ('Final Occupancy', lambda d: f"{d['occupancy']*100:.1f}%")
            ]
            
            for label, func in metrics:
                s_val = func(data['simple'])
                g_val = func(data['greedy'])
                print(f"{label:<20} | {s_val:<15} | {g_val:<15}")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    for level in ['empty', 'low', 'medium', 'high']:
        run_comparison(level)
