#!/usr/bin/env python3
"""Build public/data/pack.json from the approved pack HTML. Values are copied, not invented."""
import json
import re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts" / "pack-source.html"
OUT = ROOT / "public" / "data" / "pack.json"

RIVAL_PATH = {
    "pco": ["core"],
    "pushpay": ["enterprise"],
    "tithely": ["core"],
    "subsplash": ["core", "enterprise"],
    "acs": ["core", "enterprise"],
    "mb": ["core", "enterprise"],
}
BOTH = ["core", "enterprise"]
KIND_GROUP = {
    "kpi": "KPIs",
    "chart": "KPIs",
    "claim": "Claims",
    "play": "Plan",
    "open": "Still open",
    "competitor": "Competitors",
    "evidence": "Evidence",
    "table-row": "Tables",
    "note": "Sections",
    "panel": "Sections",
    "narrative": "Sections",
}


def clean(text):
    text = unescape(re.sub(r"<[^>]+>", " ", text or ""))
    return re.sub(r"\s+", " ", text).strip()


def slug(text, limit=42):
    value = re.sub(r"[^a-z0-9]+", "-", clean(text).lower()).strip("-")
    return (value or "item")[:limit].strip("-")


class Tree(HTMLParser):
    def __init__(self, raw):
        super().__init__(convert_charrefs=False)
        self.raw = raw
        self.lines = raw.split("\n")
        self.stack = []
        self.roots = []

    def abspos(self):
        line, col = self.getpos()
        return sum(len(self.lines[i]) + 1 for i in range(line - 1)) + col

    def tag_gt(self, start):
        quote = ""
        i = start
        while i < len(self.raw):
            char = self.raw[i]
            if quote:
                if char == quote:
                    quote = ""
            elif char in "\"'":
                quote = char
            elif char == ">":
                return i
            i += 1
        raise RuntimeError("unclosed tag")

    def handle_starttag(self, tag, attrs):
        start = self.abspos()
        node = {
            "tag": tag,
            "attrs": dict(attrs),
            "start": start,
            "gt": self.tag_gt(start),
            "children": [],
            "parent": self.stack[-1] if self.stack else None,
            "end": None,
        }
        if self.stack:
            self.stack[-1]["children"].append(node)
        else:
            self.roots.append(node)
        if tag not in {"img", "br", "meta", "link", "input", "source", "hr"}:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack and self.stack[-1]["tag"] == tag and self.stack[-1]["end"] is None:
            node = self.stack.pop()
            node["end"] = node["gt"] + 1

    def handle_endtag(self, tag):
        if not self.stack:
            return
        # Close until the matching tag so a skipped optional tag cannot desync the tree.
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index]["tag"] == tag:
                end = self.raw.find(">", self.abspos())
                if end < 0:
                    end = len(self.raw) - 1
                for node in self.stack[index:]:
                    node["end"] = end + 1
                del self.stack[index:]
                return

    def html(self, node):
        return self.raw[node["start"]:node["end"]]

    def text(self, node):
        return clean(self.html(node))


def attr_class(node):
    return node["attrs"].get("class", "")


def has_class(node, name):
    return name in attr_class(node).split()


def walk(node):
    yield node
    for child in node["children"]:
        yield from walk(child)


def find_all(nodes, pred):
    found = []
    for node in nodes:
        for item in walk(node):
            if pred(item):
                found.append(item)
    return found


def child_text(node, pred):
    for item in walk(node):
        if pred(item):
            return clean(Tree.html(None, item) if False else "")
    return ""


def direct_parts(parser, node):
    return parser.text(node)


