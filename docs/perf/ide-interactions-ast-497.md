# IDE interaction timings (AST-497)

Harness: `scripts/perf/ide-interactions.mjs`. It signs in a test student on code.beblocky.com and opens a learn page. Then it times three actions:

- **Run/Preview:** the preview refresh button, timed from click until two frames have painted. The preview iframe is sandboxed and cross-origin, so its DOM can't be read.
- **Next Step:** the harness clicks Back first, then times from the Next Step click until the slide text changes.
- **Save Code:** times from the Save Code click until the confirm dialog shows, then from Save until the dialog closes.

It also records long tasks. **No writes reach production.** Every non-GET call to `api.beblocky.com` is answered in the browser with `200 {}`. The calls intercepted were `PATCH students/:id/activity`, `PATCH progress/:id/complete-slide`, `POST progress` and `PATCH progress/:id/save-code`. Save timings therefore leave out the real write round trip. Going by earlier waterfalls, a real save adds about 0.4–0.8 s per serial API call.

The course was the test student's current learn page (Course 4, Introduction to CSS, slide 5/5), on 2026-10-12.

| Build | Learn → editor visible | Run/Preview | Next Step | Save: dialog / done | Long tasks |
|---|---|---|---|---|---|
| prod (ide.beblocky.com) | 5730–6385 ms | 46 ms | 25 ms | 34 ms / 817 ms | none |
| local prod build of main | 3836 ms | 65 ms | 27 ms | 37 ms / 487 ms | none |

Before this harness, run1/run2 reported `clicked null` for these actions.

## Verdict
- **Run/Preview: fine.** The rebuild takes under one frame budget and creates no long tasks.
- **Next Step: fine.** The slide changes in under 30 ms.
- **Save Code: acceptable, with one thing to watch.** The UI part is fast. `handleSaveCode` makes two calls one after the other, `ensureProgressId` (which can create progress) and then `save-code`, so a real save costs two API round trips. That comes to about 0.5–0.8 s with both calls mocked, plus network. No dedicated ticket is needed now. If saves feel slow in the field, the fix is to cache the progress id per lesson, which the page already does after the first save.

No follow-up tickets filed.
