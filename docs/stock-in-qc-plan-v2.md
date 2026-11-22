# Stock In: QC, defects and consistency plan (v2)

Written for: the developers finishing the stock-in changes, and the owner who signs off the business rules.

This plan replaces `stock-in-qc-plan.md`. It records what has been changed so far, the rules agreed, and what is still needed for a consistent system. **No database migrations are part of this plan.** Everything here works with the tables that exist today.

Environments: UAT has its own database, separate from production. Changes go to UAT first.

## 1. What has been changed

| Area | Change | Where |
|---|---|---|
| Design search (Stock In) | Stays open for several picks; picking a colour again removes it; closes when a design is complete; Draft saves and returns to the dashboard | `components/DesignSearchInput.jsx`, `steps/stockIn/InwardDetailsStep.jsx`, `pages/StockIn.jsx` (committed in `d038960`) |
| QC rules | Breaking rules for sets, semi-sets and loose pieces, keep or return per piece, automatic semi-set creation | `utils/defectBreakdown.js`, `utils/qcGroups.js` |
| QC rules, server copy | Same rules on the server, with the same tests | `backend/src/modules/stock/utils/defectBreakdown.util.js`, `backend/tests/stock/defectBreakdown.test.js` |
| QC screen | Defect groups for full sets, semi-sets and loose pieces; count, sizes, category and keep-or-return per group; live result | `steps/stockIn/QcDefectStep.jsx` |
| Summary | Sets, semi-sets and loose pieces after QC; kept and returned counts; pieces in stock | `steps/stockIn/SummaryStep.jsx` |
| Payload | Final stock sent in the existing fields; `qc` block with groups and defect lines | `utils/buildStockInPayload.js` |
| Tag count | Removed the old pre-QC tag count from the page | `pages/StockIn.jsx` |

**Tests so far:** 26 rule tests, passing on the frontend and on the server copy. Lint and the frontend build pass.

**Not changed:** the database, the migrations, and the server save path (apart from its existing behaviour).

## 2. Rules (agreed)

**Breaking up**
- A full set with defective pieces breaks up. If exactly 3 pieces remain, they form a semi-set. Otherwise the remaining pieces become loose.
- A semi-set with defective pieces breaks up. Its remaining pieces become loose.
- A defective loose piece stays loose if kept, and leaves stock if returned.

**Keep or return, per defect group**
- Keep in stock (factory seconds): the piece stays in stock as a loose piece of its size. No discount tag.
- Return to jobber: the piece leaves stock.

**Semi-sets**
- A new semi-set is created automatically when a broken set leaves 3 pieces that don't match an existing one. It exists for this inward.
- Its default name is the sizes joined with dashes (for example "S-M-XL").

**Inward-level action**
- The challan's defect action is `return` only when every defect is returned. It is `mixed` when kept and returned defects are both present. Otherwise it is `seconds`.

**After save**
- Before the final save, everything can be edited.
- After save, only remarks and the challan number can change.
- Jobber name and inward date are locked, because they can appear on printed tags.
- To change anything locked, drop the challan and create a new one.
- A drop is refused if any piece has been sold, moved or written off. Corrections then go through Current Stock.

## 3. Worked example

Two sets (S, M, L, XL), one semi-set (S, M, L), two loose pieces (M, L). That's 13 pieces. One L is defective in a set and one M is defective in the semi-set.

| Choice | Full sets | Semi-sets | Loose | Pieces in stock |
|---|---|---|---|---|
| Both kept | 1 | S-M-XL (new) | S 1, M 2, L 3 | 13 of 13 |
| Both returned | 1 | S-M-XL (new) | S 1, M 1, L 2 | 11 of 13 |
| Mixed (L kept, M returned) | 1 | S-M-XL (new) | S 1, M 1, L 3 | 12 of 13 |

The mixed row is stored with action `mixed`.

## 4. What the database stores today

The save uses fields that already exist:

| Stored | Source |
|---|---|
| Full sets | `totalSetsReceived` = sets after QC |
| Semi-sets and new semi-sets | `bundles` = remaining semi-sets plus auto-created ones, with sizes |
| Loose pieces | `loosePieces` = loose after QC, including kept defects |
| Defective count | `defectivePieces` = all defective pieces (kept and returned) |
| Defect category | `defectCategory`, one per variant |
| Challan defect action | `defect_action` (free text, so `mixed` needs no schema change) |
| Remarks | `notes` and challan remarks |

