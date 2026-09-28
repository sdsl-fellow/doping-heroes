"""Stage 1 lattice assets, adapted from the user-provided diamond unit-cell renderer.

Run: python3 tools/render-diamond-cell.py  (requires numpy and Pillow)

Diamond-cubic conventional unit-cell renderer with transparent background and per-pixel occlusion.

Generates the intact cell and the five-site vacancy for the Stage 1 puzzle.
Notebook-only shell installation commands were converted to comments.
"""

# ============================================================
# Google Colab-ready diamond cubic unit-cell renderer
# Transparent background + correct per-pixel occlusion
#
# Changes from previous version:
#   1) Removed floor and shadow effects
#   2) Transparent background (RGBA)
# ============================================================

from __future__ import annotations

import itertools
from pathlib import Path

import numpy as np
from PIL import Image



# ============================================================
# 1. Exact diamond-cubic conventional unit cell
# ============================================================

corner_atoms = np.array(
    list(itertools.product([0.0, 1.0], repeat=3)),
    dtype=np.float64,
)

face_center_atoms = np.array(
    [
        [0.0, 0.5, 0.5],
        [1.0, 0.5, 0.5],
        [0.5, 0.0, 0.5],
        [0.5, 1.0, 0.5],
        [0.5, 0.5, 0.0],
        [0.5, 0.5, 1.0],
    ],
    dtype=np.float64,
)

internal_atoms = np.array(
    [
        [0.25, 0.25, 0.25],
        [0.25, 0.75, 0.75],
        [0.75, 0.25, 0.75],
        [0.75, 0.75, 0.25],
    ],
    dtype=np.float64,
)

atoms = np.vstack(
    [
        corner_atoms,
        face_center_atoms,
        internal_atoms,
    ]
)


# ============================================================
# 2. Exact 16 nearest-neighbor bonds
# ============================================================

bonds = np.array(
    [
        [[0.25, 0.25, 0.25], [0.0, 0.0, 0.0]],
        [[0.25, 0.25, 0.25], [0.0, 0.5, 0.5]],
        [[0.25, 0.25, 0.25], [0.5, 0.0, 0.5]],
        [[0.25, 0.25, 0.25], [0.5, 0.5, 0.0]],

        [[0.25, 0.75, 0.75], [0.0, 0.5, 0.5]],
        [[0.25, 0.75, 0.75], [0.0, 1.0, 1.0]],
        [[0.25, 0.75, 0.75], [0.5, 0.5, 1.0]],
        [[0.25, 0.75, 0.75], [0.5, 1.0, 0.5]],

        [[0.75, 0.25, 0.75], [0.5, 0.0, 0.5]],
        [[0.75, 0.25, 0.75], [0.5, 0.5, 1.0]],
        [[0.75, 0.25, 0.75], [1.0, 0.0, 1.0]],
        [[0.75, 0.25, 0.75], [1.0, 0.5, 0.5]],

        [[0.75, 0.75, 0.25], [0.5, 0.5, 0.0]],
        [[0.75, 0.75, 0.25], [0.5, 1.0, 0.5]],
        [[0.75, 0.75, 0.25], [1.0, 0.5, 0.5]],
        [[0.75, 0.75, 0.25], [1.0, 1.0, 0.0]],
    ],
    dtype=np.float64,
)


# ============================================================
# 3. Twelve unit-cell boundary edges
# ============================================================

cube_edges = []

for y in (0.0, 1.0):
    for z in (0.0, 1.0):
        cube_edges.append([[0.0, y, z], [1.0, y, z]])

for x in (0.0, 1.0):
    for z in (0.0, 1.0):
        cube_edges.append([[x, 0.0, z], [x, 1.0, z]])

for x in (0.0, 1.0):
    for y in (0.0, 1.0):
        cube_edges.append([[x, y, 0.0], [x, y, 1.0]])

cube_edges = np.asarray(cube_edges, dtype=np.float64)


# ============================================================
# 4. Structural validation
# ============================================================

assert atoms.shape == (18, 3)
assert bonds.shape == (16, 2, 3)

assert not np.any(
    np.all(
        np.isclose(atoms, [0.5, 0.5, 0.5]),
        axis=1,
    )
)

bond_lengths = np.linalg.norm(
    bonds[:, 1] - bonds[:, 0],
    axis=1,
)
assert np.allclose(
    bond_lengths,
    np.sqrt(3.0) / 4.0,
)

coordination = {
    tuple(atom): 0
    for atom in internal_atoms
}

