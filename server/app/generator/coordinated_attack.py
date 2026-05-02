#app/generator/coordinated_attack.py
def run_scenario(step):
    sequence = [
        {"type": "failed_login"},
        {"type": "failed_login"},
        {"type": "failed_login"},
        {"type": "successful_login"},
        {"type": "node_access", "node": "A"},
        {"type": "node_access", "node": "B"},
        {"type": "node_access", "node": "C"},
        {"type": "drone_activity"}
    ]

    return sequence[step] if step < len(sequence) else None