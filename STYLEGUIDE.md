# Minimal Monochrome Data UI — Aesthetic Style Guide

This guide describes a **clean, neutral, data-first aesthetic** that can be applied to *any* app.  
It avoids brand, color, or product assumptions and focuses purely on visual tone, hierarchy, and restraint.

---

## Core aesthetic

- **Quiet, document-like UI**  
  Feels closer to a technical paper or ledger than a “web app”.
- **Monochrome by default**  
  No strong accent colors. Hierarchy comes from spacing, weight, and rules.
- **Lines over boxes**  
  Use thin dividers instead of cards, shadows, or backgrounds.
- **Dense but calm**  
  Compact rows, small type, generous vertical spacing between sections.

---

## Color system (neutral)

Use a *very small* grayscale palette.

- Background: `#FFFFFF`
- Primary text: `#111111`
- Secondary text: `#6A6A6A`
- Tertiary / faint text: `#9A9A9A`
- Strong divider: `#CCCCCC`
- Subtle divider: `#E6E7EB`
- Hover background (optional): `rgba(0,0,0,0.03–0.05)`

**Rules**
- No color used for meaning.
- Active states are weight + underline, not color.
- Icons inherit text color.

---

## Typography

### Font choices
- **Primary UI font**: system sans-serif  
  (`system-ui`, `-apple-system`, `Segoe UI`, etc.)
- **Data font**: system monospace  
  (`ui-monospace`, `SFMono`, `Menlo`, `Consolas`)

### Type scale (approximate)
- Page / document title: **16–18px**, semibold
- Section heading: **18–22px**, medium–semibold
- Body text: **12–13px**, regular
- Meta / labels: **11–12px**, regular, muted
- Table headers: **10–11px**, uppercase, letter-spaced
- Dense numeric data: **11–12px**, monospace

### Hierarchy rules
- Headings use **size + weight**, not color.
- Labels are muted; values are dark.
- Previous / secondary values are faint.

---

## Spacing & rhythm

Use a simple **4px-based scale**.

Common units:
- 4, 8, 12, 16, 24, 32, 48

Guidelines:
- Large whitespace *between sections*
- Tight spacing *within tables*
- Avoid visual noise between adjacent rows

---

## Layout philosophy

- **Single-column content** by default
- Moderate max width (≈ 760–860px)
- Center important titles; left-align dense data
- Avoid background panels or cards

---

## Dividers & structure

Dividers do most of the structural work.

- Thickness: `1px`
- Color:
  - Section boundaries: strong divider
  - Row boundaries: subtle divider
- No vertical grid lines unless necessary

Think *ledger*, not *dashboard*.

---

## Navigation & tabs

- Minimal text-only tabs or toggles
- Active state:
  - Darker text
  - Slightly heavier weight
  - Thin underline
- Inactive state:
  - Muted text
  - No background

No pills, no fills, no shadows.

---

## Tables & data presentation

### Table styling
- No outer border
- Horizontal rules only
- White background

### Headers
- Uppercase
- Small
- Muted
- Letter-spaced

### Rows
- Compact height
- Subtle separators
- Optional faint hover highlight

### Numbers & identifiers
- Always monospace
- Large values may wrap or break gracefully
- Use faint → dark to show change or progression

---

## Hierarchy inside data

For nested or structured data:

- Indentation communicates structure
- Repetition of type/label/value patterns
- Avoid icons unless necessary
- Use subtle tree guides or spacing, not heavy visuals

---

## Interaction cues

- Hover: extremely subtle background change
- Clickable items:
  - Inherit text color
  - Underline on hover only
- Expanded states:
  - Reveal content
  - Do not recolor parent rows

---

## Progress meters & timeline visualization

Progress indicators should feel like **technical diagrams**, not dashboard widgets.

### Linear progress bar

A horizontal bar representing completion or vesting progress.

**Structure:**
```
┌─────────────────────────────────────────────────────────┐
│██████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└─────────────────────────────────────────────────────────┘
```

**Styling:**
- Outer container: `1px` border, `#CCCCCC`, no border-radius
- Filled portion: solid `#111111`
- Unfilled portion: `#E6E7EB` or subtle diagonal hatching
- Height: `4–8px` (thin, not chunky)
- No rounded ends, no gradients, no glow

**Segmented variant** (for showing claimed / claimable / locked):
```
┌────────────────────────────────────────────────────────┐
│███████████████│░░░░░░░░░░░░│                           │
│   claimed     │  claimable │         locked            │
└────────────────────────────────────────────────────────┘
```

- Claimed: solid fill `#111111`
- Claimable: diagonal hatching or dense dots `#111111`
- Locked: empty / white with subtle border
- Segment dividers: `1px` vertical line `#CCCCCC`

### Vesting timeline

A horizontal axis showing temporal milestones (start, cliff, now, end).

**Structure:**
```
START              CLIFF                NOW                    END
  │                  │                   ▼                      │
  ├──────────────────┼───────────────────●──────────────────────┤
  │                  │                   │                      │
2024-01-01      2024-04-01          2024-08-15             2025-01-01
```

