# Stock In: QC, defects and consistency plan

Written for: the developers building the stock-in backend, and the owner who signs off the business rules.

Status: rules agreed in discussion. Items marked **pending** still need the owner's confirmation. The code on branch `defect-attribution` is work in progress and is not committed.

## 1. What a stock-in inward is

A jobber delivers goods for one challan. For each colour variant, the goods arrive as:

- **Full sets:** one piece per size in the set (for example S, M, L, XL).
- **Semi sets:** a fixed group of sizes, with one piece each (for example S, M, L).
- **Loose pieces:** single pieces, counted per size.

Set Matrix records these counts. QC then records which pieces are defective and what to do with them. The result is what gets stored as stock and what the QR tags are printed from.

## 2. Business rules

### 2.1 Breaking up sets and semi sets

A defective piece changes how the rest of its group is grouped. The re-sorting is the same whatever the outcome.

- **A full set with defective pieces breaks up.**
  - If exactly 3 pieces remain, they form a semi-set with those sizes.
  - Otherwise, the remaining pieces become loose pieces, one per size.
- **A semi-set with defective pieces breaks up.** Its remaining pieces become loose pieces.
- **A loose piece that is defective** stays loose if kept, or leaves stock if returned.

### 2.2 Keep or return, decided per defect group

Each defect group (a set group, a semi-set group, or a loose size) has its own choice:

- **Keep in stock (factory seconds):** the defective piece is stock, as a loose piece of its size. It is treated like fresh stock, with no discount tag.
- **Return to jobber:** the defective piece leaves stock.

Example: 2 sets (S, M, L, XL), 1 semi-set (S, M, L), 2 loose (M, L). One L is defective in a set and one M is defective in the semi-set.

| Choice | Sets | Semi-sets | Loose | Pieces in stock |
|---|---|---|---|---|
| Both kept | 1 | S-M-XL (new) | S 1, M 2, L 3 | 13 of 13 |
| Both returned | 1 | S-M-XL (new) | S 1, M 1, L 2 | 11 of 13 |

### 2.3 New semi-sets

When a set breaks into a semi-set whose sizes don't already exist, the semi-set is created automatically. It is not a Design Master record. It exists for this inward and is stored with its sizes.

**Agreed:** the default name is the sizes joined with dashes (for example "S-M-XL"). This is the same convention the custom semi-set dialog already uses. The name is stored separately from the sizes, and can be changed later. Renaming changes future prints only, and printed tags keep their old name. Stock is always counted from the sizes, never from the name.

### 2.4 Inward-level defect action

The challan has one defect-action field. Each defect's keep-or-return choice is the real record.

**Agreed:** when an inward mixes kept and returned defects, store the field as `mixed`. Today it would store `seconds`, which is wrong for returned pieces. The server's allowed values need `mixed` added, and the labels need updating. The per-defect flags remain the source of truth.

### 2.5 Editing after save (adopted)

- **Before the final save:** everything can be edited. Nothing is in stock yet.
- **After the final save, these can change:** remarks, challan number, issued challan number. Each change is logged as an event.
- **After the final save, these are locked:** jobber name and inward date (they can appear on printed tags), all stock counts, groupings, defects, keep-or-return choices and tags.
- **To change a locked value:** drop the challan and create a new one.
- **Drop is refused** if any piece has been sold, moved or written off. The correction then goes through Current Stock, and the challan shows it.

The current code allows changing the jobber name and the date after save. That must be removed.

## 3. What the database stores

Only the final result of the inward. Everything else is derived.

- **Challan:** existing fields, plus the defect action (2.4).
- **Stock composition:** full sets count, semi-set definitions (sizes, name, count), loose pieces by size. This is what stock and tags are built from.
- **Defect lines:** one row per defective piece: source (set, semi-set or loose), size, category, keep flag, and the semi-set it came from if any.
- **Auto-created semi-set definitions:** sizes and name, scoped to the inward.
- **Events:** remarks and header changes (2.5).

