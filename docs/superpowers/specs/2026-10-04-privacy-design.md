# Privacy hardening and controls: design

Date: 2026-10-04 · Status: approved by the owner · Sub-project 1 of 4 (then personalised feed, try-on, planner v2)

## Why
An audit of the app and the database (2026-10-04) found five real leaks and no Instagram-level controls:

- **A. Location and metadata.** `Compose.tsx` sends exact GPS; the server rounds it to 0.005° (about 550 m), always in the same cell. Photos keep EXIF and GPS (`MediaSlot` asks for `exif: true`, and `upload.ts` sends the original bytes). Videos keep their metadata.
- **B. Profiles.** Every column of `profiles` is readable by every member. `city` is readable even with "show my city" off, and so are `identity_status`, `lang` and `deleted_at`.
- **C. Blocks.** They hide posts, comments, stories and new messages, but not profiles, listings, follower lists or booking. The app only knows who *I* blocked.
- **D. Export and deletion.** `export_my_data()` misses messages, follows, likes, stories, highlights, boards, blocks, offers, favourites, entitlements and business details. Closing an account leaves `business_details`, entitlements, offers and several profile fields, and swallows `close_member_social` errors.
- **E. Files.** Deleting a post or story never deletes its files. Highlights accept any path in the member's folder, so unmoderated media can be pinned.

Missing compared with Instagram and TikTok: a private account with follow requests, mute, restrict, message requests and "who can message me", comment controls, hidden words, hiding like counts, turning off message previews in pushes, and hiding read receipts from strangers.

## Decisions
| Topic | Decision |
|---|---|
| Private account | **Dropped on 2026-10-05: every account is public.** Following is instant, and posts, highlights and follower lists are visible to every member who isn't blocked. Stories stay followers-only, as they were before this work. Migration 034 locks `profiles.is_private` to false. The follow-request machinery from 029 stays in the database but never triggers, and the app shows no private-account UI. |
| Messages | "Who can message me": everyone (default), people I follow, or nobody. A first message from someone I don't follow lands in **Requests**: no push, no read receipt, and the sender isn't told. Conversations about a listing, offer or rental always arrive directly. |
| Interaction controls | Mute (posts and/or stories), restrict, who can review/comment (everyone, followers or nobody, per account and per post), hidden words, hide like counts (per account and per post). |
| Deletion | A 30-day bin ("Récemment supprimé") for posts and stories. Purged rows and files are gone. Expired stories are purged 30 days after expiry unless they are in a highlight. |
| Age | 18+. A required checkbox at sign-up stores `adult_confirmed_at`; no birth date is stored. Legal texts say 18+ everywhere. |

## Approach
Every rule lives in Postgres: RLS policies, column grants and security-definer RPCs. One helper decides social visibility:

```
can_view_social(viewer uuid, owner uuid) returns boolean
  = viewer = owner
    or ( not blocked_between(viewer, owner)
         and owner's profile not deleted
         and ( not owner.is_private
               or exists accepted follow viewer -> owner ) )
```

The app mirrors these rules only in demo mode and for UI states (lock screen, "Demandé" button). Rejected alternatives: filtering in the app, which anyone can bypass through the API, and a separate privacy service, which adds moving parts for no gain.

## Data: migration `029_privacy.sql`

### Profiles
- **New columns:**
  - `is_private bool default false`
  - `hide_like_counts bool default false`
  - `comment_policy text check (everyone|followers|nobody) default 'everyone'`
  - `message_policy text check (everyone|following|nobody) default 'everyone'`
  - `adult_confirmed_at timestamptz`
- **Column grants:** revoke table-wide `select` from `authenticated` and `anon`, then grant only public columns:
  - id, username, display name, avatar, bio, created_at, certified, `pro_until`, `account_type`, `business_verified`, `business_name`, `vacation`, `is_private`, `hide_like_counts`.
  - Not granted: `city`, `show_city`, `identity_status`, `lang`, `deleted_at`, `comment_policy`, `message_policy`, `adult_confirmed_at`.
- **New reads:**
  - `my_profile()` (security definer) returns my full row.
  - `profile_card(p_id)` returns public columns, `city` only when `show_city`, follower and following counts, my follow status (`none|pending|accepted`), whether they follow me, and `can_view_social`. For blocked pairs it returns only id and username plus `blocked = true`.
- **Implementation check:** every `from('profiles').select(...)` in the app must name only granted columns. `select('*')` would fail, so the implementation plan lists and fixes each call.

### Follows
- `follows.status text check (accepted|pending) default 'accepted'`. A before-insert trigger sets `pending` when the target is private.
- `answer_follow_request(p_follower uuid, p_accept bool)`: accept updates the row, decline deletes it. Both add an activity entry and a social push (template `social_follow_request` and `social_follow_accepted`).
- Turning `is_private` off accepts every pending request (trigger on profiles).
- Follower and following counts and lists only count `accepted`. The lists are readable only when `can_view_social(auth.uid(), owner)`, and every row involving a blocked pair is hidden.

