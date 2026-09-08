import os
from PIL import Image, ImageDraw

def generate_assets():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(base_dir, 'public', 'logo-mark.png')
    res_dir = os.path.join(base_dir, 'android', 'app', 'src', 'main', 'res')

    if not os.path.exists(logo_path):
        print(f"Error: logo not found at {logo_path}")
        return

    logo = Image.open(logo_path).convert('RGBA')

    # Colors
    ICON_BG = (14, 10, 30, 255)       # #0E0A1E cosmic dark
    SPLASH_BG = (7, 5, 16, 255)       # #070510 deep cosmic black

    # 1. Launcher Mipmaps
    densities = {
        'mdpi': (48, 108),
        'hdpi': (72, 162),
        'xhdpi': (96, 216),
        'xxhdpi': (144, 324),
        'xxxhdpi': (192, 432),
    }

    for density, (icon_size, fg_size) in densities.items():
        folder = os.path.join(res_dir, f'mipmap-{density}')
        os.makedirs(folder, exist_ok=True)

        # A. Square ic_launcher.png
        icon_img = Image.new('RGBA', (icon_size, icon_size), ICON_BG)
        mark_size = int(icon_size * 0.72)
        resized_mark = logo.resize((mark_size, mark_size), Image.Resampling.LANCZOS)
        offset = ((icon_size - mark_size) // 2, (icon_size - mark_size) // 2)
        icon_img.paste(resized_mark, offset, resized_mark)
        icon_img.save(os.path.join(folder, 'ic_launcher.png'))

        # B. Round ic_launcher_round.png
        round_img = Image.new('RGBA', (icon_size, icon_size), (0, 0, 0, 0))
        mask = Image.new('L', (icon_size, icon_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, icon_size - 1, icon_size - 1), fill=255)
        round_img.paste(icon_img, (0, 0), mask)
        round_img.save(os.path.join(folder, 'ic_launcher_round.png'))

        # C. Foreground ic_launcher_foreground.png
        fg_img = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        fg_mark_size = int(fg_size * 0.65)
        resized_fg_mark = logo.resize((fg_mark_size, fg_mark_size), Image.Resampling.LANCZOS)
        fg_offset = ((fg_size - fg_mark_size) // 2, (fg_size - fg_mark_size) // 2)
        fg_img.paste(resized_fg_mark, fg_offset, resized_fg_mark)
        fg_img.save(os.path.join(folder, 'ic_launcher_foreground.png'))

        print(f"Generated icons for mipmap-{density}")

    # 2. Splash Screens
    splash_screens = {
        'drawable': (480, 800),
        'drawable-port-mdpi': (320, 480),
        'drawable-port-hdpi': (480, 800),
        'drawable-port-xhdpi': (720, 1280),
        'drawable-port-xxhdpi': (960, 1600),
        'drawable-port-xxxhdpi': (1280, 1920),
        'drawable-land-mdpi': (480, 320),
        'drawable-land-hdpi': (800, 480),
        'drawable-land-xhdpi': (1280, 720),
        'drawable-land-xxhdpi': (1600, 960),
        'drawable-land-xxxhdpi': (1920, 1280),
    }

    for folder_name, (width, height) in splash_screens.items():
        folder = os.path.join(res_dir, folder_name)
        os.makedirs(folder, exist_ok=True)

        splash_img = Image.new('RGBA', (width, height), SPLASH_BG)
        mark_size = int(min(width, height) * 0.35)
        resized_mark = logo.resize((mark_size, mark_size), Image.Resampling.LANCZOS)
        offset = ((width - mark_size) // 2, (height - mark_size) // 2)
        splash_img.paste(resized_mark, offset, resized_mark)
        splash_img.save(os.path.join(folder, 'splash.png'))

        print(f"Generated splash for {folder_name} ({width}x{height})")

    print("\nAll Android brand assets generated successfully!")

if __name__ == '__main__':
    generate_assets()
