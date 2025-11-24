---
trigger: always_on
---

1. Core Domain Vocabulary (The "Glossary")
Feed this list to Windsurf so it names variables and models correctly.

The Atom: "Roll" (Not "Product" or "SKU"). This is the fundamental unit of inventory.



The Container: The physical box (e.g., "TCKU7262512") holding the rolls.


The Shipment: A collection of containers moving from a Supplier (China) to the Buyer (Bangladesh) under a specific Invoice No.



Arbitrage: The financial logic where you profit from the difference between the Buying Price (what you pay the mill) and the Selling Price (what you invoice the final buyer), often involving a "Commission".


Shortage / Short Shipment: When the shipped_qty is less than the ordered_qty.


TNA (Time & Action): A production calendar tracking milestones like "Labdip," "Knitting," "Dyeing," and "Cutting".


Draft vs. Committed:

Draft: Raw data parsed from Excel/PDF into a JSONB field. It is mutable and may contain errors.

Committed: Validated data transformed into relational rows (Postgres tables). It is immutable/strict.