SAVE THE DATE — PROJECT MANUAL

PURPOSE
This is a separate Save the Date / initial attendance survey, not the formal RSVP.
It uses a short, interactive click/tap experience instead of a long scrolling page.

FILES
index.html — scene structure. Normally leave this alone.
css/style.css — layout, typography, spacing, responsive behavior and animations.
js/wedding-data.js — MAIN EDITING FILE: couple names, dates, messages, hashtag, Google URL and ALL main colors.
js/app.js — functionality: scenes, countdowns, guest-code verification, attendance logic and submission.
assets/images/ — place future images/assets here.

COLOR CONTROL
All main colors are centralized in wedding-data.js under SAVE_THE_DATE.theme.
Examples:
mainBackground = main page background
cardBackground = card background
cardAlt = inner/countdown card shade
accent = main green
gold = champagne/gold accent
primaryText = main text
secondaryText = secondary text

Change HEX values there instead of hunting through CSS.

COMMON EDITS
Names: SAVE_THE_DATE.couple
Wedding display date: SAVE_THE_DATE.wedding.date
Wedding countdown: SAVE_THE_DATE.wedding.dateTime
Survey deadline display: SAVE_THE_DATE.survey.deadline
Survey deadline countdown: SAVE_THE_DATE.survey.deadlineTime
Hashtag: SAVE_THE_DATE.survey.hashtag
Main message: SAVE_THE_DATE.survey.message
Not-sure explanation: SAVE_THE_DATE.survey.unsure
Google Apps Script URL: SAVE_THE_DATE.googleScriptUrl

SURVEY RULES
YES = estimated attendance is selected and counted.
NO = estimated attendance is 0.
NOT SURE = estimated attendance is 0 and seats are treated as unavailable for planning; guest must contact the couple later to check availability.
This is not the formal RSVP.

TEST GUESTS
During visual development, app.js contains six temporary test guests:
TEST-0001 through TEST-0006.
Once the Google Sheet connection is ready, use the real Apps Script verification instead.

CURRENT STATUS
DONE:
- New project from scratch
- Cinematic black opening and motif reveal
- Click/tap scene navigation
- Large wedding countdown
- Personal guest-code screen
- Guest allocation display
- Yes / No / Not Sure flow
- Preliminary headcount
- Small deadline countdown
- Centralized theme colors
- Responsive mobile layout
- Reduced-motion fallback
- README/manual

REMAINING:
1. Duplicate the original Google Sheet for Save the Date.
2. Create/connect the Save the Date Apps Script.
3. Deploy the Web App.
4. Put the Web App URL into wedding-data.js.
5. Test all six guest allocations.
6. Test YES / NO / NOT SURE against the live sheet.
7. Finalize code reuse/one-time-use rules for Save the Date.
8. Add real contact details.
9. Final visual polish.
10. Hosting/publishing.
11. Replace test guests with real guest data.

QUICK GUIDE FOR FUTURE CHATGPT HELP
This project is a Save the Date interactive attendance survey for Jovannie & Shenalyn.
It is intentionally separate from the formal RSVP.
The intended flow is:
black opening → motif reveal → Save the Date → couple/date → large countdown → message → personal code → guest allocation → attendance choice → preliminary headcount → confirmation → small deadline countdown → closing.

If the user asks to change CONTENT or COLORS, prefer wedding-data.js.
If the user asks to change APPEARANCE/LAYOUT, use style.css.
If the user asks to change FUNCTIONALITY, use app.js.
Do not modify survey functionality casually once the Google Apps Script is connected.
