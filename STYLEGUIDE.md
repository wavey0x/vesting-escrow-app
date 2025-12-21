# Minimal Monochrome Data UI — Aesthetic Style Guide

This guide describes a **clean, neutral, data-first aesthetic** that can be applied to *any* app.
It avoids brand, color, or product assumptions and focuses purely on visual tone, hierarchy, and restraint.

---

## Core aesthetic

- **Quiet, document-like UI**
  Feels closer to a technical paper or ledger than a "web app".
- **Monochrome by default**
  No strong accent colors. Hierarchy comes from spacing, weight, and rules.
- **Lines over boxes**
  Use thin dividers instead of cards, shadows, or backgrounds.
- **Dense but calm**
  Compact rows, small type, generous vertical spacing between sections.

---

## Color system

Use a *very small* grayscale palette with dark mode support.

### Light mode

- Background: `#FFFFFF`
- Primary text: `#111111`
- Secondary text: `#6A6A6A`
- Tertiary / faint text: `#9A9A9A`
- Strong divider: `#CCCCCC`
- Subtle divider: `#E6E7EB`
- Hover background: `rgba(0,0,0,0.03–0.05)`

### Dark mode

- Background: `#1A1A1A` (soft black, not pure `#000000`)
- Primary text: `#FAFAFA`
- Secondary text: `#D8D8D8`
- Tertiary / faint text: `#A0A0A0`
- Strong divider: `#404040`
- Subtle divider: `#2A2A2A`
- Hover background: `rgba(255,255,255,0.03–0.05)`

**Dark mode philosophy:**
- Invert the palette, not the design
- Maintain the same contrast ratios
- Soft black is easier on the eyes than pure black
- Text should feel bright but not harsh

### Color rules

- No color used for decorative purposes
- Active states use weight + underline, not color
- Icons inherit text color
- Status badges are the **one exception** — see Status indicators section

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

### Layout stability

Prevent layout shifts that feel jarring:

- Use `overflow-y: scroll` on the html element to prevent scrollbar appearance from shifting content
- Set `min-height` on containers that may have variable content
- Set `min-width` on badges and status indicators
- Use skeleton placeholders that match final content dimensions

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
- Icons permitted but must be monochrome and inherit text color
- Active state:
  - Darker text
  - Slightly heavier weight
  - Thin underline (2px, offset for breathing room)
- Inactive state:
  - Muted text
  - No background

No pills, no fills, no shadows.

### Back navigation

- Prefer a simple back arrow icon over breadcrumbs
- Use a proper arrow with tail (`←`), not a chevron (`<`)
- Position above the page title
- Muted color, brightens on hover

---

## Cards & list items

When displaying collections of items (e.g., records, entries):

### Structure
```
┌─────────────────────────────────────────────────────────────┐
│ ☆                                                           │  ← action in corner
│ [Icon] Title / Name              Identifier    ○            │
│        Subtitle / Amount                                    │
│                                                             │
│ ═══════════════════════════════════════════════════════ 42% │  ← progress bar
│                                                             │
│ Label: Value              Label: Value                      │
│ Label: Value              Label: Value                      │
└─────────────────────────────────────────────────────────────┘
```

### Styling
- Border: `1px` strong divider color
- Border radius: small (`4–8px`) — exception to "no rounded" rule for touch targets
- Hover: border color transitions to primary
- Padding: `16px`

### Action buttons in cards
- Position absolutely in corners (top-right for favorites/stars)
- Very snug positioning (`2–4px` from edge)
- Actions are "first-class citizens" — not bound by content padding
- Use subtle icons that brighten on hover

### Responsive behavior
- Use `justify-between` on mobile to maximize space
- Reduce gaps between columns on smaller screens
- Prevent text wrapping with `whitespace-nowrap` on critical data
- Allow less important columns to compress

---

## Status indicators & badges

**This is the one area where color is permitted**, because status requires quick visual scanning.

### Design
- Small pill shape with subtle background
- Muted, desaturated colors — not bright or saturated
- Text should remain readable
- Set `min-width` to prevent layout shift when status changes

### Status color palette (light mode)

| Status | Background | Text |
|--------|------------|------|
| Active/In Progress | `amber-100` | `amber-700` |
| Success/Complete | `emerald-100` | `emerald-700` |
| Available/Ready | `green-100` | `green-700` |
| Neutral/Done | `gray-100` | `gray-600` |

### Status color palette (dark mode)

| Status | Background | Text |
|--------|------------|------|
| Active/In Progress | `amber-900/40` | `amber-300` |
| Success/Complete | `emerald-900/40` | `emerald-300` |
| Available/Ready | `green-900/40` | `green-300` |
| Neutral/Done | `gray-800` | `gray-400` |

### Loading state
- Show a skeleton placeholder matching badge dimensions
- Subtle pulse animation
- Prevents incorrect status from flashing before data loads

---

## Toggle switches

For boolean settings (e.g., "Hide completed"):

### Design
- Small horizontal pill shape
- Circular knob that slides
- Height: `20px`, Width: `36px`
- Knob: `14px` diameter

### Styling
- Track (off): subtle divider color
- Track (on): strong divider color (not accent color)
- Knob: white with subtle border
- Border on knob prevents it from disappearing against light backgrounds

### Avoid
- Bright colored tracks (green, blue)
- Large chunky toggles
- Toggle without adjacent label

---

## Addresses & identifiers

For blockchain addresses, hashes, or long identifiers:

