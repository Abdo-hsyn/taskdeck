# Design direction: TaskDeck

## Concept
**A ship's control console meets a dispatch board:** matte dark instrument panel, status lights that actually mean something (todo = dim, doing = amber pulse, done = green steady), and job tickets that read like printed dockets. Not "another SaaS dashboard" — an operations console for small teams.

## Audience + language + primary action
Junior devs / team leads evaluating the app in an internship application. English UI. Primary action: **move a task across the board** (the whole product exists for that one drag).

## References
- **Linear** (issue tracking): borrow the density and the keyboard-serious tone; avoid its purple-gradient marketing look.
- **Air traffic / transit dispatch boards**: borrow status semantics — color = state, never decoration; avoid literal airport signage.
- **Vercel dashboard**: borrow thin-border surfaces and tabular numerals; avoid its pure-white-on-black minimalism as the whole personality.

## Mood words (exactly 3)
Instrument-like, calm, precise

## Palette (custom, dark instrument panel)
- Base: `#0E1116` (panel), surface `#161A21`, raised `#1D232C`
- Line/border: `#2A323E`
- Text: `#E8EDF4`, muted `#8B96A7`
- Status: doing amber `#F2A93B`, done green `#3FBF7F`, todo slate `#5B6675`
- Priority accents: high `#E4574C`, medium `#F2A93B`, low `#5B6675`
- Focus ring: `#7FB0FF` (never remove)

## Type (Latin only — English UI)
- Display/UI: **Space Grotesk** (500/700) — headings, buttons, column titles
- Body: **Inter** is banned as the only face; body uses Space Grotesk 400 + **IBM Plex Mono** (400/500) for IDs, dates, counts, due dates, timestamps (tabular figures)
- Hero/empty-state headline: 40–56px/1.05; body 15px/1.5; mono labels 12px uppercase with 0.06em tracking

## Layout idea
- App shell: fixed 232px left rail (projects) + board area; board = 3 columns (Todo / Doing / Done), each column a recessed channel (darker than surface, 1px border, no shadow)
- Radius family: **4px everywhere** (tickets, inputs, buttons) — no rounded-xl cards
- Surfaces: **borders, not shadows**; one shadow allowed on drag-lift only
- Oversized element: column headers carry a huge mono count (28px) — the number is the graphic
- Editorial detail: every screen has a mono eyebrow line (`BOARD / WEBSITE REDESIGN`) like a console readout

## Signature moment (ONE)
**The status lamp:** each column header has a lamp that pulses (amber) while a task is in it; when a card drops into Done, the lamp flashes green once and the count ticks up. Subtle, 250ms, honors `prefers-reduced-motion`.

## Motion personality
Product-like, snappy: 120–180ms ease-out for hovers/inputs, drag-lift shadow, lamp pulse 2s loop (doing only), count tick. No scroll animation (app, not landing page).

## Ban list exceptions
- Inter: used ONLY for body paragraphs alongside Space Grotesk + Plex Mono (pairing, not sole face)
- No photography/illustration — the interface data is the imagery (justified: it's an app)

## Different from previous projects in
- [x] Palette (dark instrument panel vs. previous light/colored)
- [x] Type (Space Grotesk + Plex Mono vs. previous pairing)
- [x] Hero/first screen (working board, no marketing hero)
- [x] Radius (4px uniform vs. rounded cards)
