# Project Implementation Timeline

এই ফাইলে প্রজেক্টের সকল পরিবর্তনের রেকর্ড তারিখ ও সময় অনুযায়ী সংরক্ষণ করা হবে।

---

- [2026-03-12 03:00 PM] - Medicine Feature Overhaul & UI Alignment
- **Task:** Comprehensive Upgrade of Medicine Management
- **Details:** 
  - **Data Model:** `Medicine` টেবিলে `PurchasePrice`, `Batch` এবং `ExpiryDate` যোগ করা হয়েছে। জেনেরিক ও ক্যাটাগরি নাম (Category) বড় করার জন্য লিমিট ২৫০ ক্যারেক্টারে বাড়ানো হয়েছে।
  - **UI/UX:** মেডিসিন লিস্টে এখন ১১টি কলাম (Code, Name, Category, Generic, UOM, Purchase, Sale, Batch, Expiry, Stock, Status) ডাইনামিকভাবে প্রদর্শিত হয়।
  - **Navigation:** ফর্মে কী-বোর্ড নেভিগেশন (Enter key focus flow) এবং অটো-কোড জেনারেশন ইমপ্লিমেন্ট করা হয়েছে।
  - **Features:** "Details View" (Eye icon) যোগ করা হয়েছে যা দিয়ে মেডিসিনের সকল তথ্য আলাদা পপ-আপে দেখা যায়।
- **Technology:** ASP.NET Core 8, EF Core (Migrations), Angular 19, PrimeNG (Dialog, Select, InputNumber).
- **Status:** COMPLETED & VERIFIED

---

- [2026-03-12 10:40 AM] - Deployment Lock Resolution & Maintenance Mode Fix
- **Task:** Fixing FTP 550 Error & Tuning Maintenance Mode
- **Details:** 
  - **Deploy Fix:** `deploy.yml` ফাইলে `app_offline.htm` এর কন্টেন্টকে ডায়নামিক (timestamp-সহ) করা হয়েছে যাতে IIS রানিং প্রসেস রিলিজ করতে বাধ্য হয়।
  - **Manual Cleanup:** অটো-ক্লিনআপ পাথের সমস্যার কারণে ফাইলটি ম্যানুয়ালি ডিলিট করে সাইট অনলাইনে ফিরিয়ে আনা হয়েছে।
- **Technology:** GitHub Actions, IIS Configuration, FTP.
- **Status:** COMPLETED & ONLINE

- [2026-03-12 09:55 AM] - Taxes API Fix & Robust Error Reporting Overhaul
- **Task:** Resolving 400 Bad Request & Enhancing Master Data Reliability
- **Details:** 
  - **Backend Diagnostics:** `TaxesController` এবং অন্যান্য Master Data Controllers-এ `ModelState` ভ্যালিডেশন এরর রিপোর্টিং যোগ করা হয়েছে। এখন থেকে সার্ভার সরাসরি বলবে কোন ফিল্ডে সমস্যা।
  - **Frontend Fix:** `TaxListComponent` সহ সব মাস্টার ডেটা মডিউলে ফরম রিসেট লজিক এবং ডিফল্ট ভ্যালু (`isActive`) হ্যান্ডলিং ঠিক করা হয়েছে যাতে ৪০০ এরর প্রতিরোধ করা যায়।
  - **Global Impact:** `UOM`, `Category`, `Generic` এবং `Party` মডিউলেও প্র্যাকটিভলি এই ফিক্সগুলো অ্যাপ্লাই করা হয়েছে।
  - **Error UI:** ফ্রন্টএন্ড টোস্ট মেসেজে এখন ব্যাকএন্ডের নির্দিষ্ট এরর মেসেজগুলো প্রদর্শিত হবে।
- **Technology:** ASP.NET Core 8, Angular 19, PrimeNG.
- **Status:** COMPLETED & VERIFIED

- [2026-03-12 07:45 AM] - Master Data Modules Implementation
- **Task:** Implementing Master Data (Party, Tax, UOM, Generic, Category)
- **Details:** 
  - **Architecture:** Generic Repository Pattern ব্যবহার করে ব্যাকএন্ড লেয়ার মজবুত করা হয়েছে।
  - **Backend:** ৫টি নতুন Models, Repositories এবং Controllers যোগ করা হয়েছে।
  - **Database:** EF Core মাইগ্রেশনের মাধ্যমে Tables (Parties, Taxes, etc.) তৈরি ও ইউনিক ইনডেক্স সেট করা হয়েছে।
  - **Frontend:** Angular Standalone Components এবং ৫টি সার্ভিস তৈরি করা হয়েছে। 
  - **UI/UX:** PrimeNG টেবিল, সামারি চিপস এবং রিঅ্যাক্টিভ ফর্মের মাধ্যমে প্রিমিয়াম ইন্টারফেস নিশ্চিত করা হয়েছে।
