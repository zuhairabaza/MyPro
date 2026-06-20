---
name: Academic Document System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#43474e'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#455f88'
  primary: '#002045'
  on-primary: '#ffffff'
  primary-container: '#1a365d'
  on-primary-container: '#86a0cd'
  inverse-primary: '#adc7f7'
  secondary: '#7b5800'
  on-secondary: '#ffffff'
  secondary-container: '#fdc34d'
  on-secondary-container: '#715000'
  tertiary: '#321b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f2e00'
  on-tertiary-container: '#c6955e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#adc7f7'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#ffdea6'
  secondary-fixed-dim: '#f7bd48'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5d4200'
  tertiary-fixed: '#ffddba'
  tertiary-fixed-dim: '#f2bc82'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#633f0f'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1440px
---

## Brand & Style
The design system is engineered to project the prestige and authority of Bayan University. It balances traditional academic excellence with modern computational efficiency. The aesthetic is **Corporate / Modern**, emphasizing high-legibility, structured information hierarchy, and a sense of institutional security. 

The visual language communicates trustworthiness through "stable" layouts and a rigorous adherence to a professional color palette. This is not just a tool; it is a digital extension of the university's archival and administrative integrity. Every interaction should feel intentional, minimizing cognitive load for users processing complex documents.

## Colors
The palette is rooted in **Deep Academic Blue**, used for primary navigation and structural headers to establish a foundation of stability. **Luxury Gold** is utilized sparingly as a high-intent accent for primary actions, progress indicators, and status highlights, reflecting the value of the processed information.

Backgrounds utilize a high-contrast **Clean White** for document viewing areas, with **Light Gray** (#f1f5f9) used for sidebar containers and secondary surfaces to provide subtle depth without clutter. Success, Error, and Warning states should be handled via semantic variations of the primary blue and gold to maintain a cohesive, professional appearance.

## Typography
This design system utilizes a dual-font approach to ensure clarity across both English and Arabic scripts. For English, **Inter** is the primary typeface, chosen for its exceptional legibility in data-heavy environments. For Arabic, **Tajawal** must be implemented to provide a clean, contemporary feel that matches the weight and geometry of Inter.

Typography scales are disciplined to maintain an organized document flow. Headlines use a semi-bold weight to command attention, while body text remains at a standard 400 weight for long-form reading. Line heights are generous (1.5x) to accommodate the dense nature of document extraction results and to ensure that Arabic diacritics are never cramped.

## Layout & Spacing
The layout follows a **Fixed Grid** model for desktop, centered on a 12-column system. This ensures that extraction dashboards and data tables remain predictable and easy to scan. A modular 8px spatial system (with 4px increments for tight components) governs all padding and margins.

On mobile devices, the 12-column grid collapses into a single-column flow with 16px side margins. For tablet views, an 8-column grid is utilized. Components like sidebars for document metadata have a fixed width (e.g., 320px) to maximize the workspace for the document viewer. White space is used strategically to separate distinct document sections, reinforcing the "organized" brand pillar.

## Elevation & Depth
Elevation is communicated through **Low-contrast outlines** and **Tonal Layers** rather than heavy shadows. This maintains a flat, professional academic aesthetic. 

- **Level 0 (Floor):** Light Gray background (#f8f9fa).
- **Level 1 (Cards):** Pure White surface with a 1px border (#e2e8f0).
- **Level 2 (Active/Hover):** A subtle, diffused shadow (0px 4px 6px -1px rgba(0, 0, 0, 0.05)) to indicate interactivity.
- **Level 3 (Modals/Popovers):** A more defined shadow to pull focus, paired with a semi-transparent backdrop blur for the background content.

Borders are the primary method of separation, keeping the interface feeling crisp and "archival."

## Shapes
The design system employs a **Soft** shape language. A standard 0.25rem (4px) corner radius is applied to buttons, input fields, and cards. This slight rounding softens the rigid nature of document data without losing the professional, authoritative feel of the university's brand.

Interactive elements like tags or "status chips" may use a slightly higher roundedness (rounded-lg) to distinguish them from structural elements like containers. Large document preview areas should remain at the base corner radius to maximize the viewing area.

## Components

### Steppers
Progress through document extraction (Upload -> Processing -> Verification -> Export) is visualized using a linear stepper. Completed steps use Deep Academic Blue with a Gold checkmark; the active step features a Luxury Gold border.

### Data Tables
Tables are the core of the extraction system. They feature a fixed header, alternating row highlights in very light gray, and clean 1px dividers. Header text is uppercase with increased letter spacing for a professional tabular look.

### Buttons
- **Primary:** Deep Academic Blue background, white text. No gradient. 
- **Secondary/Action:** Luxury Gold background, white text. Used only for "Finalize" or "Extract" triggers.
- **Ghost:** Transparent background with a Blue border, used for secondary navigation.

### Input Fields
Fields use a 1px border (#cbd5e1) that transitions to Deep Academic Blue on focus. Labels are positioned above the field in a 500-weight caption style.

### Document Cards
Cards used for file browsing feature a small thumbnail preview, a bolded title, and a footer section for metadata (date, file type) in a smaller caption font.
