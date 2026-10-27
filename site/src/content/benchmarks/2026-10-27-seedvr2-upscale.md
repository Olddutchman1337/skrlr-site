---
title: "SeedVR2 upscale to 1080p"
date: 2026-10-27
hardware: "1× RTX 5090, power-capped 403 W"
model_class: "upscale"
metric: "wall-clock for run"
value: 146
unit: "s"
method: "Single logged production job; 121 input frames upscaled to 1080p; one GPU."
caveats: "One representative job from logs; frame count and output resolution fixed for this run."
tags: [video, upscale]
card_label: "SEEDVR2 UPSCALE"
card_detail: "121 frames → 1080p"
---

## Setup

**SeedVR2** upscale pass on the 5090 rig (**403 W** cap). Input was **121 frames**; target **1080p**.

## What I measured

End-to-end wall time for the upscale job as logged by the app.

## Result

**146 s** for that run. I am publishing the exact job I ran, not an average of mixed frame counts.

## What's next

Log a small matrix of frame counts so the card can show median instead of a single data point.
