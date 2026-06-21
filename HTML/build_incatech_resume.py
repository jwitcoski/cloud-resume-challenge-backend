"""Generate INCATech-targeted resume Word document."""
import shutil
from pathlib import Path

from build_private_resume import convert

INPUT = Path(__file__).parent / "public" / "Jonathan_Witcoski_incatech_2026.md"
OUTPUT = Path(__file__).parent / "public" / "Jonathan_Witcoski_incatech_2026.docx"
DOWNLOADS = Path.home() / "Downloads" / "Jonathan_Witcoski_incatech_2026.docx"


if __name__ == "__main__":
    convert(INPUT, OUTPUT)
    shutil.copy2(OUTPUT, DOWNLOADS)
    print(f"Saved: {OUTPUT}")
    print(f"Copied: {DOWNLOADS}")
