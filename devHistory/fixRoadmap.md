# 🚀 Pharmacy Management System — Fix & Optimization Roadmap

এই রোডম্যাপটি `check.md` ফাইলে চিহ্নিত অসংগতি এবং বাগগুলো পর্যায়ক্রমে সমাধান করার জন্য তৈরি করা হয়েছে। এটি তিনটি প্রধান ধাপে (Phases) বিভক্ত।

---

## 🛠️ Phase 1: Critical Fixes (উচ্চ অগ্রাধিকার)
*উদ্দেশ্য: সিস্টেমের মূল কার্যকারিতা এবং মোবাইল নেভিগেশন ঠিক করা।*

### 1. লগআউট বাগ ফিক্স (Logout Routing)
- **ফাইল:** `frontend/src/app/components/dashboard/dashboard.component.ts`
- **কাজ:** `this.router.navigate(['/auth/login'])` পরিবর্তন করে `this.router.navigate(['/login'])` করা।

### 2. মোবাইল সাইডবার এবং নেভিগেশন (Mobile Sidebar Overlay)
- **ফাইল:** `frontend/src/app/components/dashboard/dashboard.component.ts`, `styles.css`
- **কাজ:** মোবাইলে (breakpoints < 768px) সাইডবারটিকে একটি Drawer/Overlay মোডে রূপান্তর করা। ড্রয়ার ওপেন থাকলে একটি Backdrop (Scrim) যোগ করা যাতে ইউজার বাইরে ক্লিক করে বন্ধ করতে পারে।

### 3. মোবাইল-ফ্রেন্ডলি টেবিল ভিউ (Responsive Tables)
- **ফাইল:** `frontend/src/app/components/medicines/medicine-list.component.ts`
- **কাজ:** মোবাইলে ১৬টি কলামের টেবিলের পরিবর্তে Card-based layout বা 'Accordion' ভিউ ইমপ্লিমেন্ট করা অথবা শুধুমাত্র প্রয়োজনীয় ২-৩টি কলাম রেখে বাকিগুলো 'View Details' এ পাঠানো।

### 4. সেলস POS মোবাইল অপ্টিমাইজেশন (Responsive POS)
- **ফাইল:** `frontend/src/app/components/sales/sales-form.component.html/scss`
- **কাজ:** POS টেবিল এবং ফুটার গ্রিডকে মোবাইলে Single Column stack করা। আইটেম এন্ট্রি টেবিলটিকে ছোট স্ক্রিনে ব্যবহারের উপযোগী করা।

---

## 📈 Phase 2: Major Improvements (মাঝারি অগ্রাধিকার)
*উদ্দেশ্য: ড্যাশবোর্ড ডেটা এবং ইউজার ইন্টারফেসের স্পষ্টতা বৃদ্ধি।*

### 5. ডুপ্লিকেট প্যাজিনেটর রিমুভাল
- **ফাইল:** `frontend/src/app/components/medicines/medicine-list.component.ts`
- **কাজ:** টপ টুলবার অথবা টেবিলের নিচ থেকে যেকোনো একটি `p-paginator` সরিয়ে ফেলা।

### 6. ড্যাশবোর্ড রিয়েল-টাইম ডেটা (Live KPIs)
- **ফাইল:** `frontend/src/app/components/dashboard/dashboard.component.ts`
- **কাজ:** Dashboard KPI কার্ডে "Active" বা "New Order" টেক্সটের পরিবর্তে আজকের বিক্রয় সংখ্যা, মোট গ্রাহক এবং আজকের আয়ের লাইভ পরিসংখ্যান যোগ করা।

### 7. হেডার রেসপন্সিভনেস (Header Cleanup)
- **ফাইল:** `frontend/src/app/components/dashboard/dashboard.component.ts`
- **কাজ:** মোবাইলে ঘড়ি এবং ইউজার চিপ হাইড করা অথবা একটি ছোট আইকনের মধ্যে নিয়ে আসা যাতে হেডার উপচে (overflow) না পড়ে।

### 8. সাইডবার কলাপস মোড (Mini Sidebar)
- **ফাইল:** `frontend/src/app/components/dashboard/dashboard.component.ts`
- **কাজ:** সাইডবার সম্পূর্ণ গায়েব না করে শুধুমাত্র আইকনগুলো (64px width) দেখানোর ব্যবস্থা করা। এতে ইউজারের কাজ করতে সুবিধা হবে।

---

## 🎨 Phase 3: Minor Tweaks & Polish (নিম্ন অগ্রাধিকার)
*উদ্দেশ্য: অ্যাপ্লিকেশনের সূক্ষ্ম ডিটেইলস এবং ফিনিশিং টাচ।*

### 9. পাসওয়ার্ড শো/হাইড বাটন
- **ফাইল:** `frontend/src/app/components/login/login.component.ts`
- **কাজ:** লগিন ফর্মে পাসওয়ার্ড দেখার জন্য আইকন টগল যোগ করা।

### 10. ব্র্যান্ডিং এবং কপিরাইট আপডেট
- **ফাইল:** `frontend/src/app/components/login/login.component.ts`
- **কাজ:** 
    - লগিন ভিজ্যুয়ালে "Pharmacy System" বদলে "s7 Drug House" করা।
    - কপিরাইট ইয়ার ডায়নামিক করা: `new Date().getFullYear()`।

### 11. কী-বোর্ড এবং টুলটিপ অপ্টিমাইজেশন
- **ফাইল:** `frontend/src/app/components/sales/sales-form.component.html`, `frontend/src/app/components/medicines/medicine-list.component.ts`
- **কাজ:** 
    - মোবাইলে "F2 to focus" এবং অন্যান্য কীবোর্ড ডিরেকশন হাইড করা।
    - কলামের দীর্ঘ টেক্সটের জন্য মোবাইল-ফ্রেন্ডলি প্রেস-অ্যান্ড-হোল্ড টুলটিপ বা ডিটেইল ডায়ালগ নিশ্চিত করা।

### 12. গ্লোবাল ওভারফ্লো ফিক্স
- **ফাইল:** `frontend/src/styles.css`
- **কাজ:** `body { overflow: hidden }` পরিবর্তন করে শুধু ডেস্কটপে এটি রাখা এবং মোবাইল স্ক্রিনে স্ক্রলিং এলাউ করা।

---

## 🚦 Execution Order
1. **Phase 1 (Quick Wins & Navigation):** ১ ও ২ নম্বর কাজ।
2. **Phase 1 (Core UX):** ৩ ও ৪ নম্বর কাজ।
3. **Phase 2:** ৫, ৬ ও ৭ নম্বর কাজ।
4. **Phase 3:** ধারাবাহিক ভাবে শেষ করা।

---
*Roadmap created based on UX Audit dated 2026-04-14*
