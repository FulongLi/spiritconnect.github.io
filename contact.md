---
layout: default
title: Contact
permalink: /contact/
description: Contact Spirit Connect Power Labs — the Power Electronics AI Agent, services, collaborations, and device research.
---

<header class="hero">
  <video class="hero-video" autoplay muted loop playsinline>
    <source src="{{ '/images/vids/compicon.mp4' | relative_url }}" type="video/mp4">
  </video>
  <div class="bg"></div>
  <div class="container">
    <h1>Contact</h1>
    <p class="lead">
      Questions about the <strong>Power Electronics AI Agent</strong>, our research and engineering services,
      or a potential collaboration — we would like to hear from you.
    </p>
  </div>
</header>

{% assign wf = site.web3forms_access_key | default: '' | strip %}
{% assign tk = site.turnstile_site_key | default: '' | strip %}
{% assign contact_email = 'info@spiritconnect.co.uk' %}

<section class="section contact-page">
  <div class="container">
    <p id="contact-thanks" class="contact-thanks" hidden role="status">
      Thank you — your message was sent. We will get back to you soon.
    </p>
    <div class="contact-layout">
      <div class="contact-regions">
        <h2>Spirit Connect Power Labs</h2>
        <p class="lead" style="margin-bottom: 1.25rem;">
          We are building an intelligent design partner for power electronics — from semiconductor devices
          and converters to microgrids — so energy infrastructure and AI can evolve together.
        </p>
        <div class="contact-region-list">
          <div class="contact-region-card">
            <h3>United Kingdom</h3>
            <p><strong>Spirit Connect Power Labs</strong> · Cardiff, United Kingdom</p>
            <p>
              <strong>Email:</strong>
              <a href="mailto:{{ contact_email }}">{{ contact_email }}</a>
            </p>
            <p style="margin-top: 0.75rem;">
              <strong>LinkedIn:</strong>
              <a href="https://www.linkedin.com/in/fulong-li-6bb443127" target="_blank" rel="noopener noreferrer">Dr. Fulong Li</a>
            </p>
          </div>
        </div>
        <p class="small" style="margin-top: 1.25rem; color: var(--fg-dim); line-height: 1.6;">
          Typical enquiries: the AI Agent roadmap and capabilities, device testing and characterisation,
          modelling and design automation, academic or industry partnerships, and media.
        </p>
      </div>

      <div class="contact-window">
        <div class="contact-window-header">
          <p class="contact-window-title">Send us a message</p>
          <p class="contact-window-sub">
            Share a short summary of your organisation, timeline, and what you are trying to solve —
            we will route it to the right person and reply as soon as we can.
          </p>
        </div>

        <form
          class="contact-form"
          id="sc-contact-form"
          method="POST"
          {% if wf != '' %}
          action="https://api.web3forms.com/submit"
          {% else %}
          action="https://formsubmit.co/{{ contact_email }}"
          {% endif %}
        >
          {% if wf != '' %}
          <input type="hidden" name="access_key" value="{{ wf }}">
          <input type="hidden" name="subject" value="Website contact — Spirit Connect Power Labs">
          <input type="hidden" name="redirect" value="{{ site.url }}{{ site.baseurl }}/contact/?sent=1">
          <input type="text" name="botcheck" class="contact-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">
          {% else %}
          <input type="hidden" name="_subject" value="Website contact — Spirit Connect Power Labs">
          <input type="hidden" name="_next" value="{{ site.url }}{{ site.baseurl }}/contact/?sent=1">
          <input type="text" name="_gotcha" class="contact-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">
          {% endif %}

          <div class="contact-field">
            <label class="visually-hidden" for="cx-name">Name</label>
            <input id="cx-name" name="name" type="text" required placeholder="Name" autocomplete="name">
          </div>
          <div class="contact-field">
            <label class="visually-hidden" for="cx-company">Organisation</label>
            <input id="cx-company" name="company" type="text" placeholder="Organisation (optional)" autocomplete="organization">
          </div>
          <div class="contact-field">
            <label class="visually-hidden" for="cx-email">Email</label>
            <input id="cx-email" name="email" type="email" required placeholder="Email" autocomplete="email">
          </div>
          <div class="contact-field">
            <label class="visually-hidden" for="cx-phone">Phone number</label>
            <div class="phone-field-wrap">
              <select id="cx-phone-cc" name="phone_country" aria-label="Country calling code">
                <option value="+44" selected>GB +44</option>
                <option value="+86">CN +86</option>
                <option value="+1">US +1</option>
                <option value="+49">DE +49</option>
                <option value="+33">FR +33</option>
              </select>
              <input id="cx-phone" name="phone" type="tel" placeholder="Phone number (optional)" autocomplete="tel">
            </div>
          </div>
          <div class="contact-field">
            <label class="contact-label" for="cx-message">Message</label>
            <textarea id="cx-message" name="message" required placeholder="How can we help?"></textarea>
          </div>

          {% if wf != '' and tk != '' %}
          <div class="contact-turnstile">
            <div class="cf-turnstile" data-sitekey="{{ tk }}" data-theme="light"></div>
          </div>
          {% endif %}

          <button type="submit" class="contact-submit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
            Send message
          </button>
        </form>
      </div>
    </div>
  </div>
</section>

{% if wf != '' and tk != '' %}
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
{% endif %}

<script>
(function () {
  if (new URLSearchParams(window.location.search).get('sent') === '1') {
    var el = document.getElementById('contact-thanks');
    if (el) {
      el.hidden = false;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (e) {}
  }
})();
</script>
