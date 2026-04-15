# Pharmacy Management System - Module Hierarchy Tree

This document provides a comprehensive and accurate tree structure of all modules and sub-modules in the system, mapped directly from the codebase.

## 1. 🔒 Authentication & Identity
*   **Login Module:** System entry and user validation.
*   **Register Module:** New organizational account creation.
*   **Account Recovery:**
    *   Forgot Password: Link generation and email dispatch.
    *   Reset Password: Secure password update logic.

## 2. 📊 Information Hub (Dashboard)
*   **Universal Global Search:**
    *   Floating Command Palette (`Ctrl+K`) for rapid navigation.
    *   RBAC-protected cross-module data lookup (Medicines, Sales, Purchases, Parties).
    *   Advanced Collapsible Filtering & Magic Tags.
*   **Dashboard Overview:** Business at a glance (Sales, Stocks, Dues).
*   **Visual Analytics:** 
    *   Transactional Charts (Sales vs. Purchase trend).
    *   Stock Status Visualization.
*   **User Management:**
    *   User Records: Creation and profile management.
    *   Role Management: Permission-based access control (RBAC).

## 3. 💊 Inventory & Pharmacy Core
*   **Medicine Management:** 
    *   Inventory List: Complete medicine repository.
    *   Batch Management: Batch-wise stock tracking.
    *   Expiry Monitoring: Expiry date identification and alerts.
*   **Stock Adjustment:** Internal stock movements and balance tracking.

## 4. 🛒 Transactional Operations
*   **Sales Management (POS):**
    *   Direct Sales Form: Point of Sale interface.
    *   Sales Records: Transactional history and invoice viewing.
*   **Purchase Management:**
    *   Purchase Entry: Stock procurement records.
    *   Purchase History: Vendor transaction logging.
*   **Debt Recovery:**
    *   Due Collection: Tracking unpaid sales and processing collections.

## 5. 👥 Entities & Stakeholders
*   **Party Management:**
    *   Suppliers: Drug manufacturing companies and distributors.
    *   Customers: Registered clients and patient records.
*   **Ledger System:** Dedicated financial खতিয়ান (Ledger) for all parties.

## 6. 📑 Reports & Business Intelligence
*   **Transaction Reports:**
    *   Sales Summary (Daily/Monthly/Date-range).
    *   Purchase Summary.
    *   VAT/Tax Collection Report.
*   **Financial Reports:**
    *   Profit & Loss Statement.
    *   Party Ledger (Statement of Accounts).
*   **Inventory Reports:**
    *   Current Stock Status.
    *   Low Stock Alerts.
    *   Medicine Expiry Report.
*   **Performance Reports:**
    *   Top Selling Medicines (Analytics).
    *   User Wise Sales Performance.

## 7. ⚙️ Setup Masters (Configuration)
*   **Drug Metadata:**
    *   Generics: Active scientific ingredients.
    *   Manufacturers: Pharmaceutical companies.
    *   Categories: Drug classifications.
    *   Dosage Forms: Tablets, Capsules, Syrups, etc.
    *   Common Strengths: Power/Potency (mg, ml).
    *   Indications (Use For): Symptoms/Diseases mapping.
*   **Operational Setup:**
    *   Standard Units (UOM): Measuring units (Pcs, Box).
    *   Tax Management: Configuring tax/VAT rules.

---
**Note:** This tree is synchronized with `app.routes.ts` and the `components` directory structure as of 2026-04-14.
