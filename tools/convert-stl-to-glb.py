import argparse
import json
import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def safe_name(name):
    stem = Path(name).stem
    stem = re.sub(r"[^\w.\- ]+", "_", stem, flags=re.UNICODE).strip()
    return stem or "model"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_stl(path):
    if hasattr(bpy.ops.wm, "stl_import"):
        bpy.ops.wm.stl_import(filepath=str(path))
    else:
        bpy.ops.import_mesh.stl(filepath=str(path))


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
    )


def fit_objects(max_footprint, max_height):
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not objects:
        return

    for obj in objects:
        obj.rotation_euler[0] += -math.pi / 2
    bpy.context.view_layer.update()

    min_v = Vector((float("inf"), float("inf"), float("inf")))
    max_v = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, world.x)
            min_v.y = min(min_v.y, world.y)
            min_v.z = min(min_v.z, world.z)
            max_v.x = max(max_v.x, world.x)
            max_v.y = max(max_v.y, world.y)
            max_v.z = max(max_v.z, world.z)

    size = max_v - min_v
    footprint = max(size.x, size.y, 1e-6)
    height = max(size.z, 1e-6)
    scale = min(max_footprint / footprint, max_height / height)

    for obj in objects:
        obj.scale *= scale
    bpy.context.view_layer.update()

    min_v = Vector((float("inf"), float("inf"), float("inf")))
    max_v = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in objects:
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, world.x)
            min_v.y = min(min_v.y, world.y)
            min_v.z = min(min_v.z, world.z)
            max_v.x = max(max_v.x, world.x)
            max_v.y = max(max_v.y, world.y)
            max_v.z = max(max_v.z, world.z)

    center = (min_v + max_v) * 0.5
    offset = Vector((-center.x, -center.y, -min_v.z))
    for obj in objects:
        obj.location += offset


def convert_file(source, dest, max_footprint, max_height):
    clear_scene()
    import_stl(source)
    fit_objects(max_footprint=max_footprint, max_height=max_height)
    dest.parent.mkdir(parents=True, exist_ok=True)
    export_glb(dest)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--max-footprint", type=float, default=0.76)
    parser.add_argument("--max-height", type=float, default=0.82)
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    args = parser.parse_args(argv)

    input_root = Path(args.input)
    output_root = Path(args.output)
    manifest = []
    files = sorted(input_root.rglob("*.stl"))
    if args.limit > 0:
        files = files[: args.limit]

    for source in files:
        relative = source.relative_to(input_root)
        dest = output_root / relative.with_suffix(".glb")
        convert_file(source, dest, args.max_footprint, args.max_height)
        manifest.append(
            {
                "source": str(source.as_posix()),
                "path": str(dest.as_posix()),
                "role": relative.parts[0] if len(relative.parts) > 1 else input_root.name,
                "name": f"{safe_name(source.name)}.glb",
                "sourceSize": source.stat().st_size,
                "size": dest.stat().st_size,
            }
        )
        print(f"converted {source} -> {dest}")

    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
