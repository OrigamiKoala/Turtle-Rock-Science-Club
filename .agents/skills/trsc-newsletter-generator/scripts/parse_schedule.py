#!/usr/bin/env python3
"""
Schedule parser for TRSC newsletters.
Reads docs/schedule.md and outputs structured JSON for a given date or row.
"""
import argparse
import json
import sys
from pathlib import Path

def parse_schedule(schedule_path: Path):
    if not schedule_path.exists():
        sys.stderr.write(f"Error: {schedule_path} not found\n")
        sys.exit(1)

    lines = schedule_path.read_text(encoding="utf-8").splitlines()
    table_rows = []
    in_table = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("| Meeting |"):
            in_table = True
            continue
        if in_table:
            if stripped.startswith("| :----"):
                continue
            if not stripped.startswith("|"):
                break
            parts = [p.strip().replace(r"\-", "-").replace(r"\+", "+") for p in stripped.split("|")[1:-1]]
            if len(parts) >= 4:
                meeting = parts[0]
                topics = []
                for idx, t in enumerate(parts[1:], start=1):
                    if t:
                        room = "SB2-112" if idx == 1 else ("SB2-117" if idx == 2 else "SB2-122")
                        topics.append({"topic": t, "room": room})
                table_rows.append({
                    "date": meeting,
                    "topics": topics,
                    "raw": parts
                })
    return table_rows

def main():
    parser = argparse.ArgumentParser(description="Parse TRSC schedule for newsletter generation")
    parser.add_argument("--date", help="Specific date string, e.g. 9/26, 10/3")
    parser.add_argument("--output", help="Path to write JSON output", required=False)
    parser.add_argument("--schedule-file", default="docs/schedule.md", help="Path to schedule.md")

    args = parser.parse_args()
    rows = parse_schedule(Path(args.schedule_file))

    result = None
    if args.date:
        for r in rows:
            if r["date"].lower() == args.date.lower():
                result = r
                break
        if not result:
            sys.stderr.write(f"Date {args.date} not found in schedule table.\n")
            sys.exit(1)
    else:
        result = rows

    out_text = json.dumps(result, indent=2)
    if args.output:
        Path(args.output).write_text(out_text, encoding="utf-8")
        print(f"Schedule data written to {args.output}")
    else:
        print(out_text)

if __name__ == "__main__":
    main()
