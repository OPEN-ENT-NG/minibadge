/**
 * The AngularJS source rendered `descriptionShort`/`description` as HTML
 * (`bind-html`, per `badge-type.html`) — real badge type descriptions can
 * therefore contain markup (`<p>`, `<strong>`, ...). This app deliberately
 * never renders that markup via `dangerouslySetInnerHTML` (reserved for the
 * app's own fixed i18n bundle text, not admin-authored content — see
 * `routes/badge-type-detail`'s doc comment), so displaying it as plain text
 * would otherwise show the literal tags to the user. This strips them
 * instead of rendering them, replacing each with a space (so concatenated
 * block tags like `<p>A</p><p>B</p>` don't glue into "AB") then collapsing
 * the resulting whitespace.
 */
export function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
