![Jekyll](https://img.shields.io/badge/jekyll-4.0-blue)
![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-enabled-brightgreen)
![category - power electronics](https://img.shields.io/badge/category-power%20electronics-lightgrey)
![status - active](https://img.shields.io/badge/status-active-success)


# Spirit Connect Power Labs

> **AI-Assisted Power Electronics Converter Design Automation**

Welcome to the public website repository of **Spirit Connect Power Labs**.  
We accelerate power electronics development using artificial intelligence: from topology exploration to thermal analysis and control synthesis.

**Live site:** [https://fulongli.github.io/spiritconnect.github.io/](https://fulongli.github.io/spiritconnect.github.io/)

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

This website is built using:

- **Jekyll** – Static site generator
- **GitHub Pages** – Hosting platform
- **HTML/CSS/JavaScript** – Frontend technologies

---

## Project Structure

```
spiritconnect.github.io/
├── _config.yml              # Jekyll configuration
├── _includes/               # Reusable components (navbar, footer, scripts)
├── _layouts/                # Page layouts
├── _posts/                  # Blog posts
├── assets/                  # CSS and static assets
├── images/                  # Images, videos, logos
│   ├── general/             # Logos and branding
│   ├── background/          # Background images
│   ├── research/            # Research page images
│   ├── team/                # Team photos
│   └── vids/                # Hero videos
├── company/                 # Company pages (about, team, careers, FAQ)
├── research/                # Research and product pages
│   ├── services.md          # Services overview
│   ├── microgrids/          # Microgrids research
│   ├── converters/          # Converters research
│   ├── devices/             # Devices research, databases, and testing assets
│   └── magnetics/           # Magnetics database
├── case-studies/            # Case study pages (DAB, SST)
├── accessories/             # Accessories pages (transducers/sensing)
├── legal/                   # Legal pages (privacy, terms, cookies)
├── contact.md               # Contact page
├── news.md                  # News page
└── index.md                 # Homepage
```

---

## Getting Started

### Prerequisites

- Ruby (for Jekyll)
- Bundler gem

### Local Development

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

4. Open your browser and navigate to `http://localhost:4000/spiritconnect.github.io/`

---

## Contributing

This is a public website repository. For contributions or inquiries, please contact us at [info@spiritconnect.co.uk](mailto:info@spiritconnect.co.uk).

---

## License

See [LICENSE.md](LICENSE.md) for details.

---

## Contact

- **Email:** [info@spiritconnect.co.uk](mailto:info@spiritconnect.co.uk)
- **Location:** Cardiff, United Kingdom
- **Website:** [https://fulongli.github.io/spiritconnect.github.io/](https://fulongli.github.io/spiritconnect.github.io/)

---

## Links

- [About Us](/company/about/)
- [Our Services](/research/services/)
- [Contact Us](/contact/)
- [Team](/company/team/)
