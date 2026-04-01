# Style Guide

This app uses a restrained, data-first interface: monochrome by default, compact spacing, and status color only where quick scanning matters.

## Design Principles

- Prefer lines, spacing, and type weight over decorative surfaces.
- Keep blockchain data readable at a glance.
- Use color sparingly for status and action emphasis.
- Preserve the same layout language in light and dark mode.

## Theme Tokens

The source of truth is `src/index.css`, with matching Tailwind aliases in `tailwind.config.js`.

### Core colors

| Token | Light | Dark |
| --- | --- | --- |
| `--color-background` | `#FFFFFF` | `#1a1a1a` |
| `--color-surface` | `#F9FAFB` | `#1E1E1E` |
| `--color-primary` | `#111111` | `#FAFAFA` |
| `--color-secondary` | `#6A6A6A` | `#D8D8D8` |
| `--color-tertiary` | `#9A9A9A` | `#A0A0A0` |
| `--color-divider-strong` | `#CCCCCC` | `#404040` |
| `--color-divider-subtle` | `#E6E7EB` | `#2A2A2A` |

### Accent tokens

- `--color-claimable`: green accent used in claim-oriented visuals
- `--color-claimable-light`: softer supporting tone for dark/light claim states

Dark mode is controlled by the `dark` class on the `<html>` element.

## Typography

- The global UI is intentionally monospace-forward to reinforce the ledger-like feel.
- Tailwind still exposes both `sans` and `mono` stacks for component-level use.
- Use the configured type scale rather than ad hoc sizes:
  - `title`: 18px
  - `heading`: 16px
  - `body`: 13px
  - `meta`: 12px
  - `table-header`: 11px uppercase
  - `data`: 12px monospace

## Layout

- App shell: sticky header with a thin bottom divider.
- Primary content width: `max-w-4xl`, with most pages narrowing to `max-w-3xl` or `max-w-xl`.
- Prefer single-column flows for dense data and forms.
- Use `overflow-y: scroll` on `html` to avoid horizontal shifts when scrollbars appear.

## Component Patterns

### Navigation

- Header nav uses plain text links with underline for the active state.
- Manage-page tabs use border-bottom activation, muted inactive text, and compact iconography.

### Cards and Panels

- Use thin borders and light corner rounding.
- Avoid shadows.
- Keep paddings compact: most panels use `p-4` or `p-6`.

### Forms

- Inputs are bordered, flat, and monochrome.
- Focus state is a border transition, not glow or shadow.
- Numeric and address fields should favor monospace readability.

### Progress and Timeline

- Progress bars are thin and bordered.
- Hatched fills communicate claimable or timeline segments without introducing heavy fills.
- Percentage labels stay small and secondary.

### Status Badges

Status badges are the main exception to the monochrome rule.

| Status | Label | Treatment |
| --- | --- | --- |
| `cliff` | `Pre Cliff` | amber |
| `vesting` | `In Progress` | emerald |
| `claimable` | `Claimable` | blue |
| `completed` | `Completed` | neutral gray |
| `revoked` | `Revoked` | red |

Badges should keep a stable minimum width to reduce layout shift.

### Loading States

- Use skeleton placeholders that roughly match final dimensions.
- Prefer subtle shimmer over large animated spinners.
- Use inline spinners only for short-lived actions.

## Implementation References

- `src/index.css`
- `tailwind.config.js`
- `src/components/Layout.tsx`
- `src/components/StatusBadge.tsx`
- `src/components/VestingTimeline.tsx`