### Social policies rewritten with `can_view_social`
- **posts** (also `distribution = 'public'` and `deleted_at is null`, except for the owner)
- **stories** (followers only, which now means accepted follows; not deleted)
- **story_highlights**
- **post_comments, post_likes, comment_likes, reposts** (through the parent post)
- **activity:** `my_activity()` skips pending follows, except in the new requests section.
- **feeds:** `posts_near()` applies the same check.

### Blocks extended
- **Listings:** the select policy adds `not blocked_between(auth.uid(), owner_id)` for everyone except the owner.
- **Booking:** `book_rental` and `make_offer` raise `blocked`.
- **Favourites:** inserting a favourite of a blocked member's listing fails.
- **Profiles:** `profile_card` for a blocked pair returns the minimal card. The app shows "Ce compte n'est pas disponible".
- **Message history** stays readable after a block. This is deliberate: it is evidence for reports. The conversation is frozen, though: no new messages, which the existing 019 rule already enforces.

### Mute
- `member_mutes(muter, muted, mute_posts bool, mute_stories bool, created_at)`, with RLS limited to the muter.
- It changes only the muter's feeds and story tray: the app filters it, and `posts_near` and the later `feed_for_you` exclude it. The muted member is never told.

### Restrict
- `member_restricts(restrictor, restricted, created_at)`, with RLS limited to the restrictor.
- **Comments:** new comments by a restricted member on the restrictor's posts get `visibility = 'author_only'`.
- **Messages:** new conversations they start go to Requests.
- **Read receipts:** they never see the restrictor's read receipts.

### Comments (reviews) policy and hidden words
- **`post_comments.visibility`:** `text check (public|author_only) default 'public'`. RLS shows `author_only` rows only to their author. The post owner sees them only in a "Avis masqués" list (`my_hidden_comments()`), and can approve one back to public.
- **`posts.comment_policy`:** null means the profile default is used. An insert trigger refuses with `comments_closed` when the effective policy is `nobody`, or `followers_only` when it is `followers` and the writer is not an accepted follower.
- **Hidden words:** `member_hidden_words(member_id, word)`, plus `profiles.hide_default_words bool default true`, which turns on a built-in FR/EN list of insults and slurs (an immutable SQL function). A before-insert trigger normalises the text (lower case, no accents) and sets `author_only` on a match against the post owner's words.

### Like counts
- `posts.hide_like_count bool` (null means the profile default). It is a display preference, not a secret, as on Instagram: the app hides the number from everyone but the owner and shows "Aimé par X et d'autres". The column stays readable.

### Messages: requests, previews, read receipts
- **`conversations.a_state` / `b_state`:** `text check (accepted|pending) default 'accepted'`.
- **Recipient state in `start_conversation`:**
  - **accepted** when the conversation is about a listing, offer or rental, or when the recipient follows the sender;
  - **pending** when `message_policy = 'everyone'` and neither of the above holds, or when the sender is restricted;
  - refused with `messages_closed` when `message_policy = 'following'` or `'nobody'` and neither of the above holds.
- **While pending:**
  - **Push:** the worker sends no push for it (`notify_social` checks the state).
  - **Read receipts:** the other side's read time is not exposed. Read times are not exposed to members at all for now (the app shows none); a receipts RPC can come later.
  - **Inbox:** the conversation shows only under "Demandes".
- **RPCs:** `accept_message_request(conv)` and `decline_message_request(conv)`. Decline hides the conversation for the recipient and the sender's new messages are silently dropped (stored, never shown or pushed to the recipient). Both are idempotent.
- **`member_preferences.push_previews bool default true`:** when false, the worker sends "Nouveau message" with no text.

### Soft delete and file purge
- **Columns:** `posts.deleted_at` and `stories.deleted_at`. `deletePost`/`deleteStory` in the app set it; policies hide those rows from everyone but the owner.
- **RPCs:** `restore_post(id)` and `restore_story(id)` work within 30 days. `my_recently_deleted()` lists them.
- **Purge job (worker, daily via pg_cron):** it selects rows where `deleted_at < now() - 30 days`, or stories where `expires_at < now() - 30 days` and the story is not in a highlight. It then:
  - deletes their storage objects through the Storage API (service role);
  - deletes the rows.
- **Exception:** a row with a moderation notice that is open, under appeal, or decided less than 6 months ago (DSA art. 20 appeal window) is skipped until that window closes.
- **Highlights:** add `story_highlights.story_ids uuid[]` holding owned, published, not-deleted stories (checked by a trigger). The `paths` are derived for reading. The migration maps existing paths to story ids and drops entries that match no story. `paths_in_own_folder` is removed.

### Location
- **Grid:** widened to 0.01° (about 1.1 km north–south, 0.75 km east–west in Paris) in `posts_coarsen_area` and the app's `coarsen()`. The migration re-coarsens existing rows.
- **Phone:** `Compose.tsx` sends `coarsen(pos.coords)`; the exact position never leaves the phone.

