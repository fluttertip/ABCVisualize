# AstronomicalBirthChartVisualize

Vite + React 18 + TypeScript + Tailwind + Zustand (+ React Router, HashRouter).

    npm install
    npm run dev      # http://localhost:5173
    npm run build

## Structure
- `src/lib/tz.ts`       – time zone maths: offset in force at the exact birth date/time from an IANA zone (DST + historical changes, via the browser's Intl database), gap/overlap detection
- `src/lib/geocode.ts`  – place search (Open-Meteo geocoding / GeoNames), offline fallback list, zone detection from coordinates
- `src/lib/zip.ts`      – tiny ZIP writer used for "all charts as separate images"
- `src/lib/engine.ts`   – Julian day, planets + Moon from `astronomy-engine` (apparent, equinox of date), mean node, Lahiri ayanamsa, ascendant
- `src/lib/chart.ts`    – turns an ephemeris into a ChartData (houses, dignity, nakshatra, aspects)
- `src/lib/arrows.ts`   – outgoing / incoming / lord-link arrows for a focused house or planet
- `src/lib/vargas.ts`   – divisional chart maths (`vargaPos`, `computeVarga`, `vargaWorking`): returns a normal ChartData so the same renderers work
- `src/lib/vargaInfo.ts` – per-chart rule, source, and plain-English meaning (strong / weak / failure / bad luck) for every chart
- `src/lib/drawSky.ts`  – canvas renderer for Section 1
- `src/components/`     – BirthForm, SkyWheel (S1), KundaliChart (S2), DetailPanel (S3), VargaSection (S4: 1–3 divisional charts), ControlsBar
- `src/store/useChart.ts` – single Zustand store (inputs, controls, one-time-animation flag, saved charts)
- (no homepage: the chart tool is the first screen; add routes in `src/App.tsx`)
- `src/pages/`          – Home, ChartPage (layout + snapshot->D1 morph), SavedPage

## Animation rule
`animatedSig` (dob|tob|lat|lon|tz) is stored on first animation. `generate()` returns true only
when the signature changed, so the snapshot morph plays once per distinct birth data.
Opening a saved chart resets it, so it plays once again.

## Adding later
- Divisional charts (Section 4) come in four honesty levels, each labelled in the UI:
  1. **Classical** – the 16 BPHS Shodashavarga (D1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60). One accepted rule each.
  2. **Convention** – D5, D6, D8, D11. Not in BPHS; published conventions, schools differ (alternatives are noted in `vargaInfo.ts`).
  3. **Reference** – Moon chart (Chandra Lagna) and Sun chart (Surya Lagna): D1 signs, 1st house moved.
  4. **Harmonic only** – every other D-number up to 60. No traditional Vedic rule exists; plain `floor(lon × N / 30)`.
  To change a rule edit the `switch` in `vargaPos` and the text in `vargaInfo.ts`.
- Birth place: type-ahead city search (online, `lib/geocode.ts`) or **Custom lat / long** (+N/−S, +E/−W) with a time-zone picker. The UTC offset is never a fixed number per city: it is computed from the zone for the actual birth date and time. If the clock time never existed / happened twice (DST change) the form says so. Choose "Manual UTC offset" to force a value. Needs internet for the search and for "Detect zone"; without it the built-in cities and the manual fields still work.
- Section 4 arrows: "Clean chart" / "With arrows" + Outgoing / Incoming / Lord link, separate from Section 2 (`vargaArrows` in the store, saved with the chart).
- Saved charts live in this browser's localStorage (key `astronomical-birth-chart-visualize-v1`; charts saved under the old `jyotish-studio-v1` key are still picked up). The Saved page tells the user they are not synced between browsers/profiles/devices.
- Save chart: stores the birth data AND the whole on-screen state (`SavedView`: scrubbed time, offsets, frame, selections, Section 4 picks, detail tab). Identical screens are not duplicated; any change saves as a new entry; Open restores it exactly.
- Download all charts (Section 4): `lib/exportCharts.tsx` builds one PDF (A4, 6 per page), one tall PNG, or a ZIP of separate PNGs (always clean, no arrows) of D1, Moon, Sun, the 16 classical vargas and D5/D6/D8/D11 (no harmonic charts). Edit `EXPORT_SET` to change the list.
- Yogas / Dasha: add `lib/yogas.ts`, `lib/dasha.ts` and new tabs in DetailPanel or new pages.
