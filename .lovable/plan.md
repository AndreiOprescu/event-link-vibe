## Problem found

The recorder can create a video locally, but saving fails before anything reaches storage.

The live storage rules include an old policy named `event_media_insert_own` that checks uploads by casting the second folder segment to a UUID:

```text
intros/{eventId}/{userId}/{timestamp}.webm
       ^ eventId is text like e1, not a UUID
```

That cast fails for event IDs such as `e1`, blocking the upload even though the newer intro-specific policy is correct. I also confirmed there are currently no saved `intros/...` files in storage and the recent `event_members` rows still have no `intro_video_url`.

## Fix plan

1. **Fix the storage policy**
   - Add a migration to remove the broken legacy `event_media_insert_own` policy.
   - Keep the existing correct intro upload policy: users can upload only under `intros/{eventId}/{theirUserId}/...`.
   - Keep the existing read policy so saved videos can play in the event screen.

2. **Harden the recorder save flow**
   - Keep uploading to `event-media/intros/{eventId}/{userId}/...`.
   - After upload succeeds, update the user’s `event_members` row for that specific `event_id`.
   - Add a safe fallback `upsert` for that same `(user_id, event_id)` membership row so saving still works if the row was not present or was stale.
   - Surface the real save error in the console as well as the toast so future failures are diagnosable.

3. **Improve playback reliability**
   - Add `preload="metadata"` to saved intro videos in the profile drawer and recorder preview.
   - Keep the existing large video placement under the user’s name and profile picture.

4. **Verify**
   - Confirm the bad policy is gone.
   - Confirm recording creates a new `intros/...` storage object.
   - Confirm `event_members.intro_video_url` is populated for that user and event.
   - Confirm clicking the avatar opens the drawer and plays the saved video.