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

<section class="section section-alt contact-page">
  <div class="container">
    <p id="contact-thanks" class="contact-thanks" hidden role="status">
      Thank you — your message was sent. We will get back to you soon.
    </p>
    <div class="contact-layout">
      <div class="contact-regions">
        <h2>Contact US</h2>
        <p class="contact-regions-lead">Spirit Connect Power Labs</p>
        <div class="contact-region-list">
          <div class="card contact-region-card">
            <p><strong>Spirit Connect Power Labs</strong></p>
            <p>Cardiff, United Kingdom</p>
            <p><strong>Contact:</strong> Dr. Fulong Li</p>
            <p>
              <strong>Email:</strong>
              <a href="mailto:{{ contact_email }}">{{ contact_email }}</a>
            </p>
          </div>
        </div>
      </div>

      <div class="card contact-window">
        <div class="contact-window-header">
          <h2 class="contact-form-title">Do you have a question? Do you need support?</h2>
          <p class="contact-form-sub">
            Feel free to send a message for technical or commercial enquiries about the Power Electronics AI Agent,
            our services, or collaborations — we are here to help.
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
            <label class="visually-hidden" for="cx-company">Company</label>
            <input id="cx-company" name="company" type="text" placeholder="Company" autocomplete="organization">
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

          <button type="submit" class="btn btn-primary contact-submit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
            <span class="contact-submit-label">Send message</span>
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