for start, end in bonds:
    if tuple(start) in coordination:
        coordination[tuple(start)] += 1
    if tuple(end) in coordination:
        coordination[tuple(end)] += 1

assert set(coordination.values()) == {4}


# ============================================================
# 5. Object sizes and material IDs
# ============================================================

ATOM_RADIUS = 0.071
BOND_RADIUS = 0.0215
EDGE_RADIUS = 0.0068

MAT_ATOM = 0
MAT_BOND = 1
MAT_EDGE = 2
MAT_ORANGE = 3

# The restored five-site cluster: one red center and its four orange neighbors.
missing = np.array(
    [
        [0.75, 0.25, 0.75],
        [0.5, 0.0, 0.5],
        [0.5, 0.5, 1.0],
        [1.0, 0.0, 1.0],
        [1.0, 0.5, 0.5],
    ],
    dtype=np.float64,
)
orange_neighbors = missing[1:]

sphere_centers = atoms
sphere_radii = np.full(
    len(atoms),
    ATOM_RADIUS,
    dtype=np.float64,
)

cylinders = []

for segment in bonds:
    cylinders.append(
        (
            segment[0],
            segment[1],
            BOND_RADIUS,
            MAT_BOND,
        )
    )

for segment in cube_edges:
    cylinders.append(
        (
            segment[0],
            segment[1],
            EDGE_RADIUS,
            MAT_EDGE,
        )
    )


# ============================================================
# 6. Camera
# ============================================================

CAMERA = np.array(
    [3.15, -4.45, 2.90],
    dtype=np.float64,
)

TARGET = np.array(
    [0.50, 0.50, 0.47],
    dtype=np.float64,
)

WORLD_UP = np.array(
    [0.0, 0.0, 1.0],
    dtype=np.float64,
)

forward = TARGET - CAMERA
forward /= np.linalg.norm(forward)

right = np.cross(forward, WORLD_UP)
right /= np.linalg.norm(right)

up = np.cross(right, forward)
up /= np.linalg.norm(up)


# ============================================================
# 7. Image resolution and field of view
# ============================================================

WIDTH = 600
HEIGHT = 450

FOV_Y = np.deg2rad(15.8)
ASPECT = WIDTH / HEIGHT

HALF_HEIGHT = np.tan(FOV_Y / 2.0)
HALF_WIDTH = ASPECT * HALF_HEIGHT


# ============================================================
# 8. Lighting
# ============================================================

LIGHTS = [
    (
        np.array([-3.5, -4.6, 6.8]),
        np.array([1.00, 0.96, 0.90]),
    ),
    (
        np.array([4.6, -1.8, 4.2]),
        np.array([0.16, 0.19, 0.24]),
    ),
    (
        np.array([0.5, 4.5, 6.0]),
        np.array([0.28, 0.29, 0.31]),
    ),
    (
        np.array([-0.4, -5.4, 2.2]),
        np.array([0.14, 0.14, 0.14]),
    ),
]


# ============================================================
# 9. Material parameters
# ============================================================

BASE_COLOR = np.array(
    [
        [0.55, 0.018, 0.035],  # glossy ruby-red Si atom
        [0.48, 0.51, 0.56],        # silver bond
        [0.015, 0.20, 0.90],       # blue edge
        [0.87, 0.23, 0.018],       # glossy orange restored neighbor
    ],
    dtype=np.float64,
)

DIFFUSE = np.array(
    [
        0.72,
        0.72,
        0.68,
        0.72,
    ],
    dtype=np.float64,
)

SPECULAR = np.array(
    [
        1.10,
        1.10,
        0.85,
        1.10,
    ],
    dtype=np.float64,
)

SHININESS = np.array(
    [
        130.0,
        92.0,
        76.0,
        130.0,
    ],
    dtype=np.float64,
)

AMBIENT = np.array(
    [
        0.14,
        0.12,
        0.10,
        0.14,
    ],
    dtype=np.float64,
)


# ============================================================
# 10. Ray-sphere intersection
# ============================================================

