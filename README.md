# Down the Rabbit Hole

An endless, AI-written magazine. You type something you're curious about, and the site writes a feature page on it, grounded in real web research. Every page ends in two doors that lead further down, hides trapdoors in its text, and has an interactive toy in the middle. The deeper you fall, the darker the pages get. When you stop, you get a map of how far you drifted.

Live: https://claudescape-one.vercel.app

## Getting started

```bash
cp .env.example .env.local   # then fill in the keys
npm install
npm run dev
```

Open http://localhost:3000.

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Writes every page, fork, trapdoor and demo. |
| `ANAKIN_API_KEY` | No | Web search and Wikipedia scraping to ground pages in real sources. Without it, pages are written from the model's own knowledge. |
| `RABBIT_HOLE_MODEL` | No | Model used to write pages. Defaults to `claude-haiku-4-5`. |

## Features

### Landing page

- A single prompt: **"What are you curious about?"** Type any topic and press Enter or **Fall in ↓**.
- A drifting stream of example topic cards (sports cars, deep-sea gigantism, the history of salt, the Terracotta Army…), each with a line-art illustration. Clicking a card starts a journey on that topic. The stream pauses on hover or focus.
- Starting a journey plays a "fall" animation: the concentric rings of the hole at the bottom of the screen zoom up to fill the view.

### Feature pages

Each page is a magazine-style feature written for that topic, with:

- **A header:** the level number, how you got here ("Where you started", "↓ Deeper from…", "→ Sideways from…" or "↘ Trapdoor 'term' from…"), a kicker, a headline, and a standfirst.
- **A big figure:** one striking number or short term with a caption, e.g. `1977`, `86B`.
- **An intro paragraph** with a drop cap.
- **One of four layouts,** chosen by the model to suit the subject:
  - **Story:** three sections with headings, plus a large pull quote after the first.
  - **Timeline:** six dated events on an alternating vertical timeline.
  - **Comparison:** two contenders side by side ("vs"), a table of five head-to-head stats, and a verdict.
  - **Gallery:** six coloured "plates" in a mosaic, for visual subjects like designs, creatures, objects and places.

  The model is asked not to repeat the previous page's layout, so a journey keeps changing shape.
- **A closing paragraph** that leaves a thread dangling.
- **Sources:** the web pages the article was grounded in, listed at the bottom.

Blocks fade and slide in one after another as the page is written. While the model is working, you see a skeleton and rotating status lines ("Pulling files from the archive…", "Finding the strange parts…").

### Research grounding

Pages are grounded in real sources through Anakin (`/api/research`):

- **Fast mode** (~1s, web search only) is used for the first page, while the reader is waiting.
- **Deep mode** also scrapes the topic's Wikipedia article (~8–10s). It's used for pages written in the background, where there's time.
- The notes go into the prompt, and the model is told to prefer their names, dates and numbers and not to invent statistics or quotes.
- Research is best-effort. A slow or failed lookup never blocks a page, which then falls back to the model's own knowledge. Results are cached in memory for an hour, so a page and its background copy share one lookup.

### The two doors

The bottom of every page is **"The path splits."**: two tall arched doors that slide in as you scroll to them, with a branching line drawn between them.

- **↓ Deeper** ("Harder. Higher stakes."): the more intense, extreme or technical side of this page.
- **→ Sideways** ("Stranger. Off the map."): a weird, delightful tangent linked by one unexpected thread.

Both door pages are **written in the background** while you read, so each door shows a status: `◌ Writing…`, `● Ready`, or `○ Will write on entry` if the background write failed. Picking a door plays a full-screen transition: the door expands to fill the screen, speed streaks fall past, and the new level number and title appear ("↓ Deeper · falling to level 02"). If the page isn't ready yet, it says "Still writing the walls of this one…" and waits.

### Trapdoors in the text

Every page hides **4 trapdoors**: intriguing words or phrases in the article text (a person, phenomenon, object or place) that deserve a page of their own.

- They appear with a dotted accent underline and a small **↓**, and only the first mention on the page is linked. The first page shows a hint: "Underlined words are trapdoors. Tap one to fall in."
- Tapping one opens a small card with the trapdoor's title, a one-line teaser, a status line, and **Fall in ↓**. The card stays inside the viewport and opens upward near the bottom of the screen. Close it with ✕, Escape, or a click elsewhere.
- A trapdoor's page is only written when its card is opened, not ahead of time, to avoid 4 extra generations per page.
- Falling through a trapdoor uses the same transition as the doors. It counts as a level down and shows up on the path map as its own branch.
- If the model names a word that isn't actually in the text, that trapdoor simply isn't shown.

### Interactive demos

Every page has an **interactive toy** in the middle, after the second story section, the third timeline event, the comparison stats, or the third gallery plate. There are two kinds. The code chooses the kind: random on the first page, then alternating, so consecutive pages don't repeat.

