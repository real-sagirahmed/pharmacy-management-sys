# 🏥 Pharmacy Management System — UX Audit Report

> **Site:** https://pharmacymsys.runasp.net  
> **Login:** `liveDemo` / `liveDemo@123`  
> **Audit Date:** 2026-04-14  
> **Audited By:** Antigravity AI Assistant (Code Analysis + Live URL Inspection)  
> **Stack:** Angular 18 (Standalone), PrimeNG, Tailwind CSS, ASP.NET Core API

---

## 📋 সারসংক্ষেপ (Executive Summary)

সিস্টেমটি একটি পূর্ণাঙ্গ ফার্মেসি ম্যানেজমেন্ট সিস্টেম যেখানে ইনভেন্টরি, বিক্রয়, ক্রয়, রিপোর্ট ও ব্যবহারকারী ব্যবস্থাপনা রয়েছে। ডিজাইন আধুনিক এবং Inter ফন্ট, Teal color palette ব্যবহার করা হয়েছে। তবে **মোবাইল রেসপন্সিভনেস** সবচেয়ে বড় দুর্বলতা।

---

## 🖥️ ডেস্কটপ অভিজ্ঞতা (Desktop — 1280px+)

### 🔐 লগিন পেজ

**ভালো দিক:**
- ✅ দুই-কলামের বিভক্ত লেআউট (বাম: ব্র্যান্ড ভিজ্যুয়াল, ডানে: ফর্ম) — পেশাদার দেখতে।
- ✅ বাম পাশে teal-to-dark gradient background ও glassmorphism ব্র্যান্ড আইকন।
- ✅ "100% Secure" ও "Real-time Sync" stat badges যা আস্থা তৈরি করে।
- ✅ লোডিং স্পিনার সহ disabled বাটন — ভালো UX।
- ✅ "Forgot?" লিঙ্ক পাসওয়ার্ড লেবেল পাশে রয়েছে।
- ✅ "Create Account" লিঙ্ক ফুটারে রয়েছে।
- ✅ `fadeIn` animation ভদ্র এবং smooth।

**সমস্যা / অসংগতি:**
- ⚠️ **[Minor]** পাসওয়ার্ড ফিল্ডে কোনো "show/hide password" আইকন নেই। ব্যবহারকারী টাইপ করা পাসওয়ার্ড দেখতে পারবেন না।
- ⚠️ **[Minor]** বাম পাশের visual section-এ শুধু "Pharmacy System" লেখা — কিন্তু হেডারে "s7 Drug House" ব্র্যান্ড নাম আলাদা। **ব্র্যান্ড নামে অসামঞ্জস্য।**
- ⚠️ **[Minor]** কপিরাইট লেখা "© 2024 Pharmacy Management System" — বছর আপডেট করা হয়নি (এখন ২০২৬)।
- ⚠️ **[Info]** পেজের `<title>` ট্যাগ সঠিক: "s7 Drug House — Pharmacy Management System"।

**পরামর্শ:**
- পাসওয়ার্ড ফিল্ডে `pi-eye / pi-eye-slash` টগল বাটন যোগ করুন।
- লগিন ভিজ্যুয়ালে শুধু "Pharmacy System" না লিখে "s7 Drug House" লিখুন।
- কপিরাইট ইয়ার `{{ currentYear }}` দিয়ে dynamic করুন।

---

### 🏠 ড্যাশবোর্ড হোম

**ভালো দিক:**
- ✅ সর্বদা দৃশ্যমান top header — brand name, live clock, user avatar।
- ✅ Sidebar collapse/expand toggle বাটন (`pi-bars`) — দুর্দান্ত।
- ✅ KPI cards (Total Medicines, Low Stock, Sales POS, Procurement) — চমৎকার hover animation।
- ✅ Color-coded left border (teal, amber, emerald, indigo) — তথ্য দ্রুত বোঝা যায়।
- ✅ Quick Action Tiles — icon + label কমপ্যাক্ট ডিজাইন।
- ✅ "Welcome back, [Name] 👋" greeting — personal touch ভালো।
- ✅ Real-time clock সহ date/time display।
- ✅ Permission-based rendering — role অনুযায়ী শুধু প্রাসঙ্গিক KPI দেখায়।
- ✅ No-permission overlay — নতুন user-দের জন্য সঠিক guidance।

