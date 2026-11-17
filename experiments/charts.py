"""Small hand-made SVG charts, so the experiments need no extra libraries."""
from __future__ import annotations

from html import escape

ACCENT = "#2a36e8"
LUCK = "#a7aabd"
INK = "#17163b"
QUIET = "#5f6180"
GRID = "#e3e5ef"


def _nice_max(value: float) -> float:
    for step in (1, 2, 5, 10, 20, 25, 50, 100, 200):
        if value <= step * 5:
            return step * max(1, -(-value // step))
    return value


def lift_bars(rows: list, title: str, note: str, real_label: str = "Real data (line = 95% range)",
              luck_label: str = "Luck alone (all ideas equally good)") -> str:
    """Grouped bars: for each number of ideas, the real gain (with its 95% range) and a comparison bar.

    rows: [{"label": "2 ideas", "real": 7.9, "low": 7.1, "high": 8.6, "luck": 3.0}, ...] in percent.
    """
    width, height = 720, 380
    left, right, top, bottom = 64, 24, 70, 64
    plot_w, plot_h = width - left - right, height - top - bottom
    peak = max([r["high"] for r in rows] + [r["luck"] for r in rows] + [1.0])
    y_max = _nice_max(peak * 1.1)
    step = y_max / 5

    def y(value: float) -> float:
        return top + plot_h - max(0.0, value) / y_max * plot_h

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" '
        f'aria-label="{escape(title)}" font-family="system-ui, -apple-system, Segoe UI, Arial, sans-serif">',
        f'<rect width="{width}" height="{height}" fill="#ffffff"/>',
        f'<text x="{left}" y="30" font-size="17" font-weight="700" fill="{INK}">{escape(title)}</text>',
        f'<text x="{left}" y="52" font-size="13" fill="{QUIET}">{escape(note)}</text>',
    ]
    for i in range(6):
        value = step * i
        parts.append(f'<line x1="{left}" x2="{left + plot_w}" y1="{y(value):.1f}" y2="{y(value):.1f}" stroke="{GRID}"/>')
        parts.append(
            f'<text x="{left - 10}" y="{y(value) + 4:.1f}" font-size="12" text-anchor="end" fill="{QUIET}">+{value:g}%</text>'
        )
    group_w = plot_w / len(rows)
    bar_w = min(56.0, group_w / 3.2)
    for i, row in enumerate(rows):
        cx = left + group_w * (i + 0.5)
        real_x, luck_x = cx - bar_w - 3, cx + 3
        parts.append(
            f'<rect x="{real_x:.1f}" y="{y(row["real"]):.1f}" width="{bar_w:.1f}" '
            f'height="{y(0) - y(row["real"]):.1f}" rx="3" fill="{ACCENT}"/>'
        )
        whisker = real_x + bar_w / 2
        parts.append(
            f'<line x1="{whisker:.1f}" x2="{whisker:.1f}" y1="{y(row["high"]):.1f}" y2="{y(row["low"]):.1f}" '
            f'stroke="{INK}" stroke-width="1.5"/>'
        )
        for edge in (row["high"], row["low"]):
            parts.append(
                f'<line x1="{whisker - 6:.1f}" x2="{whisker + 6:.1f}" y1="{y(edge):.1f}" y2="{y(edge):.1f}" '
                f'stroke="{INK}" stroke-width="1.5"/>'
            )
        parts.append(
            f'<text x="{whisker:.1f}" y="{y(row["high"]) - 8:.1f}" font-size="12.5" font-weight="700" '
            f'text-anchor="middle" fill="{INK}">{round(row["real"], 1) + 0.0:+.1f}%</text>'
        )
        parts.append(
            f'<rect x="{luck_x:.1f}" y="{y(row["luck"]):.1f}" width="{bar_w:.1f}" '
            f'height="{y(0) - y(row["luck"]):.1f}" rx="3" fill="{LUCK}"/>'
        )
        parts.append(
            f'<text x="{luck_x + bar_w / 2:.1f}" y="{y(row["luck"]) - 8:.1f}" font-size="12" '
            f'text-anchor="middle" fill="{QUIET}">{round(row["luck"], 1) + 0.0:+.1f}%</text>'
        )
        parts.append(
            f'<text x="{cx:.1f}" y="{top + plot_h + 24:.1f}" font-size="13.5" font-weight="600" '
            f'text-anchor="middle" fill="{INK}">{escape(row["label"])}</text>'
        )
    legend_y = height - 14
    parts += [
        f'<rect x="{left}" y="{legend_y - 10}" width="12" height="12" rx="2" fill="{ACCENT}"/>',
        f'<text x="{left + 18}" y="{legend_y}" font-size="12.5" fill="{INK}">{escape(real_label)}</text>',
        f'<rect x="{left + 220}" y="{legend_y - 10}" width="12" height="12" rx="2" fill="{LUCK}"/>',
        f'<text x="{left + 238}" y="{legend_y}" font-size="12.5" fill="{INK}">{escape(luck_label)}</text>',
        f'<line x1="{left}" x2="{left + plot_w}" y1="{y(0):.1f}" y2="{y(0):.1f}" stroke="{QUIET}"/>',
        "</svg>",
    ]
    return "\n".join(parts)