**Stock is correct** with these fields, because the server builds stock items from them.

**Not stored today**
- Which piece was defective and where it came from (set, semi-set or loose), and its size.
- The keep-or-return choice for each piece.
- The defect category per piece, when a variant has more than one.
- The auto-created semi-set's name. It can be derived from the sizes.

**Consequence:** the stock and tags are right, but the record of which pieces were defective is incomplete. This is the main gap to decide on (section 6).

## 5. What must be done without migrations

### 5.1 Server checks (save path)

1. **Accept the `qc` block** in the validator. Today it is silently dropped.
2. **Recalculate the result on the server** from the groups and the set sizes in the database, using the same rules. Reject the save if the browser's totals differ.
3. **Bound the defective count** per variant (no more than pieces received) and per size.
4. **Check the stock is never negative**, including for returned pieces.
5. **Refuse an all-returned variant** that would leave nothing to store.
6. **Keep the existing checks**: duplicate challan (which also stops a double save), serial numbers, and the draft deletion in the same transaction.

### 5.2 Edit rules (server)

1. **Stop accepting jobber name and inward date changes** after save. The existing update allows them today.
2. **Keep remarks and challan number editable**, and keep the existing event log.
3. **Keep the drop rule**: refuse when any piece has left stock.

### 5.3 Tags

1. **Build tags only from the saved stock.** The tag studio must read the saved result, not the Set Matrix totals.
2. **Serial numbers are never reused.** Check that cancelled prints keep their numbers.
3. **Retired set tags** from a broken set are not reissued. New tags are issued for the semi-set and loose pieces.

### 5.4 Frontend

1. **Summary and screen** follow the rules above (done).
2. **Tag note** uses the per-variant kept and returned counts, not the inward-level action.
3. **Mixed categories** in one variant are refused until the defect detail is stored (section 6).
4. **Old drafts** saved before this structure lose their QC entries. The owner is told when they resume one.
5. **Stale groups**: if Set Matrix changes after QC, groups that no longer fit are flagged, not kept silently.
6. **Custom semi-set dialog** must accept only 3-piece semi-sets, to match the rule.

## 6. Decisions still needed

**A. Where the defect detail is stored (no migration).**

- **Option 1: store it in the existing notes field** as structured text on each stock-in transaction. No schema change, and the detail is kept. It is harder to query and report on, and it's a workaround.
- **Option 2: accept the gap for now.** Stock and tags are correct, and the defect detail is shown on the challan and summary only. Defect reports and mixed-category support wait for a later schema change.

My recommendation: Option 2 for this release, and a separate plan for defect storage once migrations are approved.

**B. Mixed categories in one variant.** Keep refusing them until option A is settled.

## 7. Work plan

**Phase 1: commit the work on a branch** (done in this step, once approved)
- Branch `stock-in-qc-branch`, committed without the owner's personal files.

**Phase 2: server checks and edit rules** (section 5.1 and 5.2)
- Validator, recalculation, bounds, edit rules.
- Tests for each rule.

**Phase 3: tags** (section 5.3)
- Tags built from the saved stock.

**Phase 4: frontend items** (section 5.4)
- Tag note, drafts, stale groups, the 3-piece rule.

**Phase 5: UAT**
- Deploy the backend, then the frontend, to UAT (separate database).
- Run the worked example and the checks in section 8.

**Phase 6: production**
- Only after UAT passes and the owner signs off.

## 8. Acceptance checks

Run these on UAT before any production release.

1. **Worked example:** the three rows in section 3 save with the expected totals, and the summary matches the saved stock.
2. **Pieces add up:** for every saved inward, received = in stock + returned.
3. **No negatives:** no saved count is below zero.
4. **Double confirm:** a second save of the same challan is refused.
5. **Edit rules:** jobber and date changes are refused after save; remarks change and are logged.
6. **Drop rule:** a drop is refused after a sale, and works before one, retiring the tags.
7. **Tags:** the tags printed match the saved stock, with no reused serials.
8. **Regression:** challan register, Current Stock, stock history, QR centre and transformations work with inwards that have defects.

## 9. Open risks

- Defect detail is not stored in the database until a later schema change (section 6A).
- The draft structure changed, so drafts from before this release lose their QC entries.
- Mixed inwards are stored as `mixed`, which older screens may not label correctly.