def paths_for_text(text, rival=""):
    if rival in RIVAL_PATH:
        return list(RIVAL_PATH[rival])
    low = text.lower()
    enterprise = bool(re.search(r"1,000|1,501|2,000|megachurch|band b\b|band a\b", low))
    core = bool(re.search(r"band c|250–999|250-999|251–500|251-500", low))
    overlap = "501–1,500" in text or "501-1,500" in text or "500–999" in text
    if enterprise and core:
        return list(BOTH)
    if overlap and not (enterprise and not core):
        return list(BOTH)
    if enterprise and not core:
        return ["enterprise"]
    if core and not enterprise:
        return ["core"]
    return list(BOTH)


def status_of(text):
    low = text.lower()
    if "explicit unknown" in low or "(in-seat)" in low:
        return "unknown"
    if re.search(r"\bfail\b", low):
        return "fail"
    if "partial" in low:
        return "partial"
    if re.search(r"\bopen\b", low):
        return "open"
    if "hold" in low:
        return "hold"
    if "conflict" in low:
        return "unknown"
    if "pass" in low:
        return "pass"
    return ""


def confidence_of(text):
    match = re.search(r"\b(High|Medium|Low)(?:–|-)?(Medium|Low)?\b", text)
    if not match:
        return ""
    return clean(match.group(0))


def require(text, snippet, label):
    if snippet not in text:
        raise SystemExit(f"pack source missing {label}: {snippet}")


