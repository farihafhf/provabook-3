---
trigger: always_on
---

Contract/Order (PI): The parent entity (e.g., PI No PFA251020) containing the expected Styles and Prices.
Shipment: A child of the Contract (e.g., Invoice DWJ251019H).
Container: A child of the Shipment (e.g., TCKU7262512).
Fabric Roll: A child of the Container. Contains specific attributes:
Roll No
Color
Net Weight (Crucial for customs) 
Gross Weight (Crucial for logistics) 
Yardage
Shade/Lot