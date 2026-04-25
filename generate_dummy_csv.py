import csv
import random

def generate_semi_empty_silo(filename, occupancy=0.118, total_boxes=903, num_destinations=20):
    aisles = 4
    sides = 2
    x_max = 60
    y_max = 8
    z_max = 2
    
    total_slots = aisles * sides * x_max * y_max * z_max
    
    # Generate destinations
    destinations = [f"{random.randint(10000000, 99999999)}" for _ in range(num_destinations)]
    
    # Generate all possible positions
    all_positions = []
    for a in range(1, aisles + 1):
        for s in range(1, sides + 1):
            for x in range(1, x_max + 1):
                for y in range(1, y_max + 1):
                    for z in range(1, z_max + 1):
                        all_positions.append(f"{a:02d}{s:02d}{x:03d}{y:02d}{z:02d}")
    
    # Pick random positions
    # Constraint: if z=2 is picked, z=1 must also be picked (or we just pick randomly and fix later)
    # To be safe, we'll just pick randomly and if we pick z=2, we ensure z=1 is in the set.
    
    selected_positions = set()
    while len(selected_positions) < total_boxes:
        pos = random.choice(all_positions)
        a, s, x, y, z = pos[0:2], pos[2:4], pos[4:7], pos[7:9], pos[9:11]
        
        if z == "02":
            z1_pos = f"{a}{s}{x}{y}01"
            selected_positions.add(z1_pos)
        
        selected_positions.add(pos)
        
        if len(selected_positions) > total_boxes:
            # If we exceeded due to z1 addition, just stop or trim
            break

    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['posicion', 'etiqueta'])
        for pos in list(selected_positions)[:total_boxes]:
            dest = random.choice(destinations)
            src = f"{random.randint(1000000, 9999999)}"
            bulk = f"{random.randint(10000, 99999)}"
            etiqueta = f"{src}{dest}{bulk}"
            writer.writerow([pos, etiqueta])

if __name__ == "__main__":
    generate_semi_empty_silo('silo-semi-empty.csv')
    print("Generated silo-semi-empty.csv")