**সমস্যা / অসংগতি:**
- ⚠️ **[Major]** Logout path ভুল! কোডে: `this.router.navigate(['/auth/login'])` কিন্তু routes-এ `/auth/login` নেই, আছে `/login`। **লগআউট করলে সম্ভবত blank/404 হয়।**
- ⚠️ **[Minor]** Dashboard home-এ শুধু Medicines count দেখায়; Sales count বা Today's Revenue দেখায় না — KPI cards-এ "Active" ও "New Order" লেখা তথ্যহীন, সংখ্যা নেই।
- ⚠️ **[Minor]** KPI card-এ "Sales POS — Active" এবং "Procurement — New Order" লেখা রয়েছে কিন্তু আজকের বিক্রয় সংখ্যা/টাকা দেখায় না।
- ⚠️ **[Minor]** সাইডবার সম্পূর্ণ collapse হলে (`width: 0`) কনটেন্ট হঠাৎ গায়েব হয় — কোনো icon-only mode নেই।
- ⚠️ **[Info]** সময় প্রতি ৬০ সেকেন্ডে আপডেট হয় (সেকেন্ড দেখায় কিন্তু realtime নয়)।

**পরামর্শ:**
- Logout route `/auth/login` → `/login` এ ঠিক করুন (critical bug)।
- Dashboard KPI-তে আজকের বিক্রয় সংখ্যা ও পরিমাণ যোগ করুন (API call)।
- Sidebar-এ icon-only collapsed mode যোগ করুন (240px → 60px → 0px)।

---

### 📦 মেডিসিন ইনভেন্টরি (`/dashboard/medicines`)

**ভালো দিক:**
- ✅ Sticky header (page title + search + paginator) — স্ক্রোল করলেও সর্বদা দৃশ্যমান।
- ✅ Real-time debounced search (`Alt+N` shortcut, `/` shortcut for search)।
- ✅ PrimeNG Table-এ frozen "Actions" column — বড় টেবিলে অনেক সুবিধাজনক।
- ✅ Status toggle switch (Active/Inactive) সরাসরি টেবিলে — quick toggle ভালো।
- ✅ Incomplete medicine warning icon (pulse animation সহ)।
- ✅ Color-coded stock badges (Low/OK)।
- ✅ Batch-wise stock details dialog — great feature।
- ✅ Quick-Add master data (Generic, Manufacturer, Category, UOM, etc.) — ইন্টুইটিভ।
- ✅ `Alt+N` keyboard shortcut for new medicine — power user friendly।

**সমস্যা / অসংগতি:**
- ⚠️ **[Major]** Table-এ দুটি `p-paginator` আছে! একটি toolbar-এ এবং একটি table-এর নিচে। উভয়েই active — দুটো paginator দেখলে বিভ্রান্তি তৈরি হয়।
- ⚠️ **[Minor]** Table scroll height: `calc(100vh - 230px)` hardcoded — বিভিন্ন স্ক্রিন সাইজে কাজ নাও করতে পারে।
- ⚠️ **[Minor]** Medicine form-এ `grid-template-columns: 1fr 1fr` — ছোট screen-এ অনেক কলাম crowded হয়।
- ⚠️ **[Info]** `pFrozenColumn` ডেস্কটপে ভালো কাজ করে, কিন্তু মোবাইলে horizontal scroll-এ সমস্যা করতে পারে।
- ⚠️ **[Minor]** "Use For" কলাম `text-overflow: ellipsis` করা — tooltip title আছে কিন্তু মোবাইলে hover কাজ করে না।

**পরামর্শ:**
- একটি `p-paginator` সরিয়ে দিন (toolbar থেকে অথবা নিচেরটা রাখুন)।
- Table scroll height responsive করুন: CSS variable বা dynamic calculation দিয়ে।

---

### 🛒 সেলস POS (`/dashboard/sales`)

**ভালো দিক:**
- ✅ পূর্ণাঙ্গ POS ফর্ম — Invoice ID auto-generate, Date, Time, Sales By।
- ✅ Customer search with autocomplete (registered/unregistered/guest badge)।
- ✅ Medicine autocomplete — stock, price, batch তথ্য suggestion-এ দেখায়।
- ✅ Batch-wise stock selection dropdown।
- ✅ Near-expiry medicine warning (⚠️ badge)।
- ✅ Quantity adjuster (+/-) buttons সহ InputNumber।
- ✅ Discount type সুইচ (% / ৳) — innovative UI।
- ✅ Split payment support — একাধিক payment method।
- ✅ Special discount field।
- ✅ Cash to Return calculator।
- ✅ Due amount tracking (registered customer only)।
- ✅ "Sale & Print Invoice" বাটন — একক ক্লিকে সম্পন্ন।
- ✅ Hold Sale feature।