The stored stock must always satisfy: pieces in stock = pieces received minus pieces returned.

## 4. Current state

| Area | State |
|---|---|
| QC screen | Built: groups, keep-or-return per group, live result, auto-created semi-sets |
| Rules | Built, with tests on the frontend and a server copy with the same tests |
| Summary | Built: kept, returned and pieces in stock per variant |
| Payload | Built: final stock in the existing fields, plus a `qc` block with groups and defect lines |
| Server | Ignores the `qc` block. Stores the final stock from the existing fields |
| Database | Not changed. Defect lines and semi-set definitions are not yet stored |
| Tags | Still counted in the browser from pre-QC totals |
| Migrations | Journal lists 9 of 19 migration files. Must be fixed first |

## 5. Edge cases

**Inward-level**
- Every piece returned: refuse the save for that variant (already in the screen).
- Defective count above pieces received, per variant or per size: refuse on the server.
- A defect for a size not in the set, or a semi-set type that no longer exists: refuse.
- Set Matrix changed after QC: recalculate, and flag any group that no longer fits.
- Draft saved before this structure existed: its QC entries are not restored, and the owner is told.

**Saving**
- Double click or retry: one inward only. Use a client key or the draft id.
- Confirm must recalculate the result on the server from the groups, and reject a mismatch.
- The whole inward (challan, stock, defect lines, semi-set definitions, tags) is saved in one transaction.

**Tags**
- Tags are created only from the saved stock.
- Serial numbers are never reused, including cancelled prints.
- Set tags printed for a set that later breaks are retired. New tags are issued for the new semi-set and loose pieces.
- Dropping a challan retires its tags.

**Sold or moved stock**
- Drop refused when any piece has left stock.
- Corrections go through Current Stock. The challan shows the correction.

**Mixed categories**
- A variant with more than one defect category is refused until the server stores one category per defect line.

## 6. Work breakdown

**Step 0: prerequisites**
1. Fix the migration journal so it lists every migration file in order.
2. Agree who writes the next migration with the colleague who has the pending migration work.
3. Create a staging copy of the production database.

**Step 1: database**
4. Add tables for defect lines and semi-set definitions, and a `mixed` option for the defect action.
5. Test the migration on a fresh database and on the staging copy.

**Step 2: server save path**
6. Accept the `qc` block in the validator.
7. Recalculate the result from the groups and the set sizes in the database. Refuse a mismatch.
8. Add the defect-count checks.
9. Save everything in one transaction, with idempotent confirm.
10. Enforce the edit rules in 2.5.

**Step 3: tags**
11. Build tags from the saved stock only.
12. Replace the browser's pre-QC counts with the saved stock.

**Step 4: regression**
13. Check the challan register, Current Stock, stock history, the QR centre and transformations against inwards with defects.

**Step 5: release**
14. Commit the work in progress on `defect-attribution`.
15. Open a pull request and review it.
16. Deploy the backend before the frontend, with a rollback plan.

## 7. Tests

- **Rules:** done (26 tests, frontend and server copy).
- **Database:** confirm an inward with defects. Check stock, defect lines and tags match the saved result.
- **Worked example on staging:** 13 pieces kept, 11 returned, as in section 2.2.
- **Concurrency:** two confirms at once create one inward.
- **Edit rules:** locked fields refuse changes, and the allowed fields log the change.
- **Drop:** refused after a sale, and allowed before one, retiring the tags.
- **Fresh migration:** the database builds from the migration files alone.
- **Regression:** the screens listed in step 13.

## 8. Decisions

| Decision | Status |
|---|---|
| Keep or return decided per defect group | Agreed |
| Keep stock as loose, no discount tag | Agreed |
| Auto-create new semi-sets for this inward | Agreed |
| Default semi-set name is the sizes (for example "S-M-XL"), renaming later | Agreed |
| Mixed inward stored as `mixed` | Agreed |
| Editing after save: remarks and challan number only, drop to change anything else | Agreed |
| Drop refused after a sale, correction via Current Stock | Agreed |
