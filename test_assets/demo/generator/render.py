"""Drawing helpers: paper pages with recorded text boxes (for fake OCR), desk photos, cards."""
import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
import numpy as np

FONT_DIRS = ['/System/Library/Fonts/', '/System/Library/Fonts/Supplemental/', '/Library/Fonts/']
FONT_FILES = {
    'sans': ('HelveticaNeue.ttc', 0),
    'sans-bold': ('HelveticaNeue.ttc', 1),
    'sans-light': ('HelveticaNeue.ttc', 7),
    'sans-medium': ('HelveticaNeue.ttc', 10),
    'avenir': ('Avenir Next.ttc', 7),
    'avenir-bold': ('Avenir Next.ttc', 0),
    'avenir-demi': ('Avenir Next.ttc', 2),
    'avenir-med': ('Avenir Next.ttc', 5),
    'mono': ('Menlo.ttc', 0),
    'mono-bold': ('Menlo.ttc', 1),
    'courier': ('Courier New.ttf', 0),
    'courier-bold': ('Courier New Bold.ttf', 0),
    'serif': ('Baskerville.ttc', 0),
    'serif-bold': ('Baskerville.ttc', 1),
    'times': ('Times.ttc', 0),
    'times-bold': ('Times.ttc', 1),
    'times-italic': ('Times.ttc', 2),
    'typewriter': ('AmericanTypewriter.ttc', 0),
    'hand': ('Bradley Hand Bold.ttf', 0),
    'marker': ('MarkerFelt.ttc', 0),
    'note': ('Noteworthy.ttc', 0),
    'chalk': ('ChalkboardSE.ttc', 0),
    'rounded': ('Arial Rounded Bold.ttf', 0),
    'arial': ('Arial.ttf', 0),
    'arial-bold': ('Arial Bold.ttf', 0),
    'arial-black': ('Arial Black.ttf', 0),
    'narrow': ('Arial Narrow.ttf', 0),
    'narrow-bold': ('Arial Narrow Bold.ttf', 0),
}
_font_cache = {}


def font(name, size):
    key = (name, size)
    if key not in _font_cache:
        file, index = FONT_FILES[name]
        for directory in FONT_DIRS:
            try:
                _font_cache[key] = ImageFont.truetype(directory + file, size, index=index)
                break
            except OSError:
                continue
        else:
            raise OSError('font not found ' + file)
    return _font_cache[key]


def hex_to_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


