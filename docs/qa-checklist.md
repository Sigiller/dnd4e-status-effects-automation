# QA checklist — dnd4e-status-effects-automation

Environment: Foundry v14 (14.367), dnd4e 0.9.2, module enabled, logged in as a GM.
Use throwaway test actors/tokens (an NPC at level 1 and one at level 12) so ongoing damage and saves don't touch campaign actors. Delete them and any test combat afterwards.

Relevant dnd4e client settings: `autoDoTs` = "apply" (ongoing/regen applied automatically), `saveReminders` on.

## A. Load
- [x] A1. World loads with the module enabled; no console errors from `dnd4e-status-effects-automation`.
- [x] A2. `CONFIG.Token.hudClass.name === "StatusDurationTokenHUD"`.
- [x] A3. `attack_up`, `attack_down`, `defUp`, `defDown`, `ongoing_1..3`, `regen` exist in `CONFIG.statusEffects`, each exactly once (also when the GM had restored legacy statuses).
- [x] A4. Numeric statuses carry `system.changes` / `system.dots`; no status carries `system.durationType`.

## B. Token HUD palette UI
- [x] B1. Opening "Assign Status Effects" shows a duration row above the status icons (Default, No duration, Save Ends, End/Start of Target's Next Turn, End/Start of User's Turn, End of Current Turn, End of Encounter, End of Day). No "Custom".
- [x] B2. Each duration icon shows a tooltip with the dnd4e label.
- [x] B3. "Default" is selected on first open.
- [x] B4. Clicking a duration highlights only that one; the palette stays open.
- [x] B5. Selection survives the HUD re-render after toggling a status (same token).
- [x] B6. Selection resets to "Default" when the HUD is opened on another token.
- [x] B7. Duration row stays visible (sticky) when the status list scrolls.

## C. Default durations
- [x] C1. Default + condition (dazed): effect `system.durationType === "saveEnd"`, `duration.expiry === "save"`.
- [x] C2. Default + state status (mark, cover, invisible, unconscious): `system.durationType === ""`, no expiry.
- [x] C3. Default + numeric status (attack_down): save ends.

## D. Explicit durations
- [ ] D1. No duration + dazed: no durationType.
- [x] D2. Save Ends + mark (overridable state status): save ends.
- [x] D2b. Any duration + no-duration status (prone, dead, dying, bloodied, regen, running, charging, squeezing, flying, burrowing, mounted): always no duration.
- [x] D3. End of Target's Next Turn in combat: `start.combatant` = target's combatant, expiry `turnEnd`; effect removed at end of target's next turn.
- [x] D4. Start of Target's Next Turn: expiry `turnStart`; removed at start of target's next turn.
- [x] D5. End of User's Turn with creature A as current combatant, applied to B: `origin` = A's actor uuid, `start.combatant` = A's combatant.
- [x] D6. User-turn duration outside combat: `origin` = target actor, no error.
- [x] D7. End of Encounter: removed when the combat is ended.
- [x] D8. End of Day: expiry `dayEnd`.

## E. Numeric automation
- [x] E1. attack_down → `system.modifiers.attack.value` drops by 2; attack_up raises it by 2.
- [x] E2. defDown → AC/Fort/Ref/Will drop by 2; defUp raises them by 2.
- [x] E3. ongoing_1 on a level 1 creature → 5 damage at start of its turn; level 12 → 10.
- [x] E4. regen → heals 5 at start of its turn (when damaged).
- [x] E5. Removing the status removes the modifier.

## F. Saves
- [x] F1. Ending the turn of a creature with a save-ends status prompts a saving throw.
- [x] F2. Successful save removes the effect; failed save keeps it.

## G. Toggle semantics / regressions
- [x] G1. Clicking an active status removes it (whatever duration is selected).
- [x] G2. Right-click applies the status as an overlay (`flags.core.overlay`), with the selected duration.
- [ ] G3. HUD toggle on a token with no actor shows the core warning.
- [x] G4. `actor.toggleStatusEffect("attack_down")` from a macro applies the -2 change, no duration.
- [ ] G5. Core HUD controls (elevation, bars, target, combat, movement) still work.
- [x] G6. Unlinked (synthetic) token actors work the same as linked ones.