- **Technology:** ASP.NET Core 8, EF Core, Angular 19, PrimeNG.
- **Status:** COMPLETED & VERIFIED

---

- [2026-03-11 01:30 PM] - Automated Deployment Fix (Phase 9)
- **Task:** Resolving FTP 550 File Lock & Automating Maintenance Mode
- **Details:** 
  - `deploy.yml` এ `app_offline.htm` মেকানিজম যুক্ত করা হয়েছে।
  - ডেপ্লয়মেন্টের শুরুতে স্বয়ংক্রিয়ভাবে সাইটকে অফলাইনে নেওয়া এবং কাজ শেষে `curl` কমান্ডের মাধ্যমে ফাইলটি মুছে ফেলে সাইটকে অনলাইনে ফিরিয়ে আনার প্রসেস অটোমেট করা হয়েছে।
  - এর ফলে এখন থেকে আর ম্যানুয়ালি ফাইল ম্যানেজার ব্যবহার করার প্রয়োজন পড়বে না।
- **Technology:** GitHub Actions, FTP-Deploy-Action, cURL.
- **Status:** COMPLETED & PUSHED

---


- [2026-03-11 11:45 AM] - Massive UI/UX Redesign (Phase 1-8)
- **Task:** Complete Project Visual Overhaul & Bug Fixes
- **Details:** 
  - **Dashboard:** KPI কার্ড (Meds, Stock, Sales, Procurement), ফিক্সড হেডার এবং মোবাইল-ফ্রেন্ডলি সাইডবার।
  - **Medicines:** লাইভ সার্চ (Signals ভিত্তিক), অটো-আপডেটিং সামারি চিপস এবং স্টাইলিশ টেবিল।
  - **Sales POS:** পেমেন্ট মেথড বাগ ফিক্স, ৩-বাটন পেমেন্ট সিলেক্টর এবং ডার্ক সামারি প্যানেল।
  - **Procurement:** ২-কলাম লেআউট, টিপস কার্ড এবং রিয়েল-টাইম অর্ডার ক্যালকুলেশন।
  - **User Management:** কার্ড-বেসড UI, ইউজার অভাতার এবং রোল-ভিত্তিক কালার ব্যাজ।
  - **Auth Pages:** Login, Register, Forgot Password-এ প্রিমিয়াম স্প্লিট-লেআউট এবং অ্যানিমেটেড ইউআই।
  - **Build:** প্রোডাকশন বিল্ড সাকসেস এবং সিএসএস বাজেট অপ্টিমাইজেশন।
- **Technology:** Angular 18, PrimeNG, Tailwind, CSS Variables.
- **Status:** COMPLETED & VERIFIED

---


- [2026-03-11 08:00 AM] - API 404 Routing Fix v2 (OutOfProcess)
- **Task:** Resolving 404 (Second Attempt)
- **Details:** 
  - হোস্টিং মডেল পরিবর্তন করে `OutOfProcess` করা হয়েছে।
  - এপিআই হ্যান্ডলার কনফ্লিক্ট এড়ানোর জন্য `<remove name="aspNetCore" />` যুক্ত করা হয়েছে।
  - ডেপ্লয়মেন্ট পাইপলাইনে `ls -R` ডায়াগনস্টিক যুক্ত করা হয়েছে।
- **Technology:** IIS OutOfProcess Hosting, ASP.NET Core 8.
- **Status:** FIX V2 APPLIED - WAITING FOR PUSH

---

- [2026-03-11 07:45 AM] - API 404 Routing Fix (IIS Config)
- **Task:** Resolving 404 on API Endpoints
- **Details:** 
  - `web.config` আপডেট করা হয়েছে যাতে `processPath` সরাসরি `PharmacyApi.exe` কে নির্দেশ করে।
  - `deploy.yml` এ ম্যানুয়াল `web.config` কপি চেক যুক্ত করা হয়েছে যাতে পাবলিশ ফোল্ডারে এটি নিশ্চিতভাবে থাকে।
  - এটি সেলফ-কন্টেইনড বিল্ডের জন্য এপিআই রাউটিং সমস্যা সমাধান করবে।
- **Technology:** ASP.NET Core Module V2, IIS Configuration.
- **Status:** FIX APPLIED - WAITING FOR PUSH

---

