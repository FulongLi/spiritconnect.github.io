---
layout: default
title: News
---

<header class="hero"><div class="bg"></div><div class="container">
  <h1>News</h1>
  <p class="lead">Updates, publications, and milestones.</p>
</div></header>

<section class="section"><div class="container">
  {% for post in site.posts %}
    <div class="card">
      <h3>{{ post.date | date: "%Y-%m-%d" }} · {{ post.title }}</h3>
      <p class="small">{{ post.excerpt | strip_html }}</p>
      <p class="small"><a href="{{ post.url | relative_url }}">Read more</a></p>
    </div>
  {% endfor %}
</div></section>
