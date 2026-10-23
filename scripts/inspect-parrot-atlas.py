"""Read sprite registration data; never redraw or modify generated artwork."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "qa/parrot/parrot-atlas-v1.png"
image = Image.open(source).convert("RGBA")
width, height = image.size
cell_width, cell_height = width / 4, height / 4
frames = []
for index in range(16):
    rect = (round(index % 4 * cell_width), round(index // 4 * cell_height),
            round((index % 4 + 1) * cell_width), round((index // 4 + 1) * cell_height))
    cell = image.crop(rect)
    feet = []
    for y in range(int(cell.height * .70), cell.height):
        for x in range(int(cell.width * .35), int(cell.width * .9)):
            red, green, blue, alpha = cell.getpixel((x, y))
            if alpha > 200 and red > 100 and red > green * 1.1 and green > blue * 1.5:
                feet.append((x, y))
    if not feet:
        raise ValueError(f"No gripping feet found in frame {index}")
    frames.append({"index": index, "rect": [rect[0], rect[1], cell.width, cell.height],
                   "bounds": cell.getchannel("A").point(lambda a: 255 if a >= 192 else 0).getbbox(),
                   "anchor": [round(sum(x for x, y in feet) / len(feet), 2),
                              max(y for x, y in feet)]})
result = {"source": "parrot-atlas-v1.png", "width": width, "height": height,
          "columns": 4, "rows": 4, "cellWidth": cell_width, "cellHeight": cell_height,
          "alphaExtrema": image.getchannel("A").getextrema(), "frames": frames}
(root / "qa/parrot/atlas-registration.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
