import argparse
import json
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector


PHYSICAL_UNITS = [
    {
        "id": "infantry-standing",
        "name": "Піхотинець стоячи",
        "role": "infantry",
        "files": ["Soltat_stoiachi.stl"],
    },
    {
        "id": "infantry-kneeling",
        "name": "Піхотинець з коліна",
        "role": "infantry",
        "files": ["Soldat_na_kolintsi.stl"],
    },
    {
        "id": "infantry-prone",
        "name": "Піхотинець лежачи",
        "role": "infantry",
        "files": ["Soldat_lezhachi.stl"],
    },
    {
        "id": "machinegunner",
        "name": "Кулеметник",
        "role": "support",
        "files": ["Kulemetnyk_lezhachi.stl"],
    },
    {
        "id": "sniper",
        "name": "Снайпер",
        "role": "sniper",
        "files": ["snajperr.stl", "snajperPr.stl"],
    },
    {
        "id": "rpg",
        "name": "Гранатометник",
        "role": "antitank",
        "files": ["RPGman.stl", "RPG_1.stl"],
    },
    {
        "id": "javelin",
        "name": "ПТРК Javelin",
        "role": "antitank",
        "files": ["javelin.stl", "javelinA.stl", "javelinB.stl"],
    },
    {
        "id": "mortar-team",
        "name": "Мінометний розрахунок",
        "role": "mortar",
        "files": ["Mynomet___3_boitsa.stl"],
    },
    {
        "id": "medic",
        "name": "Медик",
        "role": "support",
        "files": ["Medyk.stl"],
    },
    {
        "id": "signalman",
        "name": "Зв'язківець",
        "role": "command",
        "files": ["Zviazkivets.stl"],
    },
    {
        "id": "bpla-operators",
        "name": "Оператори БПЛА",
        "role": "recon",
        "files": ["BPLA_operators.stl"],
    },
    {
        "id": "mavic",
        "name": "Mavic",
        "role": "recon",
        "files": ["mavik.stl"],
    },
    {
        "id": "quadcopter",
        "name": "Квадрокоптер",
        "role": "recon",
        "files": ["kvadro_A.stl", "kvadro_S_x2.stl", "kvadro_WL_x2.stl", "kvadro_WR_x2.stl"],
    },
    {
        "id": "tank",
        "name": "Танк",
        "role": "armor",
        "files": ["Tank.stl", "Tank_dulo.stl"],
    },
    {
        "id": "btr",
        "name": "БТР",
        "role": "armor",
        "files": ["BTR.stl", "BTR_kulemet.stl", "BTR_wheelCx4.stl", "BTR_wheelLx4.stl", "BTR_wheelRX4.stl"],
    },
    {
        "id": "grad",
        "name": "БМ-21 Град",
        "role": "artillery",
        "files": ["Grad.stl", "Grad_dura.stl", "Grad_duraS.stl", "Grad_wheelRx3.stl", "Grad_whellLx3.stl", "Grad_whellS.stl"],
    },
    {
        "id": "himars",
        "name": "HIMARS",
        "role": "artillery",
        "files": ["Himars_1.stl", "Himars_2.stl", "Himars_wheel L X3.stl", "Himars_wheel R.stl", "Himars_wheel Sx3.stl"],
    },
    {
        "id": "m777",
        "name": "M777",
        "role": "artillery",
        "files": ["M777_A.stl", "M777_B.stl"],
    },
    {
        "id": "pickup",
        "name": "Пікап",
        "role": "vehicle",
        "files": ["pickup_01_body.stl", "pickup 02_pidvys.stl", "pickup_03_wheel_S.stl", "pickup_03_wheelL.stl", "pickup_03_wheelR.stl"],
    },
    {
        "id": "evac",
        "name": "Евакуаційна машина",
        "role": "vehicle",
        "files": ["EVAKv1.stl"],
    },
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_stl(path):
    before = set(bpy.context.scene.objects)
    if hasattr(bpy.ops.wm, "stl_import"):
        bpy.ops.wm.stl_import(filepath=str(path))
    else:
        bpy.ops.import_mesh.stl(filepath=str(path))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before and obj.type == "MESH"]
    for obj in imported:
        obj.name = Path(path).stem
    return imported


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def scene_bounds():
    min_v = Vector((float("inf"), float("inf"), float("inf")))
    max_v = Vector((float("-inf"), float("-inf"), float("-inf")))
    for obj in mesh_objects():
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            min_v.x = min(min_v.x, world.x)
            min_v.y = min(min_v.y, world.y)
            min_v.z = min(min_v.z, world.z)
            max_v.x = max(max_v.x, world.x)
            max_v.y = max(max_v.y, world.y)
            max_v.z = max(max_v.z, world.z)
    return min_v, max_v


def normalize_scene(max_footprint, max_height):
    objects = mesh_objects()
    if not objects:
        return {"size": [0, 0, 0], "scale": 1}

    bpy.context.view_layer.update()
    min_v, max_v = scene_bounds()
    size = max_v - min_v
    footprint = max(size.x, size.y, 1e-6)
    height = max(size.z, 1e-6)
    scale = min(max_footprint / footprint, max_height / height)

    for obj in objects:
        obj.scale *= scale
    bpy.context.view_layer.update()

    min_v, max_v = scene_bounds()
    center = (min_v + max_v) * 0.5
    offset = Vector((-center.x, -center.y, -min_v.z))
    for obj in objects:
        obj.location += offset

    bpy.context.view_layer.update()
    min_v, max_v = scene_bounds()
    size = max_v - min_v
    return {"size": [size.x, size.y, size.z], "scale": scale}


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
    )


def safe_filename(text):
    return re.sub(r"[^a-zA-Z0-9_.-]+", "-", text).strip("-") or "unit"


def convert_unit(source_root, output_root, unit, max_footprint, max_height):
    clear_scene()
    imported_files = []
    missing = []
    for filename in unit["files"]:
        source = source_root / filename
        if not source.exists():
            missing.append(filename)
            continue
        import_stl(source)
        imported_files.append(filename)

    if not imported_files:
        return None

    stats = normalize_scene(max_footprint, max_height)
    dest = output_root / f"{safe_filename(unit['id'])}.glb"
    dest.parent.mkdir(parents=True, exist_ok=True)
    export_glb(dest)

    return {
        "id": unit["id"],
        "name": unit["name"],
        "role": unit["role"],
        "path": dest.as_posix(),
        "sourceFiles": imported_files,
        "missingFiles": missing,
        "size": dest.stat().st_size,
        "bounds": stats["size"],
        "scale": stats["scale"],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--max-footprint", type=float, default=0.76)
    parser.add_argument("--max-height", type=float, default=0.82)
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    args = parser.parse_args(argv)

    source_root = Path(args.input)
    output_root = Path(args.output)
    manifest = []
    for unit in PHYSICAL_UNITS:
        result = convert_unit(source_root, output_root, unit, args.max_footprint, args.max_height)
        if result:
            manifest.append(result)
            print(f"converted physical unit {result['id']} -> {result['path']}")

    output_root.mkdir(parents=True, exist_ok=True)
    (output_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