## H. Palette resize
- [x] H1. A resize grip sits in the palette's bottom-right corner, with tooltip "Drag to resize (4–10 per row)".
- [x] H2. Dragging the grip horizontally changes icons per row, snapped to whole columns; the duration row reflows.
- [x] H3. Dragging far left stops at 4 per row; far right stops at 10.
- [x] H4. Left/Right arrow keys on the focused grip change the width by one column within the limits.
- [x] H5. Width persists across HUD re-render and page reload (client setting `paletteColumns`, per user/browser).
- [x] H6. Grip stays pinned to the bottom-right corner while the status list scrolls.
- [x] H7. Grip tooltip is dismissed when a drag starts.

## I. Save-ends expiry and NPC auto-saves
- [x] I1. After a page reload, save-ends effects on unlinked tokens in an existing combat are tracked by the effect registry (Remorseful Beholder: 0/25 tracked before the fix, 25/25 after).
- [x] I2. With another GM as the active GM, a successful save rolled on this GM's client removes the effect. This was the reported bug: core only deletes on the active GM's client.
- [x] I3. NPC end of turn: saves are rolled automatically, with no dialog, one per save-ends effect, using the effect's save DC (default 10).
- [x] I4. NPC auto-saves include the actor's own save bonus (`(1d20) + (2)` with a +2 untyped save bonus).
- [x] I5. A failed NPC auto-save keeps the effect; a successful one removes it.
- [x] I6. Player character end of turn: the save dialog still opens; a successful save removes the effect.
- [ ] I7. A player rolls their own PC's save: the success is relayed to the GMs and only the active GM deletes. Covered by unit tests only; needs a player client.

