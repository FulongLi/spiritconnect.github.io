---
layout: default
title: Home
description: Building a Power Electronics AI Agent — from device to converter to grid — for a closed-loop energy-AI ecosystem.
---

<header class="hero">
  <video class="hero-video" autoplay muted loop playsinline>
    <source src="{{ '/images/vids/main.mp4' | relative_url }}" type="video/mp4">
  </video>
  <div class="bg"></div>
  <div class="container">
    <span class="badge">Power Electronics AI Agent</span>
    <h1>The AI that designs the power systems that power AI</h1>
    <p class="lead">
      We are building a Power Electronics AI Agent that closes the loop between intelligent
      system design and the energy infrastructure that fuels it — from semiconductor device
      to converter to grid.
    </p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="{{ '/about/' | relative_url }}">Our mission</a>
      <a class="btn btn-ghost" href="{{ '/research/services/' | relative_url }}">Explore the AI Agent</a>
    </div>
  </div>
</header>

<section class="section">
  <div class="container">
    <h2>Design across every scale</h2>
    <p class="lead">
      Our AI Agent operates across the full power electronics stack — three tightly connected layers
      that together form a complete, closed-loop design system.
    </p>
    <div class="grid">
      <div class="card" style="text-align:center;">
        <img src="{{ '/images/research/components.png' | relative_url }}" alt="Devices" style="width:100%;max-width:240px;border-radius:8px;margin-bottom:1rem;">
        <h3>Device</h3>
        <p>Characterize, model, and select semiconductor devices (SiC, GaN, Si) with AI-driven
           loss estimation, thermal profiling, and datasheet-to-model automation.</p>
        <a href="{{ '/research/devices/' | relative_url }}" style="display:inline-block;margin-top:1rem;font-weight:600;">Learn More →</a>
      </div>
      <div class="card" style="text-align:center;">
        <img src="{{ '/images/research/converter.png' | relative_url }}" alt="Converters" style="width:100%;max-width:240px;border-radius:8px;margin-bottom:1rem;">
        <h3>Converter</h3>
        <p>Explore topologies, size magnetics, synthesize control loops, and optimize multi-objective
           trade-offs — all orchestrated by the AI Agent in a single design pass.</p>
        <a href="{{ '/research/converters/' | relative_url }}" style="display:inline-block;margin-top:1rem;font-weight:600;">Learn More →</a>
      </div>
      <div class="card" style="text-align:center;">
        <img src="{{ '/images/research/microgrids.png' | relative_url }}" alt="Systems" style="width:100%;max-width:240px;border-radius:8px;margin-bottom:1rem;">
        <h3>System</h3>
        <p>Architect microgrids, DC distribution networks, and hybrid AC/DC power systems where every
           converter is co-optimized for the mission profile of the whole grid.</p>
        <a href="{{ '/research/microgrids/' | relative_url }}" style="display:inline-block;margin-top:1rem;font-weight:600;">Learn More →</a>
      </div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <h2>The closed-loop vision</h2>
    <p class="lead">
      We believe the future of energy and AI is a self-reinforcing cycle.
    </p>
    <div class="grid">
      <div class="card">
        <h3>AI designs power systems</h3>
        <p>Our Power Electronics AI Agent assists engineers in designing optimized converters and grids —
           faster, with better trade-offs, and with built-in validation workflows.</p>
      </div>
      <div class="card">
        <h3>Power systems fuel AI</h3>
        <p>The efficient, reliable power infrastructure that results — microgrids, DC distribution,
           high-density converters — powers the data centers and compute that run AI itself.</p>
      </div>
      <div class="card">
        <h3>AI upgrades power systems</h3>
        <p>Every design cycle feeds data back to the AI Agent. It learns, refines its models, and
           produces even better designs — a true closed-loop ecosystem.</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2>What the AI Agent does</h2>
    <p class="lead">A modular intelligence layer that plugs into your design flow — or we run it for you as a service.</p>
    <div class="grid">
      <div class="card"><h3>Topology exploration</h3><p>Constraint-aware search across LLC, DAB, multi-level DC-AC, interleaved buck/boost, and more.</p></div>
      <div class="card"><h3>Device & magnetics selection</h3><p>Automated WBG device picking, core sizing, winding optimization, and switching-loss estimation.</p></div>
      <div class="card"><h3>Loss & thermal modeling</h3><p>Datasheet + physics-guided surrogate models produce efficiency maps and thermal limits.</p></div>
      <div class="card"><h3>Control synthesis</h3><p>Phase-shift, TPWM strategies, current/voltage loops, and soft-switching regions — tuned automatically.</p></div>
      <div class="card"><h3>Multi-objective optimization</h3><p>Efficiency, power density, cost, temperature, EMI — Pareto trade-offs with clear rationales.</p></div>
      <div class="card"><h3>Validation planning</h3><p>Auto-generated HIL/SIL test matrices, data capture scripts, and repeatable lab workflows.</p></div>
    </div>
  </div>
</section>

<section class="section section-alt">
  <div class="container">
    <h2>Our Ecosystem</h2>
    <p class="lead">Industry partners building the closed-loop future of power electronics and AI together.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:2rem;align-items:center;text-align:center;">
      <div>
        <img src="{{ '/images/general/PX_logo.png' | relative_url }}" alt="Panxin Technologies" style="max-width:180px;">
        <p class="small">Panxin Technologies</p>
      </div>
      <div>
        <img src="{{ '/images/general/SHI_logo.jpg' | relative_url }}" alt="Sumitomo Heavy Industries" style="max-width:180px;">
        <p class="small">Sumitomo Heavy Industries</p>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2>Academic Partners</h2>
    <p class="lead">Collaborating with leading research institutions to advance AI-driven power electronics.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:2rem;align-items:center;text-align:center;">
      <div>
        <img src="{{ '/images/general/CU_logo.png' | relative_url }}" alt="Cardiff University" style="max-width:160px;">
        <p class="small">Cardiff University</p>
      </div>
      <div>
        <img src="{{ '/images/general/SHU_logo.jpg' | relative_url }}" alt="Shanghai University" style="max-width:160px;">
        <p class="small">Shanghai University</p>
      </div>
      <div>
        <img src="{{ '/images/general/LU_logo.png' | relative_url }}" alt="Loughborough University" style="max-width:160px;">
        <p class="small">Loughborough University</p>
      </div>
      <div>
        <img src="{{ '/images/general/UG_logo.png' | relative_url }}" alt="University of Glasgow" style="max-width:160px;">
        <p class="small">University of Glasgow</p>
      </div>
    </div>
  </div>
</section>
