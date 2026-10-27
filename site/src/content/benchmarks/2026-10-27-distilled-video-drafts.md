---
title: "Distilled video model: drafts vs finals"
date: 2026-10-27
hardware: "1× RTX 5090, power-capped 403 W"
model_class: "video-gen"
metric: "wall-clock (draft pass)"
value: 38
unit: "s (median)"
method: "Median over logged draft jobs (8-step) vs separate final renders (20-step); single GPU."
caveats: "Draft and final differ in steps, resolution, and frame count — not an apples-to-apples speedup multiplier."
compare:
  value: 320
  unit: "s (median)"
  label: "full 20-step final"
tags: [video, local]
card_label: "DRAFTS"
card_detail: "8-step distilled · 107 frames @ 768×448"
---

## Setup

I use a **distilled video model** (internal name stays private) in two modes on the same **RTX 5090** at **403 W**:

- **Draft:** 8-step, **107 frames** at **768×448**
- **Final:** full 20-step, **124 frames** at **1344×768**

## What I measured

Median wall-clock from production logs for each mode separately.

## Numbers

| Mode | Median wall-clock | Conditions |
|------|-------------------|------------|
| Draft | **38 s** | 8-step · 107 frames · 768×448 |
| Final | **320 s** | 20-step · 124 frames · 1344×768 |

Draft is how I iterate; final is what I ship when the motion looks right. The ~8× gap is **not** a clean speedup number — resolution, steps, and frame count all move at once.

## What's next

Hold frame count fixed for one A/B so the draft savings are honest to compare.
