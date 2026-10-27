---
title: "Overnight coding agent on Bonsai 27B"
date: 2026-10-27
hardware: "1× RTX 4070 SUPER (12 GB)"
model_class: "agent"
metric: "throughput & task outcome"
value: 52
unit: "tok/s (avg)"
method: "Overnight autonomous coding run: Bonsai 27B local agent with tool access; metrics from run logs."
caveats: "Different GPU class than video benchmarks; tests passed but product tasks did not."
outcome: "fail"
tags: [agent, games]
card_label: "OVERNIGHT AGENT · LESSON"
card_detail: "176/176 tests passed · game blank · 0/36 tasks"
---

## Setup

**Bonsai 27B** on a **12 GB RTX 4070 SUPER** — not the 5090 video rig. I let an overnight agent loop with tools to push on a game codebase.

## What I measured

- Average decode **52 tok/s**  
- **27** outer iterations  
- **1,146** tool calls  
- Test suite: **176/176** passed  
- Task board: **0/36** done  
- Deliverable: **the game came out blank**

## What went wrong

Passing tests masked the actual goal. The harness checked functions; nobody checked whether anything rendered on screen or whether tasks moved.

## Lesson

Tests green ≠ product done. Next run adds a **rendered screenshot gate** and a **task-completion gate** before we call it a win.

## What's next

Publish the gated run the same way — numbers and failure mode included.
