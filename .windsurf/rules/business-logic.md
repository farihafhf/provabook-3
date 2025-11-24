---
trigger: always_on
---

A. The "Short Shipment" Rule
The system must automatically flag a shipment as "Short" if it falls below the tolerance threshold.
Formula: IF shipped_qty < (ordered_qty * 0.97) THEN Status = "Short Shipment".
Context: The standard tolerance is 3% (more or less).
Instruction: "When writing the ArbitrageService, strictly implement a check that flags any quantity deviation greater than 3% as a claimable shortage."

B. Unit Conversion Logic (Crucial Friction Point)
Problem: Your Packing List is in Kgs , but your Proforma Invoice (PI) is often in Yards (Yds).
Instruction: "The system requires a conversion factor field (e.g., gsm and width) to reconcile 'Invoice Weight (Kg)' against 'Order Quantity (Yds)'. Do not treat these as 1:1 comparisons."

C. The "Draft-to-Commit" Data Lifecycle
Phase 1 (Ingestion): Data enters as a "blob".
Model: PackingListDraft
Field: raw_data (JSONB)
Phase 2 (Commit): Data explodes into rows.
Trigger: User clicks "Commit" button.
Action: Asynchronous background task (Celery).
Result: Creation of thousands of FabricRoll records linked to a Shipment.

D. Financial Reconciliation (The Recap)
Logic: You must match the LC Open Price (from the PI) with the Invoice Value (from the Shipment).
Audit Requirement: Any manual override to these prices must be logged using django-simple-history to track who changed it and when.