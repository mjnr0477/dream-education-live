# Universal Connector: Reddit

Dream Education supports Reddit publishing and authorized private messages through Reddit's official OAuth API. This connector is disabled until the server environment contains the required credentials and at least one configured target.

## Direct setup links

- Create/manage a Reddit API app: https://www.reddit.com/prefs/apps
- Reddit API reference: https://www.reddit.com/dev/api/
- Reddit developer platform and API migration information: https://developers.reddit.com/app-registration

Create an app whose redirect URI matches the OAuth callback used to obtain your refresh token. Use OAuth scopes appropriate to your actions:
- `submit` for posting to subreddits.
- `privatemessages` for sending private messages.

Use a permanent OAuth authorization so Reddit returns a refresh token. Reddit may require app registration/approval or impose limits under its current developer policies.

## Server environment variables

Set these on the server host (for example, Render), never in browser JavaScript or public source files:

- `REDDIT_CLIENT_ID`: app client ID.
- `REDDIT_CLIENT_SECRET`: app secret.
- `REDDIT_REFRESH_TOKEN`: OAuth refresh token authorized for the required scopes.
- `REDDIT_USER_AGENT`: descriptive application/version and contact or Reddit account, for example `web:dream-education:1.0 (by /u/your_reddit_username)`.
- `REDDIT_BROADCAST_SUBREDDITS`: comma-separated subreddit names for posts, for example `learnprogramming,education`. Check each community's rules before posting.
- `REDDIT_MESSAGE_TO`: optional comma-separated usernames for messages. This should only contain intended recipients; do not use it for unsolicited bulk messaging.

The connector refreshes an access token for each send, posts self-text submissions using the official API, and sends private messages only to explicitly configured recipients. Successful API responses are reported as successful; API errors are returned to the caller.

## Quora

Quora does not provide a generally available official public API for automated posting or private messaging. Dream Education must not claim Quora is connected until Quora offers an authorized API or another approved integration is available. Do not use undocumented private endpoints or browser-session scraping as an API substitute. A separate manual-draft workflow can prepare content for the user to publish on Quora themselves.