def sphere_intersection(origins, directions, center, radius):
    offset = origins - center

    b = np.einsum("ij,ij->i", offset, directions)
    c = np.einsum("ij,ij->i", offset, offset) - radius * radius
    discriminant = b * b - c

    t = np.full(len(origins), np.inf, dtype=np.float64)

    valid = discriminant >= 0.0
    sqrt_discriminant = np.zeros(len(origins), dtype=np.float64)
    sqrt_discriminant[valid] = np.sqrt(discriminant[valid])

    t_near = -b - sqrt_discriminant
    t_far = -b + sqrt_discriminant

    candidate = np.where(
        t_near > 1e-5,
        t_near,
        np.where(t_far > 1e-5, t_far, np.inf),
    )

    t[valid] = candidate[valid]

    hit_points = origins + directions * t[:, None]
    normal = hit_points - center
    normal_length = np.linalg.norm(normal, axis=1)

    good = np.isfinite(t) & (normal_length > 0.0)
    normal[good] /= normal_length[good, None]
    normal[~good] = 0.0

    return t, normal


# ============================================================
# 11. Ray-finite-cylinder intersection
# ============================================================

def cylinder_intersection(origins, directions, start, end, radius):
    axis = end - start
    origin_relative = origins - start

    axis_length_sq = float(np.dot(axis, axis))
    axis_dot_direction = directions @ axis
    axis_dot_origin = origin_relative @ axis
    direction_dot_origin = np.einsum("ij,ij->i", directions, origin_relative)
    origin_length_sq = np.einsum("ij,ij->i", origin_relative, origin_relative)

    quadratic_a = axis_length_sq - axis_dot_direction**2
    quadratic_b = axis_length_sq * direction_dot_origin - axis_dot_origin * axis_dot_direction
    quadratic_c = (
        axis_length_sq * origin_length_sq
        - axis_dot_origin**2
        - radius * radius * axis_length_sq
    )

    discriminant = quadratic_b**2 - quadratic_a * quadratic_c

    t = np.full(len(origins), np.inf, dtype=np.float64)
    normal = np.zeros_like(origins)

    valid = (discriminant >= 0.0) & (np.abs(quadratic_a) > 1e-12)

    sqrt_discriminant = np.zeros(len(origins), dtype=np.float64)
    sqrt_discriminant[valid] = np.sqrt(discriminant[valid])

    candidate = np.full(len(origins), np.inf, dtype=np.float64)
    candidate[valid] = (
        -quadratic_b[valid] - sqrt_discriminant[valid]
    ) / quadratic_a[valid]

    axial_position = axis_dot_origin + candidate * axis_dot_direction

    valid &= (
        (candidate > 1e-5)
        & (axial_position > 0.0)
        & (axial_position < axis_length_sq)
    )

    t[valid] = candidate[valid]

    if np.any(valid):
        hit_relative = origin_relative[valid] + directions[valid] * t[valid, None]
        radial = hit_relative - np.outer(axial_position[valid] / axis_length_sq, axis)
        radial_length = np.linalg.norm(radial, axis=1)
        radial /= radial_length[:, None]
        normal[valid] = radial

    return t, normal


# ============================================================
# 12. Transparent background
# ============================================================

def background_rgba(ray_directions):
    rgba = np.zeros((len(ray_directions), 4), dtype=np.float64)
    return rgba


# ============================================================
# 13. Main render function
# ============================================================

