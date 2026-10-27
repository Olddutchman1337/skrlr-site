---
title: "HunyuanVideo 1.5 Fast: 5 s clip"
date: 2026-10-27
hardware: "1× RTX 5090, power-capped 403 W"
model_class: "video-gen"
metric: "wall-clock per clip"
value: 41
unit: "s (median)"
method: "Median over logged production jobs; default fast workflow; single GPU."
caveats: "Fast variant only; 5 s output length; no batch; numbers from app logs, not a controlled harness."
tags: [video, local]
card_label: "HUNYUANVIDEO 1.5 FAST"
card_detail: "5 s clip"
---

## Setup

**HunyuanVideo 1.5 Fast** on one **RTX 5090** at **403 W** power cap. This is the workflow I use when I want a short clip without waiting for a full-quality pass.

## What I measured

Time from job start to playable 5 s clip, as recorded in production logs.

## Result

**41 s** median wall-clock for a **5 s** clip. That is the number I actually see when I am iterating, not a best-case single run.

## Caveats

Fast variant, fixed short duration, one GPU, no batching. Prefill and I/O are inside that wall clock — I am not splitting them out here.

## What's next

Pair this card with the draft-vs-final distilled video numbers so the speed tradeoffs are obvious side by side.