## App changes (FR, EN, ES; demo mode mirrors each rule)
- **Media:**
  - `MediaSlot` stops asking for `exif: true`. It keeps make, model and software as separate signals for moderation, read before re-encoding.
  - Before upload, images are re-encoded with `expo-image-manipulator` (JPEG 0.9), which drops all metadata.
  - Videos are unchanged in Expo Go. That residual risk is written into `docs/legal` and the privacy text, and is fixed in the dev build.
- **Settings › Confidentialité** (rebuilt with `ui/Flat.tsx`):
  - Compte privé.
  - **Interactions:** Messages (who + Demandes), Avis (who + Mots masqués + Avis masqués), J'aime (masquer).
  - **Comptes:** en sourdine, limités, bloqués.
  - **Contenu:** Récemment supprimé.
  - **Données:** Télécharger mes données, plus "Qui voit quoi", rewritten to be accurate.
  - "Afficher ma ville" stays.
- **Profile** (`ui/ProfileView.tsx`):
  - **Private, viewer not accepted:** a lock block reading "Ce compte est privé. Abonne-toi pour voir ses posts." The listings tab stays.
  - **Follow button:** S'abonner, then Demandé (tap to cancel), then Abonné·e.
  - **Blocked:** "Ce compte n'est pas disponible".
- **Activity:** a "Demandes d'abonnement" row opens a list with Accepter and Refuser.
- **Messages:** a "Demandes (n)" entry at the top of the inbox. A request thread shows Accepter, Refuser and Bloquer, and no read receipt.
- **Menus:** the `…` on a post or profile gets Mettre en sourdine (posts / stories), Limiter, Bloquer and Signaler.
- **Composer:** advanced options "Masquer le nombre de j'aime" and "Qui peut laisser un avis".
- **Onboarding:** a required 18+ checkbox on the account step. It is saved to `adult_confirmed_at` at sign-up, and Apple/Google users see it on the username prompt.
- **Export:** the shared JSON file is deleted from the cache after the share sheet closes.

## Export and account closure
- **`export_my_data()`** adds:
  - conversations and messages;
  - follows (both directions, with status), likes, comment likes, reposts;
  - stories and highlights, boards and items;
  - blocks, mutes, restricts, hidden words;
  - my reports, offers, favourites, entitlements and `business_details`;
  - media as signed URLs valid 7 days, generated by the `account` function.
- **Closure** is one call, `close_member_account` (with `close_member_social` inside the same transaction), and an error aborts it. It:
  - deletes `business_details`, offers, favourites, mutes, restricts, hidden words, follow requests and `member_entitlements`;
  - nulls `city`, `bio`, `business_name`, `pro_until`, `vacation`, `lang`, `identity_status` and `adult_confirmed_at`;
  - keeps `iap_events` with the user id replaced by a random pseudonym, for accounting;
  - wipes storage folders recursively with pagination;
  - unlinks Apple/Google identities through the Admin API.
- Messages stay pseudonymised, as today (013).

## Legal texts
In `docs/legal/` and `mobile/src/data/legalContent.ts`:
- 18+ everywhere;
- processors add RevenueCat and Expo (push tokens and previews);
- remove "phone and full name collected" (the phone number is only in a delivery address);
- remove analytics;
- describe each control above;
- add the 30-day bin;
- add the video-metadata residual risk.

## Out of scope
Close Friends, an activity-status feature, people tagging and @mentions (they don't exist yet), and server-side video stripping (dev build).

## Testing
- **SQL tests:** one rolled-back `do $$ … raise exception 'RESULT %'` block per rule, using throwaway users:
  - a private account hides posts, stories, highlights and follower lists from a non-follower, while its listings stay visible and bookable;
  - pending, then accept, then visible; turning private off accepts pending requests;
  - a block hides the profile card, listings, booking, favourite and follow lists in both directions;
  - mute changes nothing for the muted member;
  - restrict and hidden words make a comment `author_only`, visible only to its author and in the owner's hidden list;
  - comment policy `nobody` / `followers` refuses correctly;
  - the per-post like-count setting falls back to the profile default;
  - a stranger's message is pending, with no push row; listing conversations arrive accepted; `following` / `nobody` refuse;
  - a deleted post is invisible to others, restorable, and purge-eligible after 30 days, but not under an open notice;
  - a highlight refuses another member's story or a deleted one;
  - the `profiles` column grants hide `city` and `lang` from other members;
  - export contains every listed key; closure removes `business_details` and entitlements.
- **Checks:** `get_advisors` (security) shows no new warnings.
- **App:** `npx tsc --noEmit` is clean. In the browser preview's demo flows at mobile size, check:
  - the private profile lock;
  - Demandé;
  - the Demandes inbox;
  - mute and restrict from a post menu;
  - Récemment supprimé restore;
  - the 18+ checkbox.
