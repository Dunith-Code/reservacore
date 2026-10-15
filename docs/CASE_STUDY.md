# 📘 Case Study: ReservaCore

## 🏢 1. Business context

A growing organization shares facilities and equipment (meeting rooms, projectors, vehicles) between individuals and teams. Reservations are handled through informal communication and manual records. As the organization grows, this causes scheduling confusion, overlapping reservations, and uncertainty about what is available.

---

## 🧭 My approach

The brief describes a business problem rather than a specification, so this project is as much about interpretation as implementation. My method was:

1. Read the brief for symptoms and constraints, not for features
2. Translate each phrase into a requirement (section 4)
3. Prioritise the core and the hardest problem first
4. Decide deliberately what to leave out (section 5)
5. Compare options for the risky decisions (section 6)
6. Verify with automated and manual tests, and document the limits (sections 8 and 9)

---

## 🎯 2. What the symptoms have in common

The three symptoms in the brief point to one shared gap: **there is no single source of truth for who has what, and when.**

| Symptom | Root cause |
|---|---|
| Scheduling confusion | Information lives in chats, memory and personal records |
| Overlapping reservations | Nothing checks a new request against existing ones, and two people can ask at the same moment |
| Uncertainty about availability | There is no place to look; you have to ask someone |

The brief adds that the solution must "remain reliable as day-to-day activities grow". I read this as a **correctness requirement under concurrent use**, not a performance requirement.

---

## 👥 3. Stakeholders and what they need

| Stakeholder | Needs |
|---|---|
| Employees (members) | See what is free, book quickly, understand why a booking failed, change or cancel their own bookings |
| Administrators | Maintain the resource catalogue, retire resources, step in when needed |
| The organization | Trustworthy records, accountability (who booked what), no double-bookings |

---

## 🧭 4. From the brief to requirements

| The brief says | My interpretation | What I built |
|---|---|---|
| "organize its resources" | A catalogue with type, location, capacity and an active/inactive state | Resource management (admin), search and type filters |
| "coordinate reservations" | A booking lifecycle with ownership and permissions | Create, reschedule, cancel; members manage their own, admins any |
| "clear understanding of usage and availability" | Answer "what is free?" and "what is coming?" at a glance | Dashboard, per-resource day timeline, reservation filters |
| "overlapping reservations" | Prevent overlaps by design, rather than rely on people checking first | PostgreSQL exclusion constraint |
| "remain reliable as activities grow" | Safe under simultaneous requests; history preserved; rules that keep data sane | Concurrency-safe booking, indexes, status-based cancellation, booking rules, automated tests |
| "informal communication and manual records" | One system of record with accountability | Every booking is tied to a user and a purpose |

---

## ✂️ 5. Scope decisions

The brief explicitly asks for a focused solution and for prioritization over unnecessary complexity.

**Built:** resources, reservations, conflict prevention, availability, search and filters, dashboard, authentication with roles, alternatives when a slot is taken, rescheduling in place, global booking rules (hours and maximum duration), automated tests, CI and deployment.

**Deliberately left out, and why:**

| Left out | Reason |
|---|---|
| Self-registration | In an internal tool, accounts are normally provisioned by an admin; open sign-up would be a security downside |
| Password reset and email notifications | Need an email service and secrets; not core to the scheduling problem |
| Full calendar view | The day timeline already answers availability; a calendar adds cost without new capability |
| Recurring bookings, approval workflows | Not in the scenario; each adds significant rules and edge cases |
| Per-resource opening hours | Global rules cover the scenario; per-resource rules need a schema change and admin UI |

---

## ⚖️ 6. Key design decisions and trade-offs

**Preventing overlaps (the central decision)**

| Option | Assessment |
|---|---|
| Check, then insert | Simple, but two simultaneous requests can both pass the check |
| Serializable transactions with retries | Correct, but every code path must remember to use it |
| Locks per resource | Correct, but again relies on application discipline |
| **Exclusion constraint (chosen)** | Atomic, index-backed, and enforced for every code path that writes to the table |

Trade-off: it is PostgreSQL-specific and can't be expressed in the Prisma schema, so it lives in a raw SQL migration and is covered by tests that bypass the application layer.

**Other decisions**

| Decision | Why |
|---|---|
| Three entities (User, Resource, Reservation) | Enough to model the scenario; no tables without a clear reason |
| Cancel and deactivate instead of delete | Preserves history and accountability; cancelled bookings free the slot |
| `timestamptz`, stored in UTC, shown in Sri Lanka time | Avoids server-timezone bugs |
| Business rules in a service layer | Testable without the UI; Server Actions stay thin |
| Authorization on the server | Hiding a button is not security |
| Simple custom authentication (bcrypt, signed HttpOnly cookie) | Small and fully explainable; limits listed below |
| Suggest alternatives on conflict | A rejection should lead to a next step, not a dead end |
| Rescheduling as an `UPDATE` | The same constraint protects it, with no extra logic |
| Global booking rules as constants | Cheap, testable, and explicit; easy to move into per-resource settings later |

---

## 🛠️ 7. Real-world operational challenges handled

- **Simultaneous requests** for the same slot: exactly one succeeds
- **Human error:** end before start, bookings in the past, inactive resources, 12-hour bookings, after-hours bookings
- **Back-to-back bookings:** a booking may start exactly when another ends
- **Cancellations and changes:** slots become available again immediately; rescheduling keeps the history
- **Permissions:** members can't change others' bookings or manage resources
- **Failure states:** an error page when the database is unreachable, empty states, validation messages

---

## ✔️ 8. Verification

- 31 automated tests: overlap variants, back-to-back, cancellation, validation, booking rules, permissions, alternatives, rescheduling
- Tests that bypass the application layer to prove the database enforces the rule
- A test firing 8 simultaneous requests at one slot (1 wins, 7 receive clean conflict errors)
- A CI pipeline that runs lint, type-check, the tests and the build on every push
- Manual walkthrough of every user role, plus a time zone check (stored UTC, shown Sri Lanka time)

---

## ⚠️ 9. Limitations and next steps

| Limitation | Planned next step | Priority |
|---|---|---|
| Booking rules are global, not per resource | Per-resource opening hours and maximum duration | High |
| No self-registration, password reset or login rate limiting | Admin-created accounts or SSO, then reset and throttling | Medium |
| Day timeline only | Calendar view | Medium |
| No notifications | Email or chat reminders | Low |

---

## 🏁 10. Outcome

| Before | After |
|---|---|
| Chats and manual records | One system of record |
| Overlaps found after the fact | Overlaps rejected at the database, with alternatives offered |
| "Is the room free?" means asking around | Dashboard and timeline show it |
| Changing a booking means starting over | Reschedule in place, with the same protection |
| No record of who booked what | Every booking has an owner and a purpose |

---