**Styling:**
- Main axis: `1px` solid line `#111111`
- Tick marks: short vertical lines `4–8px` tall
- Milestone labels: `10–11px` uppercase, muted, letter-spaced
- Date values: `11–12px` monospace, primary text
- Current position marker: small filled circle `●` or thin vertical line
- Avoid arrows, triangles, or decorative markers

**Cliff visualization:**
- Cliff period can use a patterned fill (diagonal lines) on the timeline
- Or simply mark with a distinct tick and label
- No color differentiation — use pattern or emptiness

### Numeric annotations

Always pair visual progress with exact values:

```
VESTED          42,500.00 / 100,000.00 TOKEN     42.5%
                ─────────────────────────────────────
CLAIMED         38,000.00 TOKEN
CLAIMABLE        4,500.00 TOKEN
LOCKED          57,500.00 TOKEN
```

- Values: monospace, right-aligned
- Labels: muted, left-aligned
- Percentages: optional, shown inline or as separate column

---

## Loading states & spinners

Loading indicators should be **minimal and mechanical**, not playful.

### Primary spinner

A simple rotating element suggesting computation.

**Design:**
- Shape: thin circular arc (not a full ring)
- Stroke: `1–2px`, `#111111`
- Arc length: approximately 270° (three-quarters)
- Gap: 90° opening
- Size: `16–24px` diameter for inline, `32–48px` for page-level

**Animation:**
- Rotation: continuous `360deg`, linear easing
- Duration: `0.8–1.2s` per revolution
- No pulsing, scaling, or color changes

**CSS reference:**
```css
.spinner {
  width: 20px;
  height: 20px;
  border: 1.5px solid transparent;
  border-top-color: #111111;
  border-right-color: #111111;
  border-bottom-color: #111111;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Alternative: tick spinner

A more mechanical variant using discrete steps.

**Design:**
- 8 or 12 short radial lines arranged in a circle
- Lines fade from `#111111` to `#E6E7EB`
- Animation: discrete steps, each line highlights in sequence

**Animation:**
- Steps: `steps(8)` or `steps(12)` timing function
- Duration: `0.8–1s` per cycle
- Feels like a clock or dial indicator

### Skeleton loading

For content areas awaiting data:

- Use subtle horizontal lines or blocks
- Color: `#E6E7EB` with optional very subtle pulse (`opacity: 0.5 → 1`)
- Match the expected layout dimensions
- No shimmer gradients — too decorative

**Skeleton example:**
```
┌─────────────────────────────────────┐
│ ████████████████                    │  ← title placeholder
│ ████████████████████████████████    │  ← text placeholder
│ ████████████                        │  ← shorter line
└─────────────────────────────────────┘
```

### Loading text

When appropriate, use simple text:

```
Loading…
```

- Monospace font
- Muted color `#6A6A6A`
- Optional: animate ellipsis (`. → .. → ...`)
- No spinner needed if text is sufficient

### Inline field loading

For individual data fields awaiting external data (e.g., prices, live contract data):

**Structure:**
```
CLAIMABLE       1,500.00 YFI     ◐        ← spinner where USD value will appear
LOCKED          3,500.00 YFI     $29,596.81
```

**Design:**
- Spinner replaces the pending value, same position
- Size: `12–14px` diameter (matches text line height)
- Maintains layout stability — no content shift when data arrives

**CSS reference:**
```css
.inline-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid transparent;
  border-top-color: #6A6A6A;
  border-right-color: #6A6A6A;
  border-bottom-color: #6A6A6A;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
}
```

**Behavior:**
- Show spinner immediately when data fetch begins
- Replace with actual value once loaded
- If fetch fails, show "—" or muted "unavailable" text
- Never leave spinner spinning indefinitely — timeout after 10s

**Multiple fields loading:**
```
TOTAL VALUE         ◐
                    ──────────
CLAIMABLE           1,500.00 YFI     ◐
LOCKED              3,500.00 YFI     ◐
CLAIMED               500.00 YFI     ◐
```

Each field loads independently; replace each spinner as its data arrives.

### Placement guidelines

- Inline spinners: next to or replacing the element being loaded
- Page spinners: centered, with generous whitespace
- Never overlay with dark backgrounds or modals
- Keep the page structure visible during load when possible

---

## Things to avoid

- Bright accent colors
- Cards, shadows, rounded containers
- Heavy borders
- Decorative icons
- Gradients or depth effects
- Color-based meaning
- "Quick actions" panels or shortcut sections
- Feature showcases or marketing sections
- Redundant navigation (if it's in the nav, don't repeat it)
- Hero images or decorative illustrations
- Tooltips or help text unless absolutely necessary
- Empty states with illustrations
- Onboarding flows or tutorials

---

## Mental model to design against

> “Could this be printed on paper and still feel correct?”

If yes, it matches the aesthetic.

---

## Summary checklist

- White background
- Grayscale only
- Lines > boxes
- Weight > color
- Monospace for data
- Tight rows, loose sections
- Calm, technical, timeless

This aesthetic should feel **boringly correct** — and that’s the goal.