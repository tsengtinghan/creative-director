#!/usr/bin/env python3
"""
Removes prompts containing the word "infographic" (case-insensitive) from
highest_liked_prompts.json and regenerates sequential ranks for remaining prompts.
"""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_PATH = os.path.join(SCRIPT_DIR, "highest_liked_prompts.json")

def main():
    with open(FILE_PATH, "r") as f:
        prompts = json.load(f)

    original_count = len(prompts)

    # Filter out prompts containing "infographic" (case-insensitive)
    filtered = [p for p in prompts if "infographic" not in p.get("prompt", "").lower()]

    removed_count = original_count - len(filtered)

    # Regenerate sequential ranks
    for i, prompt in enumerate(filtered):
        prompt["rank"] = i + 1

    with open(FILE_PATH, "w") as f:
        json.dump(filtered, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Removed {removed_count} prompts containing 'infographic'")
    print(f"Remaining prompts: {len(filtered)} (re-ranked 1 to {len(filtered)})")

if __name__ == "__main__":
    main()
