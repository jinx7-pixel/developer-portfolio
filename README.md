# Personal Portfolio

A modern, responsive personal portfolio site built with **HTML**, **Tailwind CSS** (vendored), and **vanilla JavaScript**. No build step required — just open `index.html`.

## Structure

```
.
├── index.html              # All sections of the site
├── css/
│   ├── styles.css          # Custom styles + animations
│   └── tailwind.js         # Vendored Tailwind play CDN (works offline)
├── js/
│   └── main.js             # Mobile menu, smooth scroll, animations, typing effect, form handler
└── assets/                 # Drop your images / screenshots here
```

## Quick start

Open `index.html` directly in your browser, or serve locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's included

- Sticky responsive navbar with mobile hamburger menu
- Hero with animated typing effect and gradient orbs
- About me + quick info grid + animated stat counters
- Skills section (6 categories with colored icons)
- Projects section (6 cards with category badges, tech stack, links)
- Education & Experience timeline (alternating left/right)
- Contact section with info cards + working form (demo submit)
- Footer with social links
- Scroll-triggered fade-up animations (IntersectionObserver)
- Smooth scrolling between sections
- Back-to-top button
- Active nav link spy
- Dark theme with blue/purple accents
- Fully responsive (mobile / tablet / desktop)
- Respects `prefers-reduced-motion`

## Customizing placeholders

Search for these in `index.html` and replace with your real info:

| Placeholder                            | Where                       |
| -------------------------------------- | --------------------------- |
| `[Your Name]`                          | Logo, hero, footer, `<title>` |
| `[Your Role]`                          | About section              |
| `[your.email@example.com]`             | Contact, mailto links      |
| `[Your City, Country]`                 | About + contact info       |
| `[your-handle]`                        | GitHub / LinkedIn / Twitter URLs |
| `[Company Name]`, `[University Name]`, `[School Name]` | Education timeline |
| `[City, Country]` in education items   | Education timeline         |
| `[X years ago — placeholder]`          | About copy                 |
| `[your hobby — placeholder]`           | About copy                 |
| Stat numbers (`data-count="3"` etc.)   | About stats                |
| Project titles, descriptions, tech pills, links | Projects section     |

The avatar placeholder is a user icon — drop your photo into `assets/avatar.jpg` and replace the `<svg>` block in the About section with `<img src="assets/avatar.jpg" alt="…" class="w-full h-full object-cover" />`.

Project card images use gradient placeholders. To swap in real screenshots, replace each `<div class="project-image bg-gradient-to-br …">` with `<div class="project-image bg-slate-800"><img src="assets/project-1.jpg" class="w-full h-full object-cover" /></div>`.

## Swapping Tailwind back to CDN

If you'd rather use the official CDN (smaller checkout, ~zero local footprint), edit `index.html`:

```html
<!-- replace -->
<script src="css/tailwind.js"></script>
<!-- with -->
<script src="https://cdn.tailwindcss.com"></script>
```

## Form submission

`js/main.js` ships with a demo `handleSubmit()` that simulates sending. To wire it to a real backend (e.g. Formspree, your own API), replace the `setTimeout(...)` block in `handleSubmit` with a `fetch()` call.

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses `IntersectionObserver`, `backdrop-filter`, and CSS Grid — all baseline features in current browsers.
