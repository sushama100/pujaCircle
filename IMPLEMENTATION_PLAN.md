# Implementation Plan: Special Event & Wedding Slots System (Frontend Only)

## 📌 Objective
Add a dedicated, simple form and management deck on the Priest Availability Page (`/priest/availability`) allowing priests to create **Special Advance Slots** for major rituals like **Weddings (Vivah Sanskar), Griha Pravesh, Upanayana, or All-Night Pujas**:
- **Advance Booking Beyond Rolling Calendar:** Devotees can book these special slots months in advance without relying on standard daily calendar slots.
- **Custom Timings & Ceremonies:** Supports non-standard ceremony durations (e.g. `04:00 AM - 10:00 AM` or `04:00 PM - 11:30 PM`) with custom ritual titles.
- **Strictly Zero Backend Changes:** Uses client-side persistence (`localStorage`) integrated with the existing `priestApi.createAvailabilitySlot` so the backend remains 100% untouched.

---

## 🏗️ Architecture & Component Hierarchy

```
frontend/
├── src/
│   ├── lib/
│   │   └── availabilityUtils.ts             <-- [UPDATE] Add SpecialSlot interface & localStorage helpers
│   ├── components/
│   │   └── priest/
│   │       ├── CreateSpecialSlotModal.tsx   <-- [NEW] Simple form to create wedding/custom puja slot
│   │       └── BlockTimeModal.tsx           <-- [EXISTING] Retained for daily blackouts
│   └── pages/
│       └── priest/
│           └── PriestAvailabilityPage.tsx   <-- [UPDATE] Add '+ Create Special Slot' button & Special Slots deck
```

---

## 📝 Detailed Implementation Tasks

### Task 1: Extend Availability Utilities (`frontend/src/lib/availabilityUtils.ts`)
Add a simple data model and helper functions:
```typescript
export interface SpecialSlot {
  id: string;
  priestId: string;
  ceremonyName: string; // e.g. "Grand Wedding (Vivah Sanskar)"
  date: string;         // YYYY-MM-DD
  startTime: string;    // HH:mm
  endTime: string;      // HH:mm
  note?: string;        // e.g. "Includes Mandap Puja & Saptapadi"
  createdAt: string;
}
```
* **Storage helpers:**
  - `getSpecialSlots(priestId: string): SpecialSlot[]`
  - `saveSpecialSlot(slot: SpecialSlot): void`
  - `deleteSpecialSlot(priestId: string, slotId: string): void`

---

### Task 2: Create Special Slot Form Modal (`frontend/src/components/priest/CreateSpecialSlotModal.tsx`)
Build an easy, simple modal form:
1. **Ceremony / Puja Type:**
   - Quick preset selector chips:
     - `💍 Wedding (Vivah)`
     - `🏡 Griha Pravesh`
     - `🪔 Satyanarayan Katha`
     - `🔱 Maha Rudrabhishek`
     - `⚡ Custom Puja`
   - Custom ritual name text input.
2. **Date Picker:** Native `<input type="date" />` supporting any future date (even 6 months or 1 year in advance).
3. **Time Window:** Start Time & End Time inputs with quick presets (`Morning: 06:00 - 12:00`, `Evening: 16:00 - 23:00`).
4. **Special Notes / Muhurat Guidance:** Optional textarea for auspicious timings or devotee instructions.
5. **Action Buttons:** `Create Special Slot` and `Cancel`.

---

### Task 3: Integrate into `PriestAvailabilityPage.tsx`
1. **Header Action Button:**
   - Add a gold/amber button in the page header:
     `[🌟 Create Special Wedding / Event Slot]`
2. **Special Slots Deck (Below Calendar):**
   - A dedicated card: **"🌟 Special & Wedding Advance Slots"**.
   - Displays all upcoming special slots created by the priest.
   - Shows:
     - Ritual Title with a purple/gold crown badge.
     - Scheduled Date & Auspicious Time Window.
     - Notes / Guidance.
     - Quick **Delete (Trash)** button to cancel the special slot anytime.
3. **Calendar Grid Badging:**
   - Any date on the calendar that has a special slot displays a distinct star badge:
     `🌟 Special Slot`

---

## 🔍 Verification & Acceptance Criteria
1. **Easy Form**: Priests can easily open the modal, select "Wedding", pick a future date, and save within 15 seconds.
2. **Advance Scheduling**: Works for any date, even beyond the 90-day rolling window.
3. **Persistence**: Created special slots persist across browser page refreshes.
4. **Calendar Indicator**: The calendar immediately displays a `🌟 Special Slot` badge on the corresponding date.
5. **Zero Backend Impact**: Verified with `npm run typecheck` and `npm run build` with strictly 0 changes to backend code.