**সমস্যা / অসংগতি:**
- ⚠️ **[Major]** Sales POS form অত্যন্ত wide — মোবাইলে অনেক কলাম horizontal scroll করতে হবে।
- ⚠️ **[Minor]** Medicine table-এ অনেক columns (Product, Batch, Exp, Stock, Qty, Price, Discount, VAT, Total, Delete) — compact screen-এ পড়া কঠিন।
- ⚠️ **[Minor]** "F2 to focus" hint দেওয়া আছে — এটা মোবাইল ব্যবহারকারীর জন্য প্রযোজ্য নয়।
- ⚠️ **[Info]** Guest sale-এ "Due not allowed" — সঠিক business rule।

**পরামর্শ:**
- মোবাইলে POS-এর জন্য আলাদা simplified layout তৈরি করুন।
- Medicine entry table-এ মোবাইলে accordion/card view যোগ করুন।

---

### 🏭 ক্রয় (Procurement) — `/dashboard/purchases`

**ভালো দিক:**
- ✅ Purchase list সহ New Purchase button।
- ✅ Purchase form — supplier selection, medicine items, batch tracking।

**সমস্যা / অসংগতি:**
- ⚠️ **[Minor]** Purchase form analysis থেকে দেখা যায় না এটি মোবাইলে responsive কিনা।

---

### 📊 Reports & Analytics

**ভালো দিক:**
- ✅ ১০টি রিপোর্ট মডিউল: Sales, Purchase, Stock, Profit/Loss, Expiry, Top Selling, Low Stock, Ledger, Staff Performance, VAT।
- ✅ Visual Dashboard (analytics) আলাদা।
- ✅ Permission-based — শুধু অনুমোদিত রিপোর্টই দেখা যায়।

---

### ⚙️ Configurations (Master Data)

**ভালো দিক:**
- ✅ ৭টি মাস্টার ডেটা মডিউল — Taxes, UOM, Generics, Categories, Manufacturers, Dosage Forms, Strengths, Indications।
- ✅ সরাসরি Medicine form থেকে Quick-Add সুবিধা।

---

### 👤 Administration

**ভালো দিক:**
- ✅ User Management ও Role Management পেজ।
- ✅ Role-based access control ভালোভাবে implemented।

---

## 📱 মোবাইল অভিজ্ঞতা (Mobile — 375px, iPhone SE)

### 🔐 লগিন পেজ (মোবাইল)

**ভালো দিক:**
- ✅ `@media (max-width: 900px)` এ বাম visual section `display: none` — সঠিক পদক্ষেপ।
- ✅ লগিন ফর্ম পুরো প্রস্থ জুড়ে দেখায়।
- ✅ `min-width: 100%` দেওয়া — overflow নেই।

**সমস্যা:**
- ⚠️ **[Minor]** `.login-form-side` তে `min-width: 450px` সেট করা — মোবাইলে `min-width: 100%` override করলেও 450px থাকার কারণে সম্ভাব্য overflow হতে পারে।
- ⚠️ **[Minor]** পাসওয়ার্ড শো/হাইড নেই (মোবাইলে আরো জরুরি)।

---

### 🏠 ড্যাশবোর্ড (মোবাইল)

**বড় সমস্যা:**
- ❌ **[Critical]** Sidebar collapse সত্ত্বেও কোনো **মোবাইল নেভিগেশন প্যাটার্ন** নেই! Hamburger menu (`sidebar-toggle` বাটন) কাজ করে কিন্তু collapsed sidebar `width: 0` হয় — নেভিগেশন সম্পূর্ণ অদৃশ্য হয়।
- ❌ **[Critical]** `.app-body { display: flex }` — মোবাইলে sidebar এবং main content পাশাপাশি থাকে। 375px-এ যদি sidebar open থাকে, main content খুব সরু হয়ে যায়।
- ⚠️ **[Major]** Header-এ user chip, clock, brand text সব একসাথে — 375px-এ বড় হয়ে overflow হতে পারে।
- ⚠️ **[Major]** KPI grid `repeat(auto-fill, minmax(240px, 1fr))` — মোবাইলে ২৪০px grid item দুটো পাশাপাশি ধরবে না, একটাই দেখাবে কিন্তু padding-এ আটকে যাবে।
- ⚠️ **[Minor]** `body { overflow: hidden }` — পুরো পেজ scroll lock করা, মোবাইলে এটা সমস্যাজনক।