class Sheet:
    """A rendered flat page. Records every drawn word as an OCR box (pixel coordinates)."""

    def __init__(self, width, height, paper='#fbfaf6', rng=None):
        self.width = width
        self.height = height
        self.image = Image.new('RGB', (width, height), hex_to_rgb(paper))
        self.draw = ImageDraw.Draw(self.image)
        self.words = []  # (text, x0, y0, x1, y1, line_id)
        self.rng = rng or random.Random(1)
        self._line = 0

    def text(self, xy, text, fnt, fill='#1b1b1f', anchor='la', record=True, spacing=0):
        x, y = xy
        if isinstance(fnt, tuple):
            fnt = font(*fnt)
        if isinstance(fill, str):
            fill = hex_to_rgb(fill)
        if spacing:
            # letter spaced text, recorded as a whole
            total = sum(self.draw.textlength(char, font=fnt) + spacing for char in text) - spacing
            if anchor[0] == 'm':
                x -= total / 2
            elif anchor[0] == 'r':
                x -= total
            cursor = x
            for char in text:
                self.draw.text((cursor, y), char, font=fnt, fill=fill, anchor='l' + anchor[1])
                cursor += self.draw.textlength(char, font=fnt) + spacing
            if record:
                self._record(text, x, y, x + total, fnt, anchor[1])
            return total
        self.draw.text((x, y), text, font=fnt, fill=fill, anchor=anchor)
        if record:
            bbox = self.draw.textbbox((x, y), text, font=fnt, anchor=anchor)
            self._record_boxes(text, bbox, fnt, anchor)
        return self.draw.textlength(text, font=fnt)

    def _record(self, text, x0, y, x1, fnt, vanchor):
        bbox = self.draw.textbbox((x0, y), text, font=fnt, anchor='l' + vanchor)
        self._record_boxes(text, (x0, bbox[1], x1, bbox[3]), fnt, 'l' + vanchor, exact=True)

    def _record_boxes(self, text, bbox, fnt, anchor, exact=False):
        words = text.split()
        if not words:
            return
        self._line += 1
        x0, y0, x1, y1 = bbox
        total = max(1.0, sum(self.draw.textlength(word, font=fnt) for word in words) + self.draw.textlength(' ', font=fnt) * (len(words) - 1))
        scale = (x1 - x0) / total
        cursor = x0
        space = self.draw.textlength(' ', font=fnt) * scale
        for word in words:
            width = self.draw.textlength(word, font=fnt) * scale
            self.words.append((word, cursor, y0, cursor + width, y1, self._line))
            cursor += width + space

    def line(self, p0, p1, fill='#1b1b1f', width=2):
        self.draw.line([p0, p1], fill=hex_to_rgb(fill) if isinstance(fill, str) else fill, width=width)

    def rect(self, box, fill=None, outline=None, width=1, radius=0):
        fill = hex_to_rgb(fill) if isinstance(fill, str) else fill
        outline = hex_to_rgb(outline) if isinstance(outline, str) else outline
        if radius:
            self.draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)
        else:
            self.draw.rectangle(box, fill=fill, outline=outline, width=width)

    def paste(self, image, xy, mask=None):
        if image.mode == 'RGBA':
            self.image.paste(image, xy, image)
        else:
            self.image.paste(image, xy, mask)
        self.draw = ImageDraw.Draw(self.image)

    def finish(self, grain=2.2, vignette=0.06, tilt=0.0, noise_seed=None):
        """Light paper grain + soft vignette so the flat page reads like a scan."""
        rng = np.random.default_rng(noise_seed if noise_seed is not None else self.rng.randint(0, 1 << 30))
        arr = np.asarray(self.image).astype(np.float32)
        h, w = arr.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        dist = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
        arr *= (1 - vignette * np.clip(dist - 0.3, 0, 1.2))[..., None]
        arr += rng.normal(0, grain, (h, w, 1))
        # very low frequency paper mottling
        low = rng.normal(0, 1, (h // 64 + 2, w // 64 + 2))
        low_img = Image.fromarray(((low * 20) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        arr += (np.asarray(low_img).astype(np.float32) - 128)[..., None] * 0.08
        self.image = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
        self.draw = ImageDraw.Draw(self.image)
        return self.image


def wrap_text(draw, text, fnt, max_width):
    lines = []
    for paragraph in text.split('\n'):
        words = paragraph.split(' ')
        current = ''
        for word in words:
            candidate = (current + ' ' + word).strip()
            if draw.textlength(candidate, font=fnt) <= max_width or not current:
                current = candidate
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def paragraph(sheet, x, y, text, fnt_spec, width, fill='#1b1b1f', leading=1.35, justify=False):
    fnt = font(*fnt_spec)
    lines = wrap_text(sheet.draw, text, fnt, width)
    size = fnt_spec[1]
    for index, line in enumerate(lines):
        if justify and index < len(lines) - 1 and ' ' in line:
            words = line.split(' ')
            total = sum(sheet.draw.textlength(word, font=fnt) for word in words)
            gap = (width - total) / (len(words) - 1)
            cursor = x
            for word in words:
                sheet.text((cursor, y), word, fnt, fill)
                cursor += sheet.draw.textlength(word, font=fnt) + gap
        else:
            sheet.text((x, y), line, fnt, fill)
        y += size * leading
    return y


# ---------------------------------------------------------------- desk photos


def _coeffs(src, dst):
    matrix = []
    for (x, y), (u, v) in zip(dst, src):
        matrix.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        matrix.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    a = np.array(matrix, dtype=np.float64)
    b = np.array(src, dtype=np.float64).reshape(8)
    return np.linalg.solve(a, b)


def desk_texture(width, height, kind, rng):
    nprng = np.random.default_rng(rng.randint(0, 1 << 30))
    if kind == 'wood':
        base = np.zeros((height, width, 3), np.float32)
        y = np.arange(height)[:, None]
        x = np.arange(width)[None, :]
        grain = np.sin((y * 0.045) + 6 * np.sin(x * 0.004 + y * 0.0009)) * 0.5 + 0.5
        fine = nprng.normal(0, 1, (height, width // 6 + 1))
        fine = np.asarray(Image.fromarray(((fine * 30) + 128).clip(0, 255).astype(np.uint8)).resize((width, height), Image.BILINEAR)).astype(np.float32) - 128
        shade = 0.55 + 0.35 * grain + fine / 255 * 0.5
        color = np.array([176, 128, 84], np.float32)
        base = shade[..., None] * color
        # plank joints
        for yy in range(0, height, 520):
            base[max(0, yy - 3) : yy + 3, :, :] *= 0.55
        return Image.fromarray(base.clip(0, 255).astype(np.uint8))
    if kind == 'slate':
        noise = nprng.normal(0, 1, (height // 8 + 1, width // 8 + 1))
        img = Image.fromarray(((noise * 12) + 62).clip(0, 255).astype(np.uint8)).resize((width, height), Image.BICUBIC)
        arr = np.asarray(img).astype(np.float32)
        arr += nprng.normal(0, 3, arr.shape)
        out = np.stack([arr * 0.96, arr, arr * 1.05], axis=-1)
        return Image.fromarray(out.clip(0, 255).astype(np.uint8))
    if kind == 'marble':
        noise = nprng.normal(0, 1, (height // 12 + 1, width // 12 + 1))
        img = Image.fromarray(((noise * 8) + 226).clip(0, 255).astype(np.uint8)).resize((width, height), Image.BICUBIC)
        arr = np.asarray(img).astype(np.float32)
        y = np.arange(height)[:, None]
        x = np.arange(width)[None, :]
        vein = np.abs(np.sin((x * 0.006) + (y * 0.003) + 4 * np.sin(y * 0.002)))
        arr -= (vein < 0.03) * 22
        arr += nprng.normal(0, 2, arr.shape)
        out = np.stack([arr, arr, arr * 0.985], axis=-1)
        return Image.fromarray(out.clip(0, 255).astype(np.uint8))
    if kind == 'linen':
        base = np.full((height, width, 3), (196, 184, 168), np.float32)
        y = np.arange(height)[:, None]
        x = np.arange(width)[None, :]
        weave = (np.sin(x * 0.9) * np.sin(y * 0.9)) * 6
        base += weave[..., None]
        base += nprng.normal(0, 4, base.shape)
        return Image.fromarray(base.clip(0, 255).astype(np.uint8))
    # desk: warm light grey
    noise = nprng.normal(0, 1, (height // 10 + 1, width // 10 + 1))
    img = Image.fromarray(((noise * 6) + 150).clip(0, 255).astype(np.uint8)).resize((width, height), Image.BICUBIC)
    arr = np.asarray(img).astype(np.float32) + nprng.normal(0, 2.5, (height, width))
    out = np.stack([arr * 1.04, arr, arr * 0.94], axis=-1)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def desk_photo(page, size, kind='wood', rng=None, rotation_deg=None, scale=0.82, perspective=0.05, center=None):
    """Put a flat page image on a textured desk with perspective, shadow and light falloff.
    Returns (photo, quad) where quad = page corners [tl, tr, br, bl] in photo pixel coordinates."""
    rng = rng or random.Random(3)
    width, height = size
    photo = desk_texture(width, height, kind, rng)
    page_w, page_h = page.size
    ratio = page_w / page_h
    target_h = height * scale
    target_w = target_h * ratio
    if target_w > width * 0.92:
        target_w = width * 0.92
        target_h = target_w / ratio
    cx, cy = center or (width / 2 + rng.uniform(-0.03, 0.03) * width, height / 2 + rng.uniform(-0.03, 0.03) * height)
    angle = math.radians(rotation_deg if rotation_deg is not None else rng.uniform(-6, 6))
    corners = [(-target_w / 2, -target_h / 2), (target_w / 2, -target_h / 2), (target_w / 2, target_h / 2), (-target_w / 2, target_h / 2)]
    quad = []
    for (x, y) in corners:
        xr = x * math.cos(angle) - y * math.sin(angle)
        yr = x * math.sin(angle) + y * math.cos(angle)
        # perspective: far (top) edge shrinks a bit
        depth = 1 - perspective * (0.5 - yr / target_h) * 1.0
        quad.append((cx + xr * depth + rng.uniform(-4, 4), cy + yr * (1 + perspective * 0.15 * (xr / target_w)) + rng.uniform(-4, 4)))
    # shadow
    shadow = Image.new('L', (width, height), 0)
    sd = ImageDraw.Draw(shadow)
    unit = width / 1800
    sd.polygon([(x + 14 * unit, y + 22 * unit) for x, y in quad], fill=150)
    shadow = shadow.filter(ImageFilter.GaussianBlur(26 * unit))
    dark = Image.new('RGB', (width, height), (10, 8, 6))
    photo = Image.composite(dark, photo, shadow.point(lambda v: int(v * 0.55)))
    # warp the page into the quad
    src_rect = [(0, 0), (page_w, 0), (page_w, page_h), (0, page_h)]
    coeffs = _coeffs(src_rect, quad)
    warped = page.convert('RGB').transform((width, height), Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    mask = Image.new('L', (width, height), 0)
    ImageDraw.Draw(mask).polygon(quad, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))
    photo = Image.composite(warped, photo, mask)
    # light falloff
    arr = np.asarray(photo).astype(np.float32)
    yy, xx = np.mgrid[0:height, 0:width]
    lx = rng.uniform(0.2, 0.8)
    ly = rng.uniform(0.1, 0.5)
    dist = np.sqrt(((xx / width) - lx) ** 2 + ((yy / height) - ly) ** 2)
    light = 1.12 - 0.55 * dist
    arr = arr * light[..., None]
    photo = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
    return photo, [(round(x), round(y)) for x, y in quad]


def round_corners(image, radius):
    mask = Image.new('L', image.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, image.width - 1, image.height - 1), radius=radius, fill=255)
    out = image.convert('RGBA')
    out.putalpha(mask)
    return out


def gradient(size, c0, c1, angle_deg=90):
    width, height = size
    c0 = np.array(hex_to_rgb(c0) if isinstance(c0, str) else c0, np.float32)
    c1 = np.array(hex_to_rgb(c1) if isinstance(c1, str) else c1, np.float32)
    angle = math.radians(angle_deg)
    yy, xx = np.mgrid[0:height, 0:width].astype(np.float32)
    proj = (xx / max(width, 1)) * math.cos(angle) + (yy / max(height, 1)) * math.sin(angle)
    proj = (proj - proj.min()) / max(proj.max() - proj.min(), 1e-6)
    arr = c0[None, None, :] * (1 - proj[..., None]) + c1[None, None, :] * proj[..., None]
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8))
