---
title: "Text-to-image latency"
date: 2026-10-27
hardware: "1× RTX 5090, power-capped 403 W"
model_class: "image-gen"
metric: "wall-clock per image"
value: "2-2.5"
unit: "s (median)"
method: "Median over logged production jobs in the shared image workflow; single GPU; no batching."
caveats: "Resolution and step count vary by workflow; range comes from app logs, not a fixed harness."
tags: [image, local]
card_label: "TEXT-TO-IMAGE"
card_detail: "per image · shared workflow"
---

## Setup

I run text-to-image on the same RTX 5090 rig that handles video work, with the GPU power cap locked at **403 W** so thermals stay predictable run to run.

## What I measured

Wall-clock time from job accept to finished image in the app logs — one image at a time, no batch queue tricks.

## Numbers

**2–2.5 s** median per image across recent jobs. The spread is real: different resolutions and step counts show up in production, and I am not flattening that into a single fake precision number.

## What's next

Tighter harness with fixed resolution and steps so the card and the write-up can be compared apples to apples.