**পরামর্শ:**
- Sidebar-এ মোবাইল mode: hamburger toggle → sidebar overlay হিসেবে দেখানো (position: absolute, full-height overlay)।
- Backdrop/scrim যোগ করুন sidebar overlay-এর জন্য।
- Header-এ মোবাইলে clock এবং user info compact করুন বা লুকান।
- KPI grid: `minmax(150px, 1fr)` বা `grid-template-columns: 1fr 1fr` মোবাইলে।

---

### 📦 মেডিসিন টেবিল (মোবাইল)

**বড় সমস্যা:**
- ❌ **[Critical]** ১৬টি কলাম সহ medicine table মোবাইলে সম্পূর্ণ unusable। horizontal scroll করতে হবে কিন্তু frozen column-এর কারণে confused layout হবে।
- ❌ **[Critical]** Sticky header + scrollable table height `calc(100vh - 230px)` — মোবাইলে এই calculation কাজ নাও করতে পারে।
- ⚠️ **[Major]** Medicine add/edit form `grid-template-columns: 1fr 1fr` — মোবাইলে `@media (max-width: 550px)` এ `1fr` করা আছে — ✅ ঠিক আছে।
- ⚠️ **[Minor]** PrimeNG dialog `width: 95vw` দেওয়া — মোবাইলে মোটামুটি ঠিক।

**পরামর্শ:**
- Medicine table মোবাইলে card/accordion view করুন।
- অথবা মোবাইলে শুধু Name, Stock, Price, Actions কলাম দেখান।

---

### 🛒 সেলস POS (মোবাইল)

- ❌ **[Critical]** POS form horizontal layout — মোবাইলে সম্পূর্ণ ব্যবহার অযোগ্য। ১০-কলামের medicine entry table 375px-এ overflow হবে।
- ❌ **[Critical]** Footer grid দুটো কলাম — মোবাইলে একটা কলামে নামিয়ে আনতে হবে।
- ⚠️ **[Major]** "F2 to focus" hint — মোবাইলে অর্থহীন।

---

## 📲 ট্যাবলেট/আইপ্যাড অভিজ্ঞতা (Tablet — 768px)

### লগিন পেজ (Tablet)
- ✅ 900px breakpoint-এ left visual section দেখায়।
- ⚠️ 768px-900px range-এ left visual লুকানো কিন্তু `login-form-side` এ `min-width: 450px` — 768px-এ ভালোভাবে দেখাবে।

### ড্যাশবোর্ড (Tablet)
- ⚠️ **[Major]** Sidebar 768px-এ open থাকলে 240px নেয়, বাকি ৫২৮px main content — যথেষ্ট স্পেস কিন্তু crowded।
- ⚠️ **[Minor]** KPI grid `minmax(240px)` — 2 cards per row দেখাবে ৭৬৮px-এ। মোটামুটি ঠিক।
- ✅ Action tiles `minmax(160px)` — 3-4 tiles per row দেখাবে। ভালো।

### Medicine Table (Tablet)
- ⚠️ **[Major]** ১৬ কলামের table 768px-এও কঠিন। horizontal scroll প্রয়োজন।
- ⚠️ **[Minor]** PrimeNG scrollable table — tablet-এ nested scrolling দেখতে অদ্ভুত।

---

## 🐛 সমস্ত সমস্যার তালিকা (Priority Order)

### 🔴 Critical (অবশ্যই ঠিক করতে হবে)

| # | সমস্যা | অবস্থান |
|---|--------|---------|
| 1 | **Logout bug**: `/auth/login` route নেই, সঠিক route `/login` | `dashboard.component.ts:827` |
| 2 | **মোবাইলে sidebar** কোনো overlay/backdrop pattern নেই — navigation অদৃশ্য হয় | `dashboard.component.ts` |
| 3 | **Sales POS মোবাইলে unusable** — ১০-কলামের table 375px-এ overflow | `sales-form.component` |
| 4 | **Medicine table মোবাইলে unusable** — ১৬ কলাম 375px-এ অকেজো | `medicine-list.component` |

### 🟡 Major (গুরুত্বপূর্ণ, দ্রুত ঠিক করা উচিত)

| # | সমস্যা | অবস্থান |
|---|--------|---------|
| 5 | **Duplicate paginator** medicine list-এ (toolbar + table bottom) | `medicine-list.component` |
| 6 | Dashboard KPI-তে আজকের Sales/Revenue data নেই | `dashboard.component` |
| 7 | Header user chip + clock মোবাইলে overflow হতে পারে | `dashboard.component` |
| 8 | `body { overflow: hidden }` mobile-এ সমস্যাজনক | `styles.css:39` |
| 9 | KPI grid `minmax(240px)` মোবাইলে layout ভাঙতে পারে | `dashboard.component` |

