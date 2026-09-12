"""Extract the approved text-free atlas, removing only border-connected backdrop.

Usage: python scripts/extract-item-icons.py INPUT.png
White metal/cloth enclosed by an item's dark outline is never colour-keyed out.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

source = Image.open(sys.argv[1]).convert('RGB')
assert source.size == (1619, 972), 'Unexpected atlas layout'
target = Path(__file__).resolve().parents[1] / 'public' / 'item-icons'
target.mkdir(parents=True, exist_ok=True)
xs = [0, 170, 330, 491, 651, 812, 973, 1134, 1295, 1456, 1619]
ys = [53, 203, 339, 467, 634, 770, 923]
preview = Image.new('RGB', (800, 576), '#193b47')
draw = ImageDraw.Draw(preview)
for row, prefix in enumerate('CFHWAT'):
    for col in range(10):
        rgb = np.array(source.crop((xs[col], ys[row], xs[col+1], ys[row+1])))
        lo, hi = rgb.min(axis=2), rgb.max(axis=2)
        # The simulated checkerboard is neutral grey. Flood only from outside;
        # bright enclosed white clothing and silver highlights remain opaque.
        delta = hi.astype(int)-lo.astype(int)
        # Dark grey safety shoes need a conservative edge threshold.
        eligible = (delta < (27 if (row,col)==(1,7) else 65)) & (lo > (95 if (row,col)==(1,7) else 70))
        seed = np.zeros_like(eligible)
        seed[0,:] = eligible[0,:]; seed[-1,:] = eligible[-1,:]
        seed[:,0] = eligible[:,0]; seed[:,-1] = eligible[:,-1]
        background = ndimage.binary_propagation(seed, mask=eligible)
        # The orange bow's open string encloses backdrop, not metal/cloth.
        if (row,col)==(3,9):
            background |= eligible
        alpha = np.where(background, 0, 255).astype('uint8')
        # Remove disconnected backdrop residue, keeping the paired components
        # of boots, earrings and the small deliberate weapon particles.
        components, count = ndimage.label(alpha > 0)
        sizes = np.bincount(components.ravel())
        for label in range(1, count+1):
            if sizes[label] < 18 or ((row,col)==(5,9) and label != np.argmax(sizes[1:])+1):
                alpha[components == label] = 0
        rgba = np.dstack((rgb, alpha))
        rgba[alpha == 0, :3] = 0
        icon = Image.fromarray(rgba)
        bounds = icon.getbbox()
        assert bounds, (row, col)
        icon = icon.crop(bounds)
        icon.thumbnail((112,112), Image.Resampling.LANCZOS)
        tile = Image.new('RGBA', (128,128))
        tile.alpha_composite(icon, ((128-icon.width)//2,(128-icon.height)//2))
        code = f'{prefix}{col+1:02d}'
        tile.save(target / f'{code}.png')
        p = tile.resize((76,76), Image.Resampling.LANCZOS)
        preview.paste(p,(col*80+2,row*96),p)
        draw.text((col*80+29,row*96+78),code,fill='#e4f5ff')
        a = np.array(tile.getchannel('A'))
        assert (a == 0).mean() > .25 and (a == 255).sum() > 100
preview.save(target.parent.parent / 'item-icons-preview.png')
print('Extracted and validated 60 RGBA icons, 128x128 with transparent margins.')