### Display format
- Abbreviated: `0x1234...5678` (4 chars + ... + 4 chars)
- Always monospace font
- Secondary/muted text color

### Actions (inline)
- Copy button: small icon, appears inline
- External link: small outbound arrow icon
- Both icons muted, brighten on hover

### Example
```
0xA3a8...467c [copy] [↗]
```

---

## Progress meters & timeline visualization

Progress indicators should feel like **technical diagrams**, not dashboard widgets.

### Linear progress bar

**Styling:**
- Outer container: subtle background, small border-radius
- Height: `8px` (thin, not chunky)
- No outer border in simplified variant

**Fill patterns:**
- In progress: diagonal hatched pattern (greyscale stripes)
- Complete (100%): solid fill (no hatching)
- Hatching creates visual interest without color

**CSS for hatched pattern:**
```css
background: repeating-linear-gradient(
  -45deg,
  #888,
  #888 2px,
  #bbb 2px,
  #bbb 4px
);
```

**Markers:**
- Cliff/milestone marker: thin vertical line in accent color (blue)
- Current position: solid block at end of filled portion

### Segmented variant (claimed / claimable / locked)

```
┌────────────────────────────────────────────────────────┐
│███████████████│▒▒▒▒▒▒▒▒▒▒▒▒│                           │
│   claimed     │  claimable │         locked            │
└────────────────────────────────────────────────────────┘
```

- Claimed: solid grey fill
- Claimable: hatched pattern
- Locked: empty / background color
- Current position marker: solid vertical line at boundary

### Vesting timeline

A horizontal axis showing temporal milestones (start, cliff, now, end).

**Structure:**
```
START              CLIFF                NOW                    END
  │                  │                   │                      │
  ├──────────────────┼───────────────────●──────────────────────┤
  │                  │                   │                      │
Jan 2024         Apr 2024           Aug 2024              Jan 2025
```

**Styling:**
- Main axis: border with background
- Milestone labels: small uppercase, muted, letter-spaced
- Date values: small, monospace
- Cliff marker: distinct color (muted blue) for visibility

---

## Loading states & spinners

Loading indicators should be **minimal and mechanical**, not playful.

### Progressive loading strategy

1. Show layout structure immediately
2. Display cached/static data first
3. Show skeleton placeholders for pending data
4. Fill in live data as it arrives

**Never block the entire UI waiting for slow data.**

### Skeleton loading

For content areas awaiting data:

- Use blocks matching expected content dimensions
- Color: subtle divider with gentle pulse animation
- Match the layout to prevent content shift
- No shimmer gradients — too decorative

### Primary spinner

- Shape: thin circular arc (270°)
- Stroke: `1–2px`, primary text color
- Size: `16–24px` inline, `32–48px` page-level
- Animation: continuous rotation, `0.8–1.2s`, linear

### Inline field loading

For individual values being fetched:

- Small spinner (`12–14px`) replacing the pending value
- Maintains exact layout position
- Replace with value when loaded, "—" if failed

---

## Interaction cues

- Hover: extremely subtle background change
- Clickable items:
  - Inherit text color
  - Underline on hover only
- Expanded states:
  - Reveal content
  - Do not recolor parent rows

### External links

- Include small outbound arrow icon (`↗`)
- Opens in new tab
- Icon is muted, brightens on hover
- Position immediately after the linked text

---

## Responsive design

### Breakpoint philosophy
- Mobile-first is not required — optimize for the primary use case
- Ensure usability on mobile, but desktop density is acceptable

### Mobile adaptations
- Reduce gaps between elements
- Use `justify-between` to maximize horizontal space
- Allow non-critical columns to compress
- Prevent critical data from wrapping (`whitespace-nowrap`)
- Stack elements vertically when horizontal space is insufficient

### Touch targets
- Minimum `44px` for primary actions
- Cards and list items should be fully tappable
- Corner actions (stars, menus) need adequate padding

---

## URL design & shareability

For apps with views that can be shared:

- Encode filter/search state in URL query parameters
- Default values should be omitted from URL
- Non-default values should be explicit
- URLs should be human-readable when possible

Example:
```
/view?q=0x1234...&hideCompleted=false
```

---

## Things to avoid

- Bright accent colors (except muted status badges)
- Cards with shadows
- Heavy borders
- Decorative icons
- Gradients or depth effects
- Color-based meaning (except status)
- "Quick actions" panels
- Feature showcases or marketing sections
- Redundant navigation
- Hero images or decorative illustrations
- Tooltips unless absolutely necessary
- Empty states with illustrations
- Onboarding flows or tutorials
- Breadcrumbs (prefer back button)
- Pure black (`#000000`) in dark mode

---

## Mental model to design against

> "Could this be printed on paper and still feel correct?"

If yes, it matches the aesthetic.

For dark mode:

> "Is this a dark piece of paper, or a glowing screen?"

It should feel like dark paper — muted, not emissive.

---

## Summary checklist

- [ ] Grayscale palette (with dark mode variant)
- [ ] Lines > boxes
- [ ] Weight > color
- [ ] Monospace for data
- [ ] Tight rows, loose sections
- [ ] Layout stability (no shifts)
- [ ] Progressive loading (never block on slow data)
- [ ] Status badges are the only color exception
- [ ] Muted, desaturated status colors
- [ ] External links have outbound icon
- [ ] Back button over breadcrumbs
- [ ] Responsive gaps and wrapping
- [ ] Shareable URLs with query params

This aesthetic should feel **boringly correct** — and that's the goal.