### 🟠 Minor (উন্নতি করা যায়)

| # | সমস্যা | অবস্থান |
|---|--------|---------|
| 10 | Login-এ পাসওয়ার্ড show/hide বাটন নেই | `login.component` |
| 11 | Login ভিজ্যুয়ালে brand name mismatch ("Pharmacy System" vs "s7 Drug House") | `login.component` |
| 12 | Copyright year hardcoded "2024" | `login.component:94` |
| 13 | Sidebar icon-only collapsed mode নেই (240px → 60px উচিত ছিল) | `dashboard.component` |
| 14 | "F2 to focus" hint মোবাইলে প্রযোজ্য নয় | `sales-form.component` |
| 15 | Table scroll height `calc(100vh - 230px)` hardcoded | `medicine-list.component` |
| 16 | Medicine "Use For" tooltip hover মোবাইলে কাজ করে না | `medicine-list.component` |

---

## ✅ ভালো দিকগুলো (Positive Highlights)

| বিষয় | বিবরণ |
|------|-------|
| **ডিজাইন** | Inter font, teal palette, shadow system — premium look |
| **অ্যানিমেশন** | `fadein-up`, `slide-in-left`, pulse animation — smooth ও subtle |
| **কীবোর্ড শর্টকাট** | `Alt+N` (new medicine), `/` (search focus) — power user friendly |
| **RBAC** | Permission-based navigation ও module access — সঠিকভাবে implemented |
| **মেডিসিন অনুসন্ধান** | Debounced real-time search — fast ও efficient |
| **Batch Tracking** | Batch-wise stock, expiry warning — pharmacy-specific feature |
| **Split Payment** | একাধিক payment method — real-world pharmacy workflow |
| **Quick-Add** | Master data quick-add সরাসরি medicine form থেকে |
| **No-Permission Overlay** | নতুন user-দের জন্য সুন্দর guidance message |
| **Sticky Header** | Medicine list-এ sticky search/paginator — UX ভালো |
| **Frozen Column** | Actions column frozen — wide table-এ সুবিধাজনক |
| **SEO** | Title tag, meta description, viewport meta — সব আছে |
| **Font Optimization** | Inter font preconnect দিয়ে load করা |
| **PrimeIcons** | Consistent icon system সারা যায়গায় |

---

## 📐 পরামর্শ সারণী (Recommendations Summary)

### অগ্রাধিকার ১ — Critical Fixes

```typescript
// 1. Logout bug fix (dashboard.component.ts:827)
this.router.navigate(['/login']); // '/auth/login' না

// 2. Mobile sidebar — overlay mode
// sidebar collapse হলে position:fixed, z-index:999 overlay হিসেবে দেখানো
// backdrop div যোগ করা
```

```css
/* 3. Mobile sidebar overlay */
@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    height: 100%;
    z-index: 999;
  }
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 998;
  }
}
```

### অগ্রাধিকার ২ — Mobile Table Fix

```css
/* Medicine table mobile — card view */
@media (max-width: 768px) {
  .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  /* অথবা card/accordion layout */
}
```

### অগ্রাধিকার ৩ — Quick Wins

```typescript
// Copyright year dynamic (login.component)
currentYear = new Date().getFullYear(); // template: © {{ currentYear }}

// Login brand name fix
// বাম পাশে 'Pharmacy System' → 's7 Drug House'
```

```scss
// KPI grid mobile fix
@media (max-width: 640px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .kpi-card { padding: 14px 16px; }
}
```

---

## 📊 স্কোরকার্ড

| বিভাগ | Desktop | Mobile | Tablet |
|-------|---------|--------|--------|
| **ভিজ্যুয়াল ডিজাইন** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **নেভিগেশন** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **লগিন** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **ড্যাশবোর্ড** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **মেডিসিন লিস্ট** | ⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| **সেলস POS** | ⭐⭐⭐⭐⭐ | ⭐ | ⭐⭐ |
| **পারফরম্যান্স** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **সামগ্রিক** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |

> ডেস্কটপে সিস্টেমটি চমৎকার, কিন্তু মোবাইলে উল্লেখযোগ্য উন্নতি প্রয়োজন।

---

## 🔒 গুরুত্বপূর্ণ নোট

> এই রিপোর্ট শুধুমাত্র পর্যালোচনার জন্য। এই ডকুমেন্টে কোনো পরিবর্তনের সুপারিশ করা হয়েছে, কিন্তু **আপনার অনুমতি ছাড়া কোনো কোড পরিবর্তন করা হয়নি।**

---

*Audit completed: 2026-04-14 | Auditor: Antigravity AI*
