# Project Implementation Timeline

এই ফাইলে প্রজেক্টের সকল পরিবর্তনের রেকর্ড তারিখ ও সময় অনুযায়ী সংরক্ষণ করা হবে।

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
