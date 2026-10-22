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

## Architecture rules
- Roles live in `public.user_roles` (enum `app_role`); checks use `has_role`/`is_manager` security-definer functions — prevents privilege escalation.
- Public sign-up is disabled. The first account (Super Admin/owner) comes from the one-time `setupOwner` server fn, which works only while no owner exists; every other account is created by owner/admin via `src/lib/staff.functions.ts` (admin client, server-verified).
- Signed-in pages live under `src/routes/_authenticated/`; nav visibility in `AppShell` is cosmetic, RLS + server checks enforce access.
- Department, settings and profile changes are audited by the `audit_change` DB trigger into `audit_logs`.
