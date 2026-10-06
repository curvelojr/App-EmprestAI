<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Game cover photos live in a private storage bucket; `games.cover_url` stores the storage path and the UI resolves signed URLs (public buckets are blocked by workspace policy).
- Other users' profile data is exposed only through security-definer RPCs returning safe columns (no street address/email); `profiles` RLS is owner-only.
