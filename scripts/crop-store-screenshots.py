"""Crop the status bar from the six existing phone listing drafts.

Run from the repository root: python scripts/crop-store-screenshots.py
These source mockups are outdated; output is NOT approved for store submission.
"""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

from PIL import Image

source = Path("attached_assets/store_assets")
output = Path("generated-artifacts/store-screenshots-ui-only")
output.mkdir(parents=True, exist_ok=True)
manifest = []
for prefix in ("ios", "phone"):
    for number in range(1, 4):
        name = f"{prefix}_screenshot_{number}.png"
        with Image.open(source / name) as image:
            # Both draft generators explicitly draw the OS bar at y=0..63.
            cropped = image.crop((0, 64, image.width, image.height))
            cropped.save(output / name, optimize=True)
            manifest.append({
                "file": name,
                "source": str(source / name),
                "removed_top_pixels": 64,
                "size": list(cropped.size),
            })
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
(output / "README.txt").write_text(
    "Interface-only crops of six OLD listing mockups. Originals are unchanged.\n"
    "The clock, signal and battery/status icons have been removed from the top.\n"
    "These mockups do not show the current five-tab app; do not submit them as current screenshots.\n"
    "Crop-only files are iOS 1242x2624 and Android 1080x1856. Cropping changes dimensions;\n"
    "final iOS captures must be exported at an accepted App Store screenshot size.\n"
    "No iPad/tablet images are included: tablet support is disabled.\n"
)
archive = output.parent / "333-lives-interface-only-draft-screenshots.zip"
with ZipFile(archive, "w", ZIP_DEFLATED) as zip_file:
    for path in sorted(output.iterdir()):
        zip_file.write(path, path.name)
print(f"Cropped {len(manifest)} screenshots; originals preserved. Download: {archive}")
