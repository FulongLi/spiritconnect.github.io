![Jekyll](https://img.shields.io/badge/jekyll-4.0-blue)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-enabled-brightgreen)
![category - power electronics](https://img.shields.io/badge/category-power%20electronics-lightgrey)
![status - active](https://img.shields.io/badge/status-active-success)


# Spirit Connect Power Labs

> **AI-Assisted Power Electronics Converter Design Automation**

Welcome to the public website repository of **Spirit Connect Power Labs**.
We accelerate power electronics development using artificial intelligence: from topology exploration to thermal analysis and control synthesis.

**Live site:** [https://spiritconnect.co.uk](https://spiritconnect.co.uk)

---

## What We Do

Spirit Connect Power Labs builds **automation tools and workflows** that help engineers design high-performance power converters faster and with better trade-offs.

### Core Services

- **Microgrids** – Designing, modeling, and controlling DC and AC microgrids for resilient and efficient energy distribution
- **Converters** – Optimized converter design and control strategies for high-performance applications (buck/boost, LLC, DAB, multi-level DC-AC)
- **Devices** – Device testing, modeling, and characterization for power electronics design automation

### AI-Assisted Design Capabilities

- **AI-driven topology exploration** – LLC, DAB, multi-level, interleaved buck/boost, and more
- **Magnetics and semiconductor selection** – WBG devices, core sizing, and winding optimization
- **Loss & thermal modeling** – efficiency maps, safe operating areas, temperature predictions
- **Control synthesis** – current/voltage loops, soft-switching zones, phase-shift and TPWM
- **Multi-objective optimization** – efficiency vs. density vs. cost vs. EMI headroom
- **Validation planning** – HIL/SIL hooks, automated test scripts, and repeatable experiments

---

## Technology Stack

- **Jekyll** – Static site generator
- **GitHub Pages** – Hosting platform
- **HTML/CSS/JavaScript** – Frontend

---

## Project Structure

```
spiritconnect.github.io/
├── _config.yml              # Jekyll configuration
├── _includes/               # Reusable components (navbar, footer, scripts)
├── _layouts/                # Page layouts
├── assets/                  # CSS and favicon assets
├── images/                  # Site media
│   ├── general/             # Logos and branding
│   ├── background/          # Background images
│   ├── research/            # Research page images
│   ├── team/                # Team photos
│   └── vids/                # Hero videos
├── company/                 # Company pages (about, team, careers, FAQ)
├── research/                # Research pages
│   ├── services.md          # AI Agent overview
│   ├── microgrids/          # Microgrids research
│   ├── converters/          # Converters research
│   ├── devices/             # Devices, characterizations, databases
│   └── magnetics/           # Magnetics database
├── solutions/               # Solutions (DAB, SST, Rogowski coil)
├── accessories/             # Accessories (transducers/sensing)
├── legal/                   # Privacy, terms, cookies
├── contact.md               # Contact page
├── news.md                  # News page
└── index.md                 # Homepage
```

---

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/FulongLi/spiritconnect.github.io.git
   cd spiritconnect.github.io
   ```

2. Install dependencies:
   ```bash
   bundle install
   ```

3. Run the Jekyll server:
   ```bash
   bundle exec jekyll serve
   ```

4. Open `http://localhost:4000/`

---

## License

See [LICENSE.md](LICENSE.md) for details.

---

## Contact

- **Email:** [info@spiritconnect.co.uk](mailto:info@spiritconnect.co.uk)
- **Location:** Cardiff, United Kingdom
- **Website:** [https://spiritconnect.co.uk](https://spiritconnect.co.uk)