def main():
    raw = SOURCE.read_text()
    plain = clean(raw)
    for snippet in [
        "~10k–25k",
        "~25–30%",
        "~1–3%",
        "~15–20%",
        "~1,750",
        "$5.3M",
        "8% / 16% / 56%",
        "Explicit Unknown",
        "HOLD",
        "0 / 71",
        "70%",
        "R1",
        "R9",
        "Live Core",
    ]:
        require(plain, snippet, "figure")
    for banned in ["Microsoft", "Azure", "12,480", "$4.2B", "$42k"]:
        if banned.lower() in plain.lower():
            raise SystemExit(f"pack source contains banned draft filler: {banned}")

    parser = Tree(raw)
    parser.feed(raw)
    sections = [node for node in find_all(parser.roots, lambda n: n["tag"] == "section" and n["attrs"].get("id", "").startswith("t-"))]
    if len(sections) < 10:
        raise SystemExit(f"expected pack sections, found {len(sections)}")

    items = []
    used = set()
    inserts = []

    def add_item(**kwargs):
        base = kwargs["id"]
        item_id = base
        n = 2
        while item_id in used:
            item_id = f"{base}-{n}"
            n += 1
        used.add(item_id)
        kwargs["id"] = item_id
        kwargs.setdefault("aliases", [])
        kwargs.setdefault("sources", [])
        kwargs.setdefault("related", [])
        kwargs.setdefault("status", status_of(kwargs.get("text", "")))
        kwargs.setdefault("confidence", confidence_of(kwargs.get("text", "")))
        kwargs.setdefault("value", "")
        kwargs.setdefault("note", "")
        kwargs.setdefault("badge", "")
        kwargs.setdefault("rival", "")
        items.append(kwargs)
        return item_id

    def stamp(node, item_id, paths, kind):
        inserts.append((node["gt"], f' data-item="{item_id}" data-paths="{" ".join(paths)}" data-kind="{kind}"'))

    dialogs = {}
    for node in find_all(parser.roots, lambda n: n["tag"] == "dialog" and n["attrs"].get("id", "").startswith("d-")):
        dialogs[node["attrs"]["id"]] = parser.text(node)

    notes = {}
    for node in find_all(parser.roots, lambda n: n["tag"] == "dialog" and n["attrs"].get("id", "").startswith("n-")):
        notes[node["attrs"]["id"]] = parser.text(node)

    section_of = {}

    def mark_section(node, section_id):
        section_of[id(node)] = section_id

    for section in sections:
        section_id = section["attrs"]["id"].replace("t-", "")
        for node in walk(section):
            mark_section(node, section_id)

    # Panels, rows, cards, kpis, list items, evidence, charts.
    for section in sections:
        section_id = section["attrs"]["id"].replace("t-", "")
        for node in walk(section):
            classes = attr_class(node)
            rival = node["attrs"].get("data-rival", "")
            if has_class(node, "kpi"):
                label = ""
                value = ""
                note = ""
                for child in node["children"]:
                    if has_class(child, "l"):
                        label = parser.text(child)
                    elif has_class(child, "v"):
                        value = parser.text(child)
                    elif has_class(child, "s"):
                        note = parser.text(child)
                text = f"{label}. {value}. {note}"
                paths = paths_for_text(f"{label} {note}")
                if "megachurch" in label.lower() or "2,000" in label:
                    paths = ["enterprise"]
                if "band c" in label.lower():
                    paths = ["core"]
                if "giving growth" in label.lower() or "citing ease" in label.lower():
                    paths = ["core"]
                if label.lower().startswith("live core") or "verdict for live" in label.lower():
                    paths = list(BOTH)
                item_id = add_item(
                    id=f"kpi-{slug(label)}",
                    kind="kpi",
                    paths=paths,
                    section=section_id,
                    title=label or value,
                    value=value,
                    note=note,
                    text=text,
                    sources=["2026 Market Intelligence pack"],
                )
                stamp(node, item_id, paths, "kpi")
            elif node["tag"] == "tr" and node["children"] and node["children"][0]["tag"] == "td":
                cells = [parser.text(cell) for cell in node["children"] if cell["tag"] == "td"]
                if not any(cells):
                    continue
                text = " | ".join(cells)
                paths = paths_for_text(text)
                badge = cells[0] if re.fullmatch(r"R\d+", cells[0]) else ""
                kind = "open" if badge or section_id == "resid" else "table-row"
                title = cells[1] if badge and len(cells) > 1 else cells[0]
                item_id = add_item(
                    id=(f"open-{badge.lower()}" if badge else f"row-{slug(title)}"),
                    kind=kind,
                    paths=paths,
                    section=section_id,
                    title=title,
                    text=text,
                    badge=badge,
                    note=cells[2] if len(cells) > 2 else "",
                    sources=[f"Section {section_id}"],
                )
                stamp(node, item_id, paths, kind)
            elif has_class(node, "ccard"):
                text = parser.text(node)
                dlg = node["attrs"].get("data-dlg", "")
                detail = dialogs.get(dlg, "")
                paths = paths_for_text(text, rival)
                # Rival is encoded on the dialog id when the card has no data-rival.
                if not rival and dlg.startswith("d-"):
                    rival = dlg.replace("d-", "")
                    paths = paths_for_text(text, rival if rival in RIVAL_PATH else "")
                item_id = add_item(
                    id=f"competitor-{slug(rival or text[:24])}",
                    kind="competitor",
                    paths=paths,
                    section="comp",
                    title=clean(re.split(r"Open details", text)[0])[:80],
                    text=f"{text} {detail}",
                    note=detail,
                    rival=rival,
                    sources=["COMP5", "Competitor cards"],
                )
                stamp(node, item_id, paths, "competitor")
            elif has_class(node, "gitem") or (has_class(node, "shot") and node["tag"] == "figure"):
                caption = node["attrs"].get("data-caption") or parser.text(node)
                meta = node["attrs"].get("data-meta", "")
                paths = paths_for_text(caption, rival)
                item_id = add_item(
                    id=f"evidence-{slug(caption)}",
                    kind="evidence",
                    paths=paths,
                    section="comp",
                    title=caption,
                    text=f"{caption} {meta}",
                    note=meta,
                    rival=rival,
                    sources=["COMP5 screenshots, captured November 3–4, 2026"],
                )
                stamp(node, item_id, paths, "evidence")
            elif node["tag"] == "li" and any(has_class(parent, "num") for parent in []):
                pass
            elif has_class(node, "wlc"):
                text = parser.text(node)
                paths = paths_for_text(text)
                item_id = add_item(
                    id=f"claim-{slug(text[:48])}",
                    kind="claim",
                    paths=paths,
                    section=section_id,
                    title=clean(text)[:90],
                    text=text,
                    sources=["Where we win / lose"],
                )
                stamp(node, item_id, paths, "claim")
            elif node["tag"] == "h3":
                title = parser.text(node)
                parent_panel = None
                item_id = add_item(
                    id=f"panel-{slug(title)}",
                    kind="panel",
                    paths=list(BOTH),
                    section=section_id,
                    title=title,
                    text=title,
                    sources=["2026 Market Intelligence pack"],
                )
                stamp(node, item_id, BOTH, "panel")
            elif node["tag"] == "canvas":
                canvas_id = node["attrs"].get("id", "")
                title = {
                    "mixChart": "Share of churches and churchgoers",
                    "valChart": "What churches say they value",
                    "resChart": "Items that still need clarification",
                }.get(canvas_id, canvas_id)
                if not title:
                    continue
                item_id = {
                    "mixChart": "chart-attendance",
                    "valChart": "chart-values",
                    "resChart": "chart-open",
                }.get(canvas_id, f"chart-{slug(canvas_id)}")
                add_item(
                    id=item_id,
                    kind="chart",
                    paths=list(BOTH),
                    section=section_id if canvas_id != "valChart" else "self",
                    title=title,
                    text=title,
                    sources=["2026 Market Intelligence pack"],
                )

    # Numbered claims and plays.
    for section in sections:
        section_id = section["attrs"]["id"].replace("t-", "")
        for node in walk(section):
            if node["tag"] != "li":
                continue
            # parent class num
            # We did not store parents. Detect by looking at raw before the li... use a flag via previous.
            text = parser.text(node)
            if not text or len(text) < 8:
                continue
            numbered = False
            parent = node.get("parent")
            while parent:
                if "num" in attr_class(parent).split():
                    numbered = True
                    break
                parent = parent.get("parent")
            if not numbered:
                continue
            kind = "play" if section_id == "bets" else "claim"
            paths = paths_for_text(text)
            if section_id == "bets" and "band c" in text.lower() and "megachurch" not in text.lower() and "pushpay" not in text.lower():
                paths = ["core"]
            item_id = add_item(
                id=f"{kind}-{slug(text[:40])}",
                kind=kind,
                paths=paths,
                section=section_id,
                title=text[:110],
                text=text,
                sources=["Thing to plan for" if kind == "play" and "plan" in text.lower() else "Pack list"],
            )
            stamp(node, item_id, paths, kind)

    for note_id, text in notes.items():
        add_item(
            id=f"note-{note_id}",
            kind="note",
            paths=list(BOTH),
            section="start",
            title=text[:80],
            text=text,
            sources=["Pack note"],
        )

    # Exhibit 4 rows feed the comparison. Pull them from parsed items so figures stay sourced.
    def row_cells(title_part):
        for item in items:
            if item["kind"] == "table-row" and title_part.lower() in item["text"].lower():
                return [part.strip() for part in item["text"].split("|")]
        raise SystemExit(f"missing table row {title_part}")

    band_c = row_cells("C 250")
    band_b = row_cells("B 1,000")
    band_a = row_cells("A 2,000")
    multi = row_cells("Multisite")
    mega_budget = row_cells("Megachurch median")
    band_c_budget = row_cells("Band C budget")

    def cells(row):
        return row

    # Table shape: label | congregations | count | attendees | confidence  OR metric rows.
    # Exhibit 4: Band | % congregations | ≈ count | % attendees | Confidence
    if len(band_c) < 5:
        raise SystemExit(f"band C row too short: {band_c}")

    compare = {
        "title": "Core and Enterprise, side by side",
        "source": "Exhibit 4, mapped to MB bands. FACT 1,501+ is a different cut and is not used as the 1,000 line.",
        "columns": ["", "Core · Band C 250–999", "Enterprise · Band B 1,000–1,999", "Enterprise · Band A 2,000+"],
        "rows": [
            ["Congregations", band_c[1], band_b[1], band_a[1]],
            ["Count", band_c[2], band_b[2], band_a[2]],
            ["Attendees", band_c[3], band_b[3], band_a[3]],
            ["Confidence", band_c[4], band_b[4], band_a[4]],
        ],
    }

    # Extra still-open items that the pack states outside R1–R9.
    extras = [
        ("open-band-b-count", ["enterprise"], "Band B count", band_b[2], "Exhibit 4. Churches at 1,000–1,999."),
        ("open-band-a-attendees", ["enterprise"], "Band A attendee share", band_a[3], "Exhibit 4. Churches at 2,000+."),
        ("open-band-c-budget", ["core"], "Band C budget", band_c_budget[-2] if len(band_c_budget) >= 2 else "Explicit Unknown", "Exhibit 7."),
        ("open-size-split", ["core", "enterprise"], "501–999 and 1,000–1,999 split", "Explicit Unknown", "ICP unknowns. Closes with an NCS IV recut at 250 and 1,000."),
    ]
    for item_id, paths, title, value, source in extras:
        text = f"{title}. {value}. {source}"
        if "Explicit Unknown" not in text and "Unknown" not in value:
            text = f"{title}. {value}. {source}"
        add_item(
            id=item_id,
            kind="open",
            paths=paths,
            section="resid",
            title=title,
            value=value,
            text=text,
            status="unknown",
            sources=[source],
        )

    hold = next(item for item in items if item["kind"] == "kpi" and "HOLD" in item["value"].upper())
    ease = next(item for item in items if item["kind"] == "kpi" and "ease" in item["title"].lower())
    giving = next(item for item in items if item["kind"] == "kpi" and "giving" in item["title"].lower())
    churches = next(item for item in items if item["kind"] == "kpi" and "band c churches" in item["title"].lower())
    attendees = next(item for item in items if item["kind"] == "kpi" and "band c attendees" in item["title"].lower())

    def kpi_from_row(item_id, paths, title, row, value_index, source):
        add_item(
            id=item_id,
            kind="kpi",
            paths=paths,
            section="start",
            title=title,
            value=row[value_index],
            note=row[-1],
            text=f"{title}. {row[value_index]}. {row[-1]}. {source}",
            confidence=confidence_of(row[-1]),
            status=status_of(row[value_index]),
            sources=[source],
        )

    kpi_from_row("kpi-band-b-congregations", ["enterprise"], "Band B congregations", band_b, 1, "Exhibit 4")
    kpi_from_row("kpi-band-b-count", ["enterprise"], "Band B count", band_b, 2, "Exhibit 4")
    kpi_from_row("kpi-band-b-attendees", ["enterprise"], "Band B attendees", band_b, 3, "Exhibit 4")
    kpi_from_row("kpi-band-a-count", ["enterprise"], "Band A churches", band_a, 2, "Exhibit 4")
    kpi_from_row("kpi-band-a-attendees", ["enterprise"], "Band A attendees", band_a, 3, "Exhibit 4")
    kpi_from_row("kpi-megachurch-budget", ["enterprise"], "Megachurch median budget", mega_budget, 1, "Exhibit 7")
    add_item(
        id="kpi-multisite",
        kind="kpi",
        paths=list(BOTH),
        section="icp",
        title="Multisite share by size",
        value=multi[1],
        note=multi[-1],
        text=f"Multisite 200–499 / 500–999 / 1,000+. {multi[1]}. {multi[-1]}",
        sources=["Exhibit 8"],
        confidence=confidence_of(multi[-1]),
    )

    attendance = json.loads((ROOT / "public" / "data" / "attendance-mix.json").read_text())
    values = json.loads((ROOT / "public" / "data" / "buyer-values.json").read_text())
    # Guard the chart file against numbers that are not the published ranges.
    for band in attendance["bands"]:
        if band["attendeesPct"] is not None and band.get("attendeesRange") and "Unknown" not in str(band["attendeesRange"]):
            continue
    if "midpoint plotted" not in attendance["note"]:
        raise SystemExit("attendance mix note no longer says midpoint plotted")

    charts = {
        "attendance": {
            "id": "chart-attendance",
            "title": "Share of churches and churchgoers",
            "note": attendance["note"],
            "refresh": attendance["refresh"],
            "sources": attendance["sources"],
            "bands": attendance["bands"],
            "paths": {
                "core": ["Mid-size (250–999)"],
                "enterprise": ["Large (1,000–1,999)", "Very large (2,000+)"],
                "all": [band["label"] for band in attendance["bands"]],
            },
        },
        "values": {
            "id": "chart-values",
            "title": values["title"],
            "refresh": values["refresh"],
            "source": values["source"],
            "items": values["items"],
            "enterpriseUnknown": "No 1,000+ cut of these 71 reviews is in the pack. They are rivals and legacy products, not current Amplify.",
        },
    }

    glossary = json.loads((ROOT / "public" / "data" / "glossary.json").read_text())
    for term, meaning in glossary.items():
        add_item(
            id=f"term-{slug(term)}",
            kind="note",
            paths=list(BOTH),
            section="start",
            title=term,
            text=f"{term}. {meaning}",
            note=meaning,
            sources=["Word list"],
        )

    # Related links: residual ids mentioned in the text.
    by_badge = {item["badge"]: item["id"] for item in items if item.get("badge")}
    for item in items:
        related = []
        for badge, item_id in by_badge.items():
            if badge and re.search(rf"\b{badge}\b", item["text"]) and item_id != item["id"]:
                related.append(item_id)
        item["related"] = related[:6]

    # Path cards duplicate the header switch. Start-page KPI strips are redrawn from the model.
    for node in find_all(parser.roots, lambda n: has_class(n, "kpis") or has_class(n, "pathcards")):
        prior = raw[:node["start"]]
        section_at = prior.rfind("<section")
        in_start = section_at >= 0 and 'id="t-start"' in prior[section_at:section_at + 80]
        if has_class(node, "pathcards") or in_start:
            inserts.append((node["gt"], ' data-legacy="true" hidden'))

    html = raw
    for pos, attrs in sorted(inserts, key=lambda pair: pair[0], reverse=True):
        html = html[:pos] + attrs + html[pos:]

    # Re-parse stamped HTML into section fragments.
    stamped = Tree(html)
    stamped.feed(html)
    section_html = []
    nav = [
        ("start", "Start here"),
        ("plain", "In plain terms"),
        ("win", "Where we win / lose"),
        ("tam", "Market"),
        ("icp", "ICP"),
        ("comp", "Competitors"),
        ("self", "MB self"),
        ("resid", "Still open"),
        ("council", "Council"),
        ("bets", "Plan"),
        ("ask", "Ask the plan"),
    ]
    found = {}
    for node in find_all(stamped.roots, lambda n: n["tag"] == "section" and n["attrs"].get("id", "").startswith("t-")):
        sid = node["attrs"]["id"].replace("t-", "")
        inner = stamped.html(node)
        inner = re.sub(r"^<section[^>]*>", "", inner)
        inner = re.sub(r"</section>\s*$", "", inner)
        found[sid] = inner
    for sid, label in nav:
        if sid not in found and sid != "ask":
            # value lives inside self; evidence lives inside comp.
            if sid in found:
                pass
        if sid in found:
            section_html.append({"id": sid, "label": label, "html": found[sid]})
        elif sid == "ask":
            section_html.append({"id": "ask", "label": label, "html": ""})

    # Evidence anchor section is not separate.
    if "comp" in found and not any(s["id"] == "comp" for s in section_html):
        raise SystemExit("competitors section missing")

    hero = {
        "core": {
            "title": "Core · weekly attendance 250–999",
            "lede": "Live selling is on hold. Public market intelligence is complete enough to plan. It does not prove enough to take Core live.",
            "kpiIds": [hold["id"], churches["id"], attendees["id"], ease["id"], giving["id"]],
        },
        "enterprise": {
            "title": "Enterprise · weekly attendance 1,000+",
            "lede": "Planning only. Live Core stays HOLD. This path is the pack’s 1,000–1,999 and 2,000+ bands. It is not a cleared launch.",
            "kpiIds": [
                hold["id"],
                "kpi-band-b-congregations",
                "kpi-band-b-count",
                "kpi-band-b-attendees",
                "kpi-band-a-count",
                "kpi-band-a-attendees",
                "kpi-megachurch-budget",
                "kpi-multisite",
            ],
        },
        "all": {
            "title": "Altogether · both paths",
            "lede": "Core (250–999) and Enterprise (1,000+) stay separate. Figures below are the pack’s own bands, not a blended market.",
            "kpiIds": [hold["id"], churches["id"], "kpi-band-b-count", "kpi-band-a-count", "kpi-megachurch-budget"],
        },
    }
    for snippet in ["Live selling is on hold", "does not prove enough to take Core live"]:
        require(plain, snippet, "lede")

    aliases = {
        "open-r1": ["safe switch", "switching", "migration", "migration cockpit", "switch"],
        "open-r2": ["gift-to-books", "gift to books", "rgtp", "dual-run", "dual run"],
        "open-r3": ["ease and support", "amplify reviews"],
        "open-r4": ["win/loss", "win loss", "win rate", "in-seat"],
        "open-r5": ["asp", "starter price", "spoken price"],
        "open-r6": ["attendance", "band quality", "default 200"],
        "open-r7": ["owners and dates", "go/no-go"],
        "open-r8": ["fees", "ach", "rate card"],
        "open-r9": ["78000", "78,000", "pco claim"],
    }
    for item in items:
        extra = aliases.get(item["id"])
        if extra:
            item["aliases"] = extra
        if item["kind"] == "competitor":
            item["aliases"] = {
                "pco": ["pco", "planning center", "planning center online"],
                "pushpay": ["pushpay", "push pay", "ccb"],
                "tithely": ["tithely", "breeze", "tithe.ly"],
                "subsplash": ["subsplash"],
                "acs": ["acs", "realm"],
                "mb": ["ministry brands", "amplify", "mb"],
            }.get(item["rival"], [])

    pack = {
        "corpusVersion": "2026-11-04-pack",
        "source": "https://share.benjohnson.ai/f/3fe33f08",
        "paths": {
            "core": {"id": "core", "label": "Core", "range": "Weekly attendance 250–999"},
            "enterprise": {"id": "enterprise", "label": "Enterprise", "range": "Weekly attendance 1,000+"},
            "all": {"id": "all", "label": "Altogether", "range": "Core and Enterprise"},
        },
        "hero": hero,
        "compare": compare,
        "charts": charts,
        "sections": section_html,
        "items": items,
        "askPrompts": {
            "core": [
                "Why is live Core on hold?",
                "What can we say about Band C today?",
                "What is still open on switching?",
            ],
            "enterprise": [
                "What does the pack say about churches at 1,000+?",
                "Is the 1,000–1,999 count known?",
                "How does Pushpay show up in the pack?",
            ],
            "all": [
                "How do Core and Enterprise differ in the pack?",
                "Which attendee share is Explicit Unknown?",
                "What is still open on both paths?",
            ],
        },
    }
    OUT.write_text(json.dumps(pack, ensure_ascii=False, indent=2))
    print(f"items {len(items)} sections {len(section_html)} bytes {OUT.stat().st_size}")
    kinds = {}
    for item in items:
        kinds[item["kind"]] = kinds.get(item["kind"], 0) + 1
    print(kinds)


if __name__ == "__main__":
    main()
