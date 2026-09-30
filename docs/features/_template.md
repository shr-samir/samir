# <ID> — <Feature name>

| | |
|---|---|
| **PRD** | [§8 <ID>](../PRD.md#8-feature-list) |
| **Status** | planned · in progress · done |
| **Checklist frozen** | <date approved> |

Learnings from this feature go in [`docs/learnings.md`](../learnings.md), tagged `[<ID>]`.

## Understanding
Plain-language summary for the owner, updated every layer. Platform concepts
that apply beyond this feature go in [`fundamentals.md`](../fundamentals.md);
this section covers what *this* feature is doing and why.

### TL;DR
<What the feature delivers, in 2–3 sentences.>

| Layer | In one line | Status |
|---|---|---|
| L1 <name> | <one line> | planned |

### L1 — <name>

**Essence.** <What this layer does and the idea behind it, in a short paragraph.>

**What changed**
- `<file>`: <what it's for>

**Questions asked**
- *<Question, as asked>* <Short answer.> → <link to fundamentals or How it works, if deeper>

**Questions you might have**
- *<Likely question not yet asked>* <Short answer.>

## Problem statement
<What this feature solves and what "done" means, in 2–4 sentences.>

### Assumptions
- A1. <Assumption> [assumption]

## Business logic
<Rules that hold regardless of implementation. Reference PRD rules (R1…) where they apply.>
- B1. <Rule>

## Implementation plan

### Sub-problems
1. <Smaller problem this feature breaks into>

### Layers
Each layer is one PR, adds standalone value, and is approved before the next.
1. **L1 — <name>:** <what it delivers>

## Decision records

### <ID>-D1: <Decision>
- **Decision:** <what was chosen>
- **Why it fits:** <reason> [verified|memory|assumption]
- **Alternative:** <option> — <why it lost>
- **Would be wrong if:** <condition that would invalidate it>
- **Confidence:** high | low | low (accepted risk)
- **Spike:** <S-id, declined, or none>

## Edge cases
- <Case>: <expected behavior>

## Spikes

### S<n>: <short title> (<date>)
- **Question:** <what we need to know>
- **Pass if:** <criteria, written before running>
- **Fail if:** <criteria, written before running>
- **Result:** <what happened>
- **Verdict:** <decision stands / changes to …>

## Original checklist
Frozen at approval. Never edited afterwards; only ticked.
- [ ] O1. <Item>

## Discovered checklist
Anything unplanned. Never moved into the original checklist.
- [ ] X1. <Item> — **Trigger:** <what surfaced it> — **Blocking** | **Deferrable**

## Layer log

| Layer | PR | Verified by | Checklist items ticked |
|---|---|---|---|
| L1 | <link> | <test, manual check, screenshot> | O1, X1 |

## How it works
<Plain-language walkthrough for revision: what happens, in order, from input to
output. Name the files involved and explain why each piece exists. Written so
you can re-read it months later without the code open.>
