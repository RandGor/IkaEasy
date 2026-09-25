"""Read-only geometry audit for the eight mascot strips. Never repairs frames.

Usage: python scripts/audit-mascot-sprites.py DIRECTORY [--report FILE]
Geometry checks complement, and never replace, visual gait approval.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

DIRECTIONS = ('N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW')
WIDTH, HEIGHT, COUNT = 73, 67, 12


def audit(directory, body_directory=None):
    result = {'frame': [WIDTH, HEIGHT], 'frames': COUNT, 'directions': {}, 'errors': []}
    all_heights = []
    for direction in DIRECTIONS:
        path = directory / f'{direction}.png'
        if not path.is_file():
            result['errors'].append(f'{direction}: missing strip')
            continue
        with Image.open(path) as source:
            body = Image.open(body_directory / f'{direction}.png').convert('RGBA') if body_directory else source
            entry = {'size': list(source.size), 'mode': source.mode, 'frames': []}
            result['directions'][direction] = entry
            if source.size != (WIDTH * COUNT, HEIGHT):
                result['errors'].append(f'{direction}: expected 876x67, got {source.size}')
                continue
            if source.mode != 'RGBA':
                result['errors'].append(f'{direction}: expected RGBA')
                continue
            if source.getchannel('A').getextrema() != (0, 255):
                result['errors'].append(f'{direction}: missing transparent or opaque pixels')
            hashes = set()
            for index in range(COUNT):
                frame = source.crop((index * WIDTH, 0, (index + 1) * WIDTH, HEIGHT))
                hashes.add(hashlib.sha256(frame.tobytes()).hexdigest())
                body_frame = body.crop((index * WIDTH, 0, (index + 1) * WIDTH, HEIGHT))
                if body_directory:
                    combined_bounds = frame.getchannel('A').getbbox()
                    if combined_bounds and (combined_bounds[0] < 2 or combined_bounds[1] < 2 or combined_bounds[2] > WIDTH-2 or combined_bounds[3] > HEIGHT-2):
                        result['errors'].append(f'{direction}/{index}: combined shadow touches cell edge')
                    added_shadow = 0
                    for y in range(HEIGHT):
                        for x in range(WIDTH):
                            old, new = body_frame.getpixel((x,y)), frame.getpixel((x,y))
                            if old == new:
                                continue
                            if old[3] == 255 or not (32 <= x < 57 and 48 <= y < 62):
                                result['errors'].append(f'{direction}/{index}: foreground changed at {x},{y}')
                            if old[3] == 0:
                                added_shadow += 1
                                if new[:3] != (0,0,0) or not 0 < new[3] <= 75:
                                    result['errors'].append(f'{direction}/{index}: invalid shadow colour/opacity')
                    if added_shadow < 40:
                        result['errors'].append(f'{direction}/{index}: missing ground shadow')
                # Measure anatomy on the approved body, not its projected ground shadow.
                alpha = body_frame.getchannel('A')
                bounds = alpha.point(lambda value: 255 if value >= 24 else 0).getbbox()
                metrics = {'index': index, 'boundsAlpha24': bounds, 'boundsAllAlpha': alpha.getbbox()}
                entry['frames'].append(metrics)
                if bounds is None:
                    result['errors'].append(f'{direction}/{index}: empty frame')
                    continue
                left, top, right, bottom = bounds
                metrics.update(width=right-left, height=bottom-top, bottom=bottom-1)
                all_heights.append(bottom-top)
                if left < 2 or right > WIDTH-2 or top < 2 or bottom > HEIGHT-2:
                    result['errors'].append(f'{direction}/{index}: silhouette touches cell edge')
                if not 32 <= bottom-top <= 36:
                    result['errors'].append(f'{direction}/{index}: height {bottom-top} outside 32..36')
                if not 51 <= bottom-1 <= 53:
                    result['errors'].append(f'{direction}/{index}: ground envelope {bottom-1} outside 51..53')
            valid = [frame for frame in entry['frames'] if frame['boundsAlpha24']]
            if valid:
                entry['heightRange'] = [min(f['height'] for f in valid), max(f['height'] for f in valid)]
                entry['groundRange'] = [min(f['bottom'] for f in valid), max(f['bottom'] for f in valid)]
                tops = [f['boundsAlpha24'][1] for f in valid]
                entry['topRange'] = [min(tops), max(tops)]
                if max(tops)-min(tops) > 2:
                    result['errors'].append(f'{direction}: head envelope moves more than 2 px')
                if entry['heightRange'][1]-entry['heightRange'][0] > 2:
                    result['errors'].append(f'{direction}: silhouette height varies more than 2 px')
            entry['uniqueFrames'] = len(hashes)
            if len(hashes) != COUNT:
                result['errors'].append(f'{direction}: only {len(hashes)} distinct frames')
    result['heightRangeAcrossDirections'] = [min(all_heights), max(all_heights)] if all_heights else None
    result['passed'] = not result['errors']
    result['limitations'] = [
        'Bounding boxes include clothing and feet; they do not prove invariant anatomy.',
        'Visual review must verify planted feet, opposite arm swing, heading, and loop continuity.',
        'No per-frame scaling, alignment, cropping repair or alpha modification is performed.'
    ]
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--report', type=Path)
    parser.add_argument('--body-dir', type=Path, help='Approved body strips, for shadow-only preservation checks')
    args = parser.parse_args()
    report = audit(args.directory, args.body_dir)
    text = json.dumps(report, ensure_ascii=False, indent=2)
    if args.report:
        args.report.write_text(text + '\n', encoding='utf-8')
    print(text)
    raise SystemExit(0 if report['passed'] else 1)