- [2026-03-11 07:15 AM] - Self-Contained Build Fix
- **Task:** Resolving 404 (Self-Contained Deployment)
- **Details:** 
  - Portable বিল্ড সম্ভবত শেয়ারড হোস্টিং-এ `dotnet` কমান্ড এক্সেস পাচ্ছিল না।
  - `self-contained` (win-x64) রানিং মোডে ফিরে যাওয়া হয়েছে যাতে সব DLL এবং Runtime প্যাক করা থাকে।
  - `wwwroot` এবং `publish` সিঙ্ক লজিক আরও মজবুত করা হয়েছে।
- **Technology:** .NET Core Self-Contained, win-x64.
- **Status:** FIX PUSHED & DEPLOYING FINAL

---

- [2026-03-11 06:45 AM] - Sync Investigation (Broken Layout)
- **Task:** Debugging 404 & Broken CSS
- **Details:** 
  - সার্ভারের ফাইল ক্লিনিং-এর পরও লেআউট ভেঙে আসছিল এবং এপিআই ৪০৪ দিচ্ছিল।
  - চিহ্নিত করা হয়েছে যে বিল্ড প্রসেসে পুরনো ফাইল থেকে যাচ্ছিল (Stale artifacts)।
  - `deploy.yml` আপডেট করা হয়েছে যাতে প্রতিবার একদম ফ্রেশ বিল্ড (Clean build) তৈরি হয় এবং `wwwroot` সঠিকভাবে সিঙ্ক হয়।
- **Technology:** GitHub Actions, Ubuntu Runner, .NET CLI.
- **Status:** FIX PUSHED & DEPLOYING

---

- [2026-03-11 05:55 AM] - Deployment Logic Fix
- **Task:** Fixing Sync Issues (Git Tracking)
- **Details:** 
  - `wwwroot` ফোল্ডারটি Git ট্র্যাকিং থেকে বাদ দেওয়া হয়েছে (এটি বিল্ড আউটপুট ফোল্ডার, তাই Git-এ থাকা উচিত নয়)।
  - `.gitignore` আপডেট করা হয়েছে যাতে ভবিষ্যতে বিল্ড ফাইলগুলো GitHub-এ পুশ না হয়।
  - GitHub Actions এখন সম্পূর্ণ স্বচ্ছভাবে (Clean build) নতুন ফাইলগুলো ডেপলয় করবে।
- **Technology:** Git, GitHub Actions, CI/CD.
- **Status:** COMPLETED & PUSHED

---

- [2026-03-11 05:45 AM] - Build Fix & Deployment
- **Task:** Resolving Build Failure
- **Details:** 
  - `index.html` এর ভুল HTML স্ট্রাকচার (Missing tags) ঠিক করা হয়েছে।
  - GitHub Actions বিল্ড এরর `link.parentNode?.insertBefore is not a function` সমাধান করা হয়েছে।
  - পরিবর্তনগুলো GitHub-এ Push করা হয়েছে।
- **Technology:** HTML, Angular Build, CI/CD.
- **Status:** FIXED & PUSHED

---

## [2026-03-11 05:35 AM] - Branding & Documentation
- **Task:** Title & Favicon Update
- **Details:** 
  - Application Title পরিবর্তন করে `s7- Drug House | PharmacySys` করা হয়েছে।
  - ইউজার অ্যাটাচ করা ইমেজ দিয়ে ফেভিকন (`favicon.png`) আপডেট করা হয়েছে।
  - `Task_note` ফোল্ডার তৈরি করা হয়েছে এবং এতে `Manual_Guide.md` ও `Timeline.md` সংরক্ষণ করা হয়েছে।
  - পরিবর্তনগুলো GitHub-এ Push করা হয়েছে যাতে লাইভ সাইট (`pharmacymsys.runasp.net`) আপডেট হয়।
- **Technology:** Angular, Git, GitHub Actions.
- **Status:** COMPLETED

---

## [2026-03-11 05:05 AM] - Status Review
- **Task:** Initial Project Status Review
- **Details:** প্রজেক্টের টেকনিক্যাল স্ট্যাক, অটোমেশন এবং সাম্প্রতিক পরিবর্তনের একটি বিস্তারিত রিভিউ দেওয়া হয়েছে।
- **Status:** COMPLETED
### [2024-05-22] - Auto-Generated Unique Codes Implementation
- **Feature**: Auto-generation of unique codes (CUS-0001, SUP-0001, TAX-0001, etc.) for all Master Data modules.
- **Backend**: Updated IRepository, all 5 repositories, and controllers to support GetNextCode logic.
- **Frontend**: Updated Services and Components to fetch and display read-only codes automatically.
- **Status**: Completed.
