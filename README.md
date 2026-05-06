# Eventful — Step‑by‑Step Usage Guide

This guide walks through the main end‑to‑end flow of the application, showing how an event goes from being published to checked in at the venue.

The four core steps are:

**Publish → RSVP → Ticket → Check‑in**

---

## Live demo

The project is deployed and available at:  
👉 **https://eventful-dyshynskaya-yauheniya.lovable.app/**

> ⚠️ **Important:**  
> Please use a **VPN** when opening the demo link above.  
> Without a VPN, the application may not load.

---

## Demo credentials

You can use the following demo accounts to explore the app:

- **Host account**  
  Email: `demo-host@example.com`  
  Password: `DemoPass123!`

- **Attendee account**  
  Email: `demo-attendee@example.com`  
  Password: `DemoPass123!`

---

## 1. Publish an Event (Host)

### Create your Host profile
1. Sign in using the **host demo account**.
2. Open **My account**.
3. Click **Become a host** and fill in:
   - Host name
   - Logo (optional)
   - Short bio
   - Contact email
4. Submit the form to create your Host profile.

### Create and publish an event
1. Open **Host dashboard**.
2. Click **New event**.
3. Fill in the event details:
   - Title and description
   - Start and end date/time (with time zone)
   - Location (address or online link)
   - Capacity
   - Cover image
4. Choose visibility:
   - **Public** — discoverable on Explore
   - **Unlisted** — accessible by direct link only
5. Save the event (it starts as **Draft**).
6. Click **Publish** to make the event live.

Once published, the event becomes available for RSVPs.

---

## 2. RSVP to an Event (Attendee)

### Discover events
1. Sign in using the **attendee demo account**.
2. Open the **Explore** page.
3. Browse or filter events by:
   - Text search
   - Date range
   - Location
4. Click an event card to open its details page.

### Confirm attendance
1. On the event page, click **RSVP**.
2. RSVP result:
   - If capacity is available → status becomes **Confirmed**
   - If the event is full → you are added to the **Waitlist**

If a confirmed attendee cancels later, the first person on the waitlist is automatically promoted.

---

## 3. Receive and Use Your Ticket

### View your ticket
1. After a confirmed RSVP, a ticket is issued automatically.
2. The ticket appears:
   - On the **Event page**, or
   - On the **My Tickets** page.

### What the ticket includes
- Event name, date, and location
- A unique **QR code**
- A readable ticket code
- Issue timestamp

### Optional actions
- Click **Add to Calendar** to download an `.ics` calendar file.
- Click **View event** to return to the event page.
- Click **Cancel RSVP** if your plans change (this frees a seat and may promote someone from the waitlist).

---

## 4. Check‑in at the Event (Host / Checker)

### Open the check‑in page
1. Sign in as a Host (or an invited Checker).
2. Open the event from the **Host dashboard**.
3. Click **Check‑in**.

### Verify tickets at the door
1. Ask the attendee for their ticket QR code or ticket code.
2. Enter the ticket code manually in the check‑in field.
3. Submit the code.

### What happens on check‑in
- The ticket is marked as checked in.
- The check‑in time is recorded.
- Live counters update instantly:
  - Confirmed attendees
  - Checked‑in attendees

### Undo (if needed)
- Use **Undo last check‑in** to revert the most recent scan in case of a mistake.

---

## Summary

- **Hosts** publish events and manage attendance.
- **Attendees** RSVP, receive tickets, and show them at the venue.
- **Tickets** provide secure entry using unique QR codes.
- **Check‑in** ensures accurate attendance tracking with live updates.

This flow demonstrates how Eventful supports free community events end‑to‑end — from discovery to entry.
