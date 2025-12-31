# After Me

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Offline Ready](https://img.shields.io/badge/Offline-Ready-green?style=flat)](.)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-blue?style=flat)](.)
[![Privacy First](https://img.shields.io/badge/Privacy-First-purple?style=flat)](.)

**The URL is the artifact.**

Transform your family history into a self-contained, archival-grade time capsule that works offline, forever. No servers, no dependencies, no expiration.

---

## Features

### Archival-Grade Preservation
- Lossless GEDCOM 5.5.1 parsing with complete tag preservation
- Dual-model architecture: canonical (lossless) + friendly (UI-optimized)
- Full custom tag support (Ancestry, FamilySearch, MyHeritage)

### Beautiful Visualization
- Interactive family tree with hierarchical layout
- Rich person details with events, sources, and media
- Search across all individuals
- Responsive design with warm, archival aesthetic

### Self-Contained Sharing
- **HTML Capsule** - Download a single HTML file with all data embedded
- **URL Sharing** - Share via URL with automatic compression
- Zero external dependencies in generated artifacts

### Export
- GEDCOM 5.5.1 with lossless round-trip support

---

## Live Demo

**[Try After Me Online](https://somoore.github.io/after-me/)** - No installation required!

---

## Quick Start

### Online (Recommended)
1. Visit the [live demo](https://somoore.github.io/after-me/)
2. Upload your GEDCOM file (drag & drop or click "Load")
3. Explore your family tree
4. Share via HTML capsule or URL

### Local
1. Open `index.html` in any modern browser
2. Load your GEDCOM file (drag & drop or click "Load")
3. Explore your family tree
4. Share via HTML capsule or URL

---

## Sharing Options

### HTML Capsule (Recommended)
Best for large trees. Download a self-contained HTML file that works anywhere, offline, forever.

### URL Sharing
Best for small trees (<50KB). The entire family tree is encoded in the URL itself.

| URL Size | Compatibility |
|----------|--------------|
| 0-20 KB | All browsers |
| 20-50 KB | Chrome, Firefox, Edge |
| 50+ KB | Use HTML Capsule |

---

## Building

```bash
cd build && ./build-afterme.sh
```

---

## Privacy

After Me runs entirely in your browser:
- No data sent to servers
- No tracking or analytics
- No cookies or storage
- Full offline capability

---

## Hosting Your Own

After Me works with any static hosting service:

### GitHub Pages
1. Fork this repository
2. Go to Settings → Pages
3. Under "Build and deployment", select "GitHub Actions"
4. Your site will be live at `https://YOUR-USERNAME.github.io/after-me/`

### Other Static Hosts
Simply upload `index.html` to any static host (Netlify, Vercel, S3, etc.) - no build step required.

---

## Credits

Built with [Cytoscape.js](https://js.cytoscape.org/), [Dagre](https://github.com/dagrejs/dagre), and [Pako](https://github.com/nodeca/pako).

---

**The URL is the artifact.**
