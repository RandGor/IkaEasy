from pathlib import Path
import math

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images"
SOURCES = IMAGES / "buildings" / "source"
REFERENCE = IMAGES / "buildingbutton_sprite.jpg"
OUTPUT = IMAGES / "buildingbutton_sprite.webp"
WEBP_QUALITY = 85

SCALE = 4
ROW_HEIGHT = 41
Y_OFFSET = 6  # 1.5 pixels at the final CSS size.

BOUNDS = [
    0, 43, 86, 129, 172, 215, 258, 301, 345, 388, 431, 474, 517,
    560, 603, 646, 689, 733, 776, 819, 862, 905, 948, 991, 1034,
    1077, 1121, 1164, 1207, 1250, 1295, 1340, 1384, 1427, 1471,
]

BUILDINGS = [
    "townHall", "academy", "warehouse", "tavern", "palace",
    "palaceColony", "museum", "port", "shipyard", "barracks", "wall",
    "embassy", "branchOffice", "workshop", "safehouse", "forester",
    "glassblowing", "alchemist", "winegrower", "stonemason",
    "carpentering", "optician", "fireworker", "vineyard", "architect",
    "temple", "dump", "pirateFortress", "blackMarket", None,
    "marineChartArchive", "dockyard", "shrineOfOlympus", "chronosForge",
]


def moments(values):
    weight = sum(value for _, _, value in values)
    if not weight:
        return 0, 0, 1
    center_x = sum(x * value for x, _, value in values) / weight
    center_y = sum(y * value for _, y, value in values) / weight
    radius = math.sqrt(sum(
        ((x - center_x) ** 2 + (y - center_y) ** 2) * value
        for x, y, value in values
    ) / weight)
    return center_x, center_y, radius


def reference_moments(reference, index):
    cell = reference.crop((BOUNDS[index], ROW_HEIGHT, BOUNDS[index + 1], ROW_HEIGHT * 2))
    values = []
    for y in range(4, cell.height - 4):
        for x in range(4, cell.width - 4):
            red, green, blue = cell.getpixel((x, y))
            chroma = max(red, green, blue) - min(red, green, blue)
            darkness = 255 - (red + green + blue) / 3
            value = max(0, darkness - 24) + 0.7 * max(0, chroma - 16)
            if value > 8:
                values.append((x, y, value * value))
    return moments(values)


def source_moments(image):
    values = []
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = image.getpixel((x, y))
            if alpha < 18:
                continue
            chroma = max(red, green, blue) - min(red, green, blue)
            darkness = 255 - (red + green + blue) / 3
            value = (alpha / 255) * (
                12 + max(0, darkness - 18) + 0.5 * max(0, chroma - 12)
            )
            values.append((x, y, value))
    return moments(values)


def prepare_icon(building, index):
    icon = Image.open(SOURCES / f"{building}.png").convert("RGBA")
    visible = icon.getchannel("A").point(lambda alpha: 255 if alpha >= 18 else 0).getbbox()
    if visible:
        left, top, right, bottom = visible
        icon = icon.crop((
            max(0, left - 2), max(0, top - 2),
            min(icon.width, right + 2), min(icon.height, bottom + 2),
        ))

    # Most large source images face the opposite direction from the sprite.
    # The tavern and the final building group already match the reference.
    if index < len(BUILDINGS) - 7 and building != "tavern":
        icon = icon.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    return icon


def render_cell(reference, building, index, faded):
    width = (BOUNDS[index + 1] - BOUNDS[index]) * SCALE
    height = ROW_HEIGHT * SCALE
    cell = Image.new("RGBA", (width, height), "#fff8e7ff")
    draw = ImageDraw.Draw(cell)
    draw.rounded_rectangle(
        (2, 2, width - 3, height - 3), radius=14,
        fill="#fff8e7", outline="#d7a35f", width=3,
    )

    if building is None:
        source_y = 0 if faded else ROW_HEIGHT
        technical = reference.crop((1250, source_y, 1295, source_y + ROW_HEIGHT))
        technical = technical.resize((width - 8, height - 8), Image.Resampling.NEAREST)
        cell.alpha_composite(technical.convert("RGBA"), (4, 4))
        return cell

    icon = prepare_icon(building, index)
    source_x, source_y, source_radius = source_moments(icon)
    target_x, target_y, target_radius = reference_moments(reference, index)
    resize = target_radius * SCALE / source_radius if source_radius else 1
    resize = min(resize, width * 1.30 / icon.width, height * 1.30 / icon.height)
    icon = icon.resize((
        max(1, round(icon.width * resize)),
        max(1, round(icon.height * resize)),
    ), Image.Resampling.LANCZOS)
    source_x, source_y, _ = source_moments(icon)

    if faded:
        alpha = icon.getchannel("A")
        icon = Image.blend(icon, Image.new("RGBA", icon.size, "white"), 0.32)
        icon.putalpha(alpha)

    stage = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    stage.alpha_composite(icon, (
        round(target_x * SCALE - source_x),
        round(target_y * SCALE - source_y) + Y_OFFSET,
    ))

    # Keep artwork one final CSS pixel inside the brown rounded frame.
    clip = Image.new("L", (width, height), 0)
    ImageDraw.Draw(clip).rounded_rectangle(
        (8, 8, width - 9, height - 9), radius=8, fill=255,
    )
    stage.putalpha(ImageChops.multiply(stage.getchannel("A"), clip))
    cell.alpha_composite(stage)
    return cell


def main():
    reference = Image.open(REFERENCE).convert("RGB")
    sprite = Image.new("RGB", (reference.width * SCALE, reference.height * SCALE), "#fff8e7")
    for row, faded in enumerate((True, False)):
        for index, building in enumerate(BUILDINGS):
            cell = render_cell(reference, building, index, faded)
            sprite.paste(cell.convert("RGB"), (BOUNDS[index] * SCALE, row * ROW_HEIGHT * SCALE))
    sprite.save(OUTPUT, format="WEBP", quality=WEBP_QUALITY, method=6)


if __name__ == "__main__":
    main()
