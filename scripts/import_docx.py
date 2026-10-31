"""Extract the song/artist run pairs from the supplied Word list.

Usage: python scripts/import_docx.py <source.docx>
Requires python-docx and pypinyin. The generated site needs neither package.
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

from docx import Document
from pypinyin import Style, lazy_pinyin


def romanization(value):
    syllables = lazy_pinyin(value, style=Style.NORMAL, errors="ignore")
    return " ".join(syllables), "".join(part[0] for part in syllables if part)


def extract(source):
    document = Document(source)
    songs = []
    anomalies = []
    for paragraph_number, paragraph in enumerate(document.paragraphs[1:], start=2):
        pieces = []
        for run in paragraph.runs:
            # A few runs contain the end of an artist and the next title.
            pieces.extend(part.strip() for part in re.split(r"\s{2,}", run.text) if part.strip())
        if len(pieces) % 2:
            anomalies.append((paragraph_number, pieces))
            continue
        for title, artist in zip(pieces[::2], pieces[1::2]):
            if not title or not artist:
                continue
            # The source has one run boundary inside this song title.
            if title == "荒唐" and artist == "戏花粥":
                title, artist = "荒唐戏", "花粥"
            full, initials = romanization(title)
            artist_full, artist_initials = romanization(artist)
            songs.append({
                "title": title,
                "artist": artist,
                "pinyin": " ".join((full, full.replace(" ", ""), initials, artist_full, artist_full.replace(" ", ""), artist_initials)),
            })
    unique = list(dict.fromkeys((song["title"], song["artist"]) for song in songs))
    by_key = {(song["title"], song["artist"]): song for song in songs}
    return [by_key[key] for key in unique], songs, anomalies


def main():
    source = Path(sys.argv[1])
    songs, all_songs, anomalies = extract(source)
    if anomalies:
        for number, pieces in anomalies:
            print(f"Unpaired paragraph {number}: {pieces}", file=sys.stderr)
        raise SystemExit(1)
    output = Path(__file__).resolve().parents[1] / "js" / "songs.js"
    output.write_text(
        "// 从哇啦提供的 Word 歌单导入；保留原文中的歌名和歌手。\n"
        "// 用 scripts/import_docx.py 可重新生成。\n"
        "window.WALA_SONGS = "
        + json.dumps(songs, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"Imported {len(songs)} unique songs from {len(all_songs)} entries")
    print("Most common artists:", Counter(song["artist"] for song in songs).most_common(12))


if __name__ == "__main__":
    main()