- **What happens if…** (slider): a dial the reader turns through 5–7 steps, from mild to extreme, e.g. "What happens if you fall toward a black hole?". At each step a big readout in a ring gauge changes, the ring fills, a glow builds up, and a caption describes what's happening. You can drag the slider, use the arrow keys, or click the step labels under the track. A "Drag the dial" hint fades after the first interaction.
- **Take a guess:** a question whose answer is one surprising number, e.g. "How many flowers must bees visit to make one pound of honey?". The reader drags a slider to a guess (on a logarithmic scale when the range covers several orders of magnitude) and presses **Lock in my guess**. The answer marker then slides from the guess to the real value. A verdict follows (Spot on / Close / Not bad / Way off) with how far off you were ("247× too low") and a short explanation.

The demo is written in its own request, alongside the page body, so it never slows down the page. Pages written in the background get it in the same request. Every demo is checked before it's shown: missing fields, non-numeric ranges and answers outside the range are fixed or rejected, and an unusable demo is simply left out.

### Depth and colour

- Each level has its own palette. The surface is warm paper, and the pages get darker through amber and plum down to near-black navy by level 06.
- As you scroll toward the bottom of a page, the background blends toward the next level's colour ("sink on scroll").
- A **depth gauge** on the left edge shows your current level, the levels above you, and a vertical label ("At the surface", "2 levels down").
- The top bar shows the last few topics of your path as breadcrumbs, a **Path map** button with your level, and **Back to L0x ↓** when you're revisiting an earlier page.

### The path map

Open it any time with **Path map**, or with "peek at the map so far" under the doors.

- A headline summary, e.g. "You're 2 levels below *octopus*, somewhere around *cephalopod cardiovascular physiology*."
- Stats: levels down, pages read, sideways turns, and doors left closed.
- A **pannable, zoomable map** of the journey (drag or scroll to pan; pinch, ctrl+scroll or buttons to zoom) that opens centred on where you are. Pages you've read are solid dots joined by the path you took. Doors you didn't take are dashed branches, and doors on the latest page are marked "ahead". Deeper branches go left, sideways branches go right, and trapdoors drop further left.
- Everything on the map is clickable. **Visited** pages reopen that page. **Ahead** doors take the door. **Not taken** doors jump to the page they branched from, scrolled to its doors with that door highlighted.
- **Branching:** going back to an earlier page and taking a different door (or trapdoor) starts a new branch from there and replaces what came after. Taking the same way again walks back into your existing path.
- After level 3, the bottom of each page also offers **Stop falling · see how far you drifted**. This opens the map as a finale: "You started at *X* and ended up at *Y*."
- **Copy share text** copies "I fell N levels down the rabbit hole: started at X, ended up at Y." **Start a new hole** returns to the landing page.

## How it works

```
src/
  app/
    page.tsx                  Renders <RabbitHole hops={3} sinkOnScroll />
    api/complete/route.ts     Calls Claude with the magazine-editor system prompt; returns raw text
    api/research/route.ts     Anakin web search + Wikipedia scrape, cached in memory
  components/
    RabbitHole.tsx            The whole app: state, page generation, background writes, rendering, transitions, map
    rabbit-hole/
      content.ts              Types (Page, Fork, Thread, Demo), palettes, prompt fragments, demo validation, API helpers
      Demo.tsx                The two interactive demos (slider and guess)
      MapCanvas.tsx           Pannable, zoomable viewport for the path map
      TopicStream.tsx         Landing-page stream of example topics
      css.ts                  `css` tagged template (CSS string → React style object) and font variables
```

### Page generation

1. **First page** (the reader is waiting): a fast research lookup, then a short request for the page's opening (layout, headline, figure, intro), which appears first. Then the body (layout content, closing, doors, trapdoors) and the demo are requested **in parallel**. Whichever arrives second is merged in.
2. **Door pages** are written in the background as soon as the current page is ready, each in a single request with deep research. A door page is keyed by its parent page and door, so it's only written once, and picking the door waits for the same request.
3. **Trapdoor pages** follow the same path as door pages, but only start when a trapdoor card is opened.

The model returns JSON. The prompts in `content.ts` (`HEAD`, `SHAPES`, `TAIL`, `FORK_RULES`, `demoSchema`, `demoRule`) describe the exact shape and length of every field. Each prompt includes the journey so far, so doors and trapdoors never revisit a topic.

### Useful knobs

- `hops` on `<RabbitHole>`: the level after which "Stop falling" appears (default 3).
- `sinkOnScroll`: whether the background blends toward the next level while scrolling.
- `RABBIT_HOLE_MODEL`: switch to a larger model for richer writing, at the cost of speed.
- `PAL` in `content.ts`: the per-level palettes.

## Known limitations

- Pages, demos and trapdoors are written by a language model. Research grounding reduces mistakes but doesn't eliminate them, and a demo presents its number very confidently.
- The article layout is designed for desktop widths. Trapdoor cards and demos adapt to narrow screens, but the page grid itself doesn't yet.
- Journeys live only in memory. Refreshing the page, or a hot reload of `RabbitHole.tsx` during development, returns you to the landing page.
