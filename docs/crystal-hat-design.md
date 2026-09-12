# Crystal wizard hat

Final game asset: `public/item-icons/H06.png` (128×128 RGBA). This is a stable artwork filename; the catalogue ID is now **H07**. Moon hat is H06. Both prices remain 120 coins.

Created with the built-in image generation tool, using the original crystal cap and process wizard hat as references. The final transparent image was resized with nearest-neighbor sampling for the game. The same asset is used by the catalogue and character renderer.

Design prompt: Redesign the cyan crystal cap into a tall pointed, slightly bent wizard hat with a broad elliptical brim, matching the process wizard hat silhouette. Preserve icy cyan/turquoise crystal identity, faceted surfaces, white-blue highlights and small angular crystal ornaments. Match compact pixel RPG item style, dark outlines and simple readable shading. One centered hat, no head, text, frame, shadow or background; transparent PNG.

Final extraction prompt: Preserve the exact cyan crystal wizard hat design, outline and pixel art. Remove the gray-white checkerboard pixels and output genuine transparent RGBA. Hat only, isolated, no shadow, square game icon ready to downsample.

Save schema 3 swaps H06/H07 after applying any schema 1→2 migrations. Old servers remain compatible through versioned schema 1 transport. To update Google Sheets, replace Code.gs, update the existing web-app deployment, and run migrateItemCatalog once (safe to repeat).