def render_unit_cell(output_path="/content/diamond_unit_cell_glossy_transparent.png"):
    output_path = Path(output_path)

    rendered_rgba = np.zeros((HEIGHT, WIDTH, 4), dtype=np.float64)

    chunk_rows = 75

    for row_start in range(0, HEIGHT, chunk_rows):
        row_end = min(HEIGHT, row_start + chunk_rows)
        number_of_rows = row_end - row_start

        vertical_screen = (
            1.0
            - 2.0 * ((np.arange(row_start, row_end) + 0.5) / HEIGHT)
        ) * HALF_HEIGHT

        horizontal_screen = (
            2.0 * ((np.arange(WIDTH) + 0.5) / WIDTH) - 1.0
        ) * HALF_WIDTH

        grid_x, grid_y = np.meshgrid(horizontal_screen, vertical_screen)

        directions = (
            forward[None, None, :]
            + grid_x[..., None] * right[None, None, :]
            + grid_y[..., None] * up[None, None, :]
        )

        directions /= np.linalg.norm(directions, axis=2, keepdims=True)

        ray_directions = directions.reshape(-1, 3)
        ray_origins = np.repeat(CAMERA[None, :], len(ray_directions), axis=0)

        nearest_t = np.full(len(ray_directions), np.inf, dtype=np.float64)
        nearest_normal = np.zeros((len(ray_directions), 3), dtype=np.float64)
        nearest_material = np.full(len(ray_directions), -1, dtype=np.int16)

        # atom intersections
        for center, radius in zip(sphere_centers, sphere_radii):
            t, normal = sphere_intersection(ray_origins, ray_directions, center, radius)
            update = t < nearest_t
            nearest_t[update] = t[update]
            nearest_normal[update] = normal[update]
            is_restored_neighbor = np.any(np.all(np.isclose(orange_neighbors, center), axis=1))
            nearest_material[update] = MAT_ORANGE if is_restored_neighbor else MAT_ATOM

        # bond / edge intersections
        for start, end, radius, material_id in cylinders:
            t, normal = cylinder_intersection(ray_origins, ray_directions, start, end, radius)
            update = t < nearest_t
            nearest_t[update] = t[update]
            nearest_normal[update] = normal[update]
            nearest_material[update] = material_id

        hit_mask = nearest_material >= 0

        rgba = background_rgba(ray_directions)

        if np.any(hit_mask):
            hit_indices = np.flatnonzero(hit_mask)

            hit_points = (
                ray_origins[hit_indices]
                + ray_directions[hit_indices] * nearest_t[hit_indices, None]
            )

            normals = nearest_normal[hit_indices]
            view_direction = -ray_directions[hit_indices]
            materials = nearest_material[hit_indices]

            shaded = BASE_COLOR[materials] * AMBIENT[materials, None]

            for light_position, light_intensity in LIGHTS:
                vector_to_light = light_position[None, :] - hit_points
                light_distance = np.linalg.norm(vector_to_light, axis=1)
                light_direction = vector_to_light / light_distance[:, None]

                normal_dot_light = np.clip(
                    np.einsum("ij,ij->i", normals, light_direction),
                    0.0,
                    1.0,
                )

                half_vector = light_direction + view_direction
                half_vector /= np.linalg.norm(half_vector, axis=1, keepdims=True)

                normal_dot_half = np.clip(
                    np.einsum("ij,ij->i", normals, half_vector),
                    0.0,
                    1.0,
                )

                shaded += (
                    BASE_COLOR[materials]
                    * DIFFUSE[materials, None]
                    * normal_dot_light[:, None]
                    * light_intensity[None, :]
                )

                shaded += (
                    SPECULAR[materials, None]
                    * (normal_dot_half ** SHININESS[materials])[:, None]
                    * light_intensity[None, :]
                )

            atom_hits = (materials == MAT_ATOM) | (materials == MAT_ORANGE)
            if np.any(atom_hits):
                rim = np.clip(
                    1.0
                    - np.abs(
                        np.einsum(
                            "ij,ij->i",
                            normals[atom_hits],
                            view_direction[atom_hits],
                        )
                    ),
                    0.0,
                    1.0,
                )

                shaded[atom_hits] += (
                    (rim ** 4.0)[:, None]
                    * np.array([0.035, 0.040, 0.050])
                )

            shaded = np.clip(shaded, 0.0, 1.0)

            rgba[hit_indices, :3] = shaded
            rgba[hit_indices, 3] = 1.0

        rendered_rgba[row_start:row_end] = rgba.reshape(number_of_rows, WIDTH, 4)

        print(f"Rendering rows {row_start + 1}–{row_end} of {HEIGHT}")

    rendered_rgba[..., :3] = np.power(rendered_rgba[..., :3], 1.0 / 2.2)

    output_image = Image.fromarray(
        np.clip(rendered_rgba * 255.0, 0, 255).astype(np.uint8),
        mode="RGBA",
    )

    output_image.save(output_path)

    print()
    print(f"Saved: {output_path}")
    print(f"Visible atoms: {len(atoms)}")
    print(f"Exact bonds: {len(bonds)}")
    print("Depth handling: per-pixel nearest-surface ray tracing")
    print("Background: transparent")
    print("Floor/shadow: removed")

    # Saved directly for the web game.

    return output_image


# ============================================================
# 14. Execute
# ============================================================

rendered_image = render_unit_cell(str(Path(__file__).resolve().parents[1] / "public/diamond-cell-complete.png"))
retained = ~np.any(np.all(np.isclose(sphere_centers[:,None,:],missing[None,:,:]),axis=2),axis=1)
sphere_centers=sphere_centers[retained]
sphere_radii=sphere_radii[retained]
cylinders=[c for c in cylinders if c[3]==MAT_EDGE or not (np.any(np.all(np.isclose(missing,c[0]),axis=1)) or np.any(np.all(np.isclose(missing,c[1]),axis=1)))]
rendered_image = render_unit_cell(str(Path(__file__).resolve().parents[1] / "public/diamond-cell-vacancy.png"))