## J. Module settings: status visibility and default durations
- [x] J1. Game Settings → "D&D 4e Status Effects Automation" shows "Configure Statuses" (GM only: `restricted: true`).
- [x] J2. The window lists every HUD status (58), with icon, name, a "Show in HUD" checkbox and a "Default duration" select showing the effective default.
- [x] J3. Locked statuses (prone, regen, dead, …) have a dimmed, disabled select with the tooltip "This status never has a duration".
- [x] J4. Save stores only the differences from the built-in defaults (`{hidden: ["ammo_count"], durations: {dazed: "endOfTargetTurn"}}`).
- [x] J5. A hidden status is left out of the HUD palette (57 of 58 shown).
- [x] J6. The HUD "Default" choice uses the configured per-status default (Dazed → End of Target's Next Turn).
- [x] J7. A hidden status that is already on the token still shows (as active) and can be removed; afterwards it is hidden again.
- [x] J8. "Reset to Defaults" restores the built-in defaults in the form without saving; Save then stores empty options.
- [ ] J9. A player client does not see the menu and gets the GM's hidden statuses and defaults. Not run in a browser; needs a player login.

## K. Durations in combat (one run per duration, applied through the Token HUD)

Setup: three unlinked NPC tokens A (initiative 30), B (20), C (10) in one combat, viewed in the tracker. Each duration is applied by selecting it in the palette and clicking a status. NPC saves roll automatically; the save DC is set on the effect (1 = success, 30 = failure). "User" is the combatant whose turn it is when the effect is applied.

### K-a. Applied during A's turn (round 1) to B (B hasn't acted yet)
| # | Duration | Status | Expected end |
|---|---|---|---|
| K1 | No duration | Deafened | Never by turns, combat end or rests; only manual removal |
| K2 | Save Ends (DC 30) | Dazed | Save prompt at the end of each of B's turns; failure keeps it |
| K3 | Save Ends (DC 1) | Weakened | Removed by the successful save at the end of B's turn R1 |
| K4 | End of Target's Next Turn | Blinded | End of B's turn R1 |
| K5 | Start of Target's Next Turn | Slowed | Start of B's turn R1 |
| K6 | End of User's Next Turn | Immobilized | End of A's turn R2 |
| K7 | Start of User's Next Turn | Restrained | Start of A's turn R2 |
| K8 | End of Current Turn | Grabbed | End of A's turn R1 |
| K9 | End of Encounter | Granting Adv. | When the combat ends |
| K10 | End of Day | Curse | Extended rest (survives combat end and short rest) |

### K-b. Applied during C's turn (round 1) to C itself
| # | Duration | Status | Expected end |
|---|---|---|---|
| K11 | End of Target's Next Turn | Blinded | End of C's turn R2 (not the current turn) |
| K12 | Start of Target's Next Turn | Slowed | Start of C's turn R2 |
| K13 | End of User's Next Turn | Immobilized | End of C's turn R2 |
| K14 | Start of User's Next Turn | Restrained | Start of C's turn R2 |
| K15 | End of Current Turn | Grabbed | End of C's turn R1 |

### K-c. Applied during C's turn (round 1) to A (A already acted this round)
| # | Duration | Status | Expected end |
|---|---|---|---|
| K16 | End of Target's Next Turn | Blinded | End of A's turn R2 |
| K17 | Start of Target's Next Turn | Slowed | Start of A's turn R2 |
| K18 | End of User's Next Turn (user C) | Immobilized | End of C's turn R2 |
| K19 | Start of User's Next Turn (user C) | Restrained | Start of C's turn R2 |

### K-d. Rests (on B, after the combat ends)
| # | Check | Expected (dnd4e 0.9.2 code) |
|---|---|---|
| K20 | Short rest | Deafened (none), Dazed (save ends), Curse (end of day) all remain: the short rest ends turn/encounter durations only |
| K21 | Extended rest | Curse removed; Deafened and Dazed (save ends) remain: the extended rest doesn't end save-ends effects |

### K-e. Edge cases
| # | Check | Expected |
|---|---|---|
| K22 | End of Target's Next Turn on a token that is not in the combat (D), applied during A's turn | Record actual behaviour |
| K23 | End of Target's Next Turn applied to B before the combat starts | Record actual behaviour |

### K results — 2026-10-10 (TypeScript build, combat run on Testing Ground, throwaway unlinked NPCs)
Observed removals per turn change (all auto-saves rolled with no dialog):

| Turn change | Removed | Saves |
|---|---|---|
| End A R1 → start B R1 | B: Grabbed (K8), Slowed (K5) | – |
| End B R1 → start C R1 | B: Blinded (K4), Weakened (K3) | B: Dazed DC 30 → 5 (kept), Weakened DC 1 → 19 (removed) |
| End C R1 → start A R2 | C: Grabbed (K15); A: Slowed (K17); B: Restrained (K7) | – |
| End A R2 → start B R2 | A: Blinded (K16); B: Immobilized (K6); D: Blinded (K22) | – |
| End B R2 → start C R2 | C: Slowed (K12), Restrained (K14); A: Restrained (K19); B: Insubstantial (K23) | B: Dazed DC 30 → 20 (kept) |
| End C R2 → start A R3 | C: Blinded (K11), Immobilized (K13); A: Immobilized (K18) | – |
| Combat ended | B: Granting Adv. (K9) | – |
| Short rest (B) | nothing (K20) | – |
| Extended rest (B) | B: Curse (K10, K21) | – |

- [x] K1–K21: all ended exactly at the expected point. Deafened (no duration) survived everything; Dazed (save ends) survived combat end, short rest and extended rest.
- [x] K22: a target not in the combat anchors to the creature whose turn it was (A). "End of Target's Next Turn" then behaves like "end of A's next turn" (removed at the end of A's turn R2).
- [x] K23 (fixed, see K-f): originally FAILED: "End of Target's Next Turn" applied before the combat started ended at the end of B's turn **R2**, one round late (expected R1). Cause: an effect created before combat starts has no start round or combatant, so core counts the round from when the creature joined (round 1). dnd4e's `_preCreate` only anchors effects when the combat has started. This affects power-applied effects too, not only the HUD.
- Note: dnd4e's extended rest does not end save-ends effects (its `endEffects` list has no `saveEnd`); neither does the short rest (`"save"` there means "until the next saving throw").

### K-f. Anchoring effects that predate the turn order (`src/combat-anchoring.ts`)
When a combat starts, the module anchors each combatant's turn-based effects that aren't anchored to the right combatant of that combat. Target-turn durations anchor to the target; user-turn durations anchor to the origin creature, or to the target if the origin isn't in the combat. They end at that creature's first turn. A creature joining a running combat gets the same treatment: the effect ends this round if its turn is still ahead, next round if its turn has passed.

| # | Setup | Expected | Result 2026-10-10 |
|---|---|---|---|
| K23 | End of Target's Next Turn on B, before the combat starts | End of B's turn R1 | [x] removed at end of B's turn R1 |
| K24 | Start of Target's Next Turn on A (acts first), before start | Ends as A's first turn starts | [x] removed at combat start |
| K25 | Start of Target's Next Turn on B, before start | Start of B's turn R1 | [x] removed at start of B's turn R1 |
| K26 | End of User's Next Turn on C, before start (user falls back to C) | End of C's turn R1 | [x] removed at end of C's turn R1 |
| K27 | End of Target's Next Turn on C, applied while another running combat is viewed (anchored to that combat) | Re-anchored to C; end of C's turn R1 | [x] removed at end of C's turn R1 |
| K28 | D (outside the combat) gets End of Target's Next Turn during A's turn, then joins during B's turn with initiative 25 (its turn already passed) | End of D's turn R2 | [x] removed at end of D's turn R2 |
| K29 | Same for E, joining with initiative 5 (its turn still ahead) | End of E's turn R1 | [x] removed at end of E's turn R1 |
| K30 | Control: End of Target's Next Turn on C applied during A's turn (anchored by the system) | Unchanged, end of C's turn R1 | [x] removed at end of C's turn R1 |
| K31 | User-turn durations applied from the HUD while the viewed combat hasn't started | Origin = target, not the unstarted combat's first combatant | [x] origin = C (unit test too) |

### K-g. Power-applied user-turn durations (real powers, `dnd4e.utils.applyEffectsToTokens`, the chat card's apply-effect path)
Powers copied from campaign actors onto throwaway NPC A (unlinked token): Eldritch Strike (mark, End of User's Next Turn), Intellect Snap (Start of User's Next Turn), Swordmage 01-Sword of Sigils (End of User's Next Turn), Intellect Snap (Augmented) (Start of User's Next Turn). Combat order: A, B, C.

| # | Setup | Expected | Result 2026-10-10 |
|---|---|---|---|
| K32 | During A's turn R1, A hits B with Eldritch Strike and Intellect Snap | Origin = A, anchored to A; Snap ends at start of A R2, mark at end of A R2 | [x] both as expected |
| K33 | During B's turn R1 (off-turn use), A hits C with Sword of Sigils and Intellect Snap (Augmented) | Anchored to A (not B); end/start of A R2 | [x] both as expected |

- The suspected bug (power effects not anchored because the origin is the power item) does not exist: `applyEffectsToTokens` sets `origin` to the using actor, and dnd4e anchors to that actor's combatant.
- The Compendium "Grab" powers (`dnd-4e-compendium.module-core-powers` and the copies on the PCs) have no effects, so Grabbed is never applied automatically from them. The system's own `dnd4e.example_powers` Grab has one, but that pack is empty in this world.
- Test-environment caveat: core stamps new effects with `game.combat` (the viewed combat). While a non-active test combat is viewed, creating an effect briefly switches the view back to the active combat, so a second effect created right after can be anchored to the active combat. Real play (running combat = active combat) isn't affected. Tests must re-view the test combat before each application.

### K-h. Re-run after the code-review fixes — 2026-10-10 (14/14 passed)
A single combat with A (30), B (20), C (10), plus F (15) joining during A's turn and D (25) and E (5) joining during B's turn. Effects were applied through the HUD palette, with the inactive test combat re-viewed before each application.

| Step | Removed (all as expected) | Checks |
|---|---|---|
| Combat start | A: Cover | K24 |
| End A R1 → start B R1 | B: Grabbed, Slowed, Partial Concealment; F: Surprised | K8, K5, K25, K34 (new: End of Current Turn on a creature that joined during the user's turn) |
| End B R1 → start F R1 | B: Blinded, Weakened (save 8 vs DC 1), Insubstantial; Dazed kept (19 vs DC 30) | K4, K3, K2, K23 |
| End F R1 → start C R1 | – | – |
| End C R1 → start E R1 | C: Grabbed, Hidden, Superior Cover | K15, K26, K27 |
| End E R1 → start A R2 | E: Blinded; A: Slowed; B: Restrained | K29, K17, K7 |
| End A R2 → start D R2 | A: Blinded; B: Immobilized | K16, K6 |
| End D R2 → start B R2 | D: Blinded | K28 |
| End B R2 → start F R2 | – (Dazed save failed again) | K2 |
| End F R2 → start C R2 | C: Slowed, Restrained; A: Restrained | K12, K14, K19 |
| End C R2 → start E R2 | C: Blinded, Immobilized; A: Immobilized | K11, K13, K18 |
| Combat end | B: Granting Adv. | K9 |
| Short rest (B) | – | K20 |
| Extended rest (B) | B: Curse; Dazed and Deafened remain | K10, K21, K1 |

All saves rolled automatically (NPC), with no dialog.

## L. Status values and the click model (2026-10-10)
Valued statuses: Attack Up/Down, Defense Up/Down (built-in start 1, step 1), Ongoing Effect 1–3 (start 5, step 5), Regeneration (start 5, step 1). Tested with real mouse clicks on a throwaway unlinked NPC.

| # | Check | Result |
|---|---|---|
| L1 | Left-click Attack Down adds it at −1: badge "−1", name/tooltip "Attack Down −1", attack modifier −1 | [x] |
| L2 | Left-click again → −2 (attack −2); right-click → −1 | [x] |
| L3 | Right-click at −1 removes the status (attack back to 0) | [x] |
| L4 | Ongoing Effect (1): 5 → 10 → 5 (badge, name and dot amount follow); in combat, 10 ongoing damage at the start of the creature's turn | [x] |
| L5 | Regeneration: 5 → 6 (+1 step); heals 6 at the start of the creature's turn | [x] |
| L6 | Non-valued status (Dazed): left adds it, a second left does nothing, right removes it | [x] |
| L7 | Shift+left adds Stunned as an overlay; Shift+left again turns the overlay off and keeps the status | [x] |
| L8 | Settings: Attack Down start 2 / step 2 is stored as `{values: {attack_down: {start: 2, step: 2}}}`; a macro toggle gives −2; the HUD starts at −2 and steps to −4; Reset to Defaults shows 1/1; the world setting was restored afterwards (CONFIG re-hydrated back to −1) | [x] |
| L9 | Raising a value keeps the duration and anchor: Attack Down −4 (End of Target's Next Turn, set before combat, raised twice) ended at the end of the target's first turn | [x] |
| L10 | Badges don't block clicks; the badge and tooltip update after each value change | [x] |
| L11 | Regression: K-h duration suite re-run with the new click handler: 14/14 | [x] |

Notes:
- Foundry's tooltip keeps the text it had when it opened; hover off and on to see an updated value.
- Test-helper pitfall: icons scrolled to the top of the palette sit under the pinned duration row; clicks there hit duration buttons. Centre the icon before clicking.

## Results — 2026-10-10 (Foundry 14.367, dnd4e 0.9.2, browser run as GM "Assistant")

Run on the "Testing Ground" scene with throwaway NPCs (L1 tier 1, L12 tier 2) in a separate combat. All test actors, tokens, combat and chat messages were deleted afterwards. The original combat was left as found.

Passed: everything checked above. Evidence highlights:
- D3/D4: Blinded (end of target's next turn) and Stunned (start of target's next turn) were applied on A's turn to B. They were anchored to B's combatant with the off-by-one decrement, and expired at B's turn end and turn start respectively.
- D5: Slowed (end of user's turn), applied during A's turn: origin = A, removed at the end of A's next turn (round 2).
- `endOfUserCurrent` (Immobilized) was removed at the end of A's current turn.
- E3: ongoing `5*@tier` dealt 5 to L1 and 10 to L12. E4: regen healed 5. E2/E5: defDown AC 10 → 8, back to 10 after a successful save.
- F: save dialogs listed every save-ends effect. DC 30 failures kept the effect; DC 1 successes removed it.

Not tested in the browser: D1 (covered only by the `resolveDurationType` unit tests), attack_up in E1 (only attack_down was run), and G3 (token without actor). G5 was only partly covered (the palette and the movement button were unaffected).

Notes / findings:
1. Durations anchor to `game.combat`, the combat shown in the combat tracker, the same as core's `start.combatant`. Accepted: GMs always view the combat they are running.
2. Resolved: `regen` never takes a duration (moved to `NO_DURATION_STATUSES`).
3. Save-ends effects are not removed when combat ends (system behaviour; a short rest ends them). Confirmed as intended.
4. After a toggle, the palette re-renders and scrolls back to the top. This is core behaviour, not caused by the module.
5. Unrelated console errors from world content: fxmaster region behaviours, the "Engulf" power label, and the formula "10 (hover)".

6. Follow-up (same day): prone and other action/game-state statuses now ignore the selected duration (`NO_DURATION_STATUSES`). Verified in the browser: with Save Ends selected, Prone got no duration and Marked got save ends.
7. Save-ends fix (same day). Causes: (a) core deletes expired effects only on the active GM's client, while dnd4e refreshes "save" expiry only on the rolling client; (b) `Combatant#actor` builds unlinked token actors before the effect registry initializes, so their effects aren't registered after a reload. Both are worked around in `scripts/saves.mjs`.
8. dnd4e system bug, not fixed: its fast-forward save path calls `rollSave(event, {...})` with the options in the `form` slot, so it throws. PCs only hit it when dnd4e's fast-forward setting is on. NPCs now use the module's auto-roll.
