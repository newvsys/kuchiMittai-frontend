import json
from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PROMO_DIR = ROOT / "public" / "promo"
CONFIG = PROMO_DIR / "promo-config.json"
OUTPUT = PROMO_DIR / "trynat-social-promo.mp4"
LOGO = ROOT / "public" / "logo.png"

WIDTH = 1080
HEIGHT = 1080
FPS = 24
SLIDE_FRAMES = 60
TRANSITION_FRAMES = 12
END_CARD_FRAMES = 84


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    font_path = Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf")
    if not font_path.exists():
        font_path = Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf")
    return ImageFont.truetype(str(font_path), size) if font_path.exists() else ImageFont.load_default()


def promo_frame(path: Path) -> Image.Image:
    source = Image.open(path).convert("RGB")
    background = ImageOps.fit(source, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
    background = ImageEnhance.Brightness(background.filter(ImageFilter.GaussianBlur(30))).enhance(0.62)

    foreground = ImageOps.contain(source, (WIDTH - 48, HEIGHT - 150), method=Image.Resampling.LANCZOS)
    x = (WIDTH - foreground.width) // 2
    y = (HEIGHT - foreground.height) // 2
    background.paste(foreground, (x, y))
    return background


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, font: ImageFont.FreeTypeFont, fill: str) -> None:
    bounds = draw.textbbox((0, 0), text, font=font)
    x = (WIDTH - (bounds[2] - bounds[0])) // 2
    draw.text((x, y), text, font=font, fill=fill)


def end_card() -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#f6efdf")
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, WIDTH, 18), fill="#16804a")
    draw.rectangle((0, HEIGHT - 18, WIDTH, HEIGHT), fill="#e7a439")

    logo = Image.open(LOGO).convert("RGBA")
    logo.thumbnail((310, 310), Image.Resampling.LANCZOS)
    logo_box = (WIDTH - 340, 120, WIDTH + 340, 460)
    draw.rounded_rectangle(logo_box, radius=32, fill="white")
    image.paste(logo, ((WIDTH - logo.width) // 2, 135), logo)

    draw_centered(draw, "TASTE TRADITION. CHOOSE NATURAL.", 520, load_font(38, bold=True), "#3b2415")
    draw_centered(draw, "Authentic foods, made with care", 585, load_font(28), "#56634a")

    button_box = (130, 700, WIDTH - 130, 835)
    draw.rounded_rectangle(button_box, radius=28, fill="#552a12")
    url_font = load_font(58, bold=True)
    url = "www.trynat.com"
    bounds = draw.textbbox((0, 0), url, font=url_font)
    x = (WIDTH - (bounds[2] - bounds[0])) // 2
    y = button_box[1] + (button_box[3] - button_box[1] - (bounds[3] - bounds[1])) // 2 - bounds[1]
    draw.text((x, y), url, font=url_font, fill="white")
    draw_centered(draw, "EXPLORE OUR COLLECTION", 885, load_font(24, bold=True), "#3b2415")
    return image


def write_transition(writer: imageio.core.format.Writer, previous: Image.Image, current: Image.Image) -> None:
    for frame_number in range(1, TRANSITION_FRAMES + 1):
        fraction = frame_number / TRANSITION_FRAMES
        frame = Image.blend(previous, current, fraction)
        writer.append_data(np.asarray(frame, dtype=np.uint8))


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    slides = [promo_frame(ROOT / "public" / item["src"].lstrip("/")) for item in config if item.get("active")]
    final_card = end_card()

    with imageio.get_writer(
        OUTPUT,
        fps=FPS,
        codec="libx264",
        quality=8,
        pixelformat="yuv420p",
        macro_block_size=None,
        ffmpeg_log_level="error",
        output_params=["-movflags", "+faststart"],
    ) as writer:
        previous = None
        for slide in slides:
            if previous is not None:
                write_transition(writer, previous, slide)
            for _ in range(SLIDE_FRAMES):
                writer.append_data(np.asarray(slide, dtype=np.uint8))
            previous = slide

        write_transition(writer, previous, final_card)
        for _ in range(END_CARD_FRAMES):
            writer.append_data(np.asarray(final_card, dtype=np.uint8))

    print(f"Created {OUTPUT}")
    print(f"Slides: {len(slides)} | Resolution: {WIDTH}x{HEIGHT} | Duration: about {(len(slides) * SLIDE_FRAMES + (len(slides) * TRANSITION_FRAMES) + END_CARD_FRAMES) / FPS:.1f}s")


if __name__ == "__main__":
    main()