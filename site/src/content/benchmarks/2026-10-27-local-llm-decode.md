---
title: "Local LLM decode throughput"
date: 2026-10-27
hardware: "Local rig"
model_class: "llm"
metric: "decode throughput"
value: "~199"
unit: "tok/s"
method: "Measured decode phase with Qwen3.8-Flash-Next (IQ3_S quant) and speculative decoding enabled."
caveats: "Decode only; prefill rate not published here; speed depends on speculative decoding acceptance."
tags: [llm, local]
card_label: "LOCAL LLM DECODE"
card_detail: "Qwen3.8-Flash-Next · IQ3_S · speculative decoding"
---

## Setup

**Qwen3.8-Flash-Next** at **IQ3_S** quantization on a **local rig** (which GPU handled this run is not in the logs I am publishing), with **speculative decoding** turned on for the runs behind this card.

## What I measured

**Decode tokens per second** during generation — not prefill, not end-to-end chat latency.

## Result

Roughly **~199 tok/s** decode in the conditions above. The tilde matters: acceptance rate for the draft model moves this number.

## Caveats

If you need prefill or time-to-first-token, that is a different card. I have not published those here yet.

## What's next

Log prefill and acceptance rate alongside decode so the receipt is complete.
