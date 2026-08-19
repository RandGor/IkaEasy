# Privacy Policy for IkaEasy V4

Last updated: August 19, 2026

IkaEasy V4 is an independently maintained browser extension that enhances the
interface of the Ikariam browser game. This policy explains what information
the extension handles, why it is needed, where it is stored, and when it may be
sent to third-party services.

## Information handled by the extension

While the user is playing Ikariam, IkaEasy V4 may process information available
on Ikariam pages and in Ikariam responses, including:

- Ikariam server, world, avatar, player, alliance, city, and island identifiers;
- city names and coordinates;
- buildings, resources, research, Workshop upgrades, military units, spies,
  movements, construction, recruitment, and other game timers;
- battle reports and diplomacy-message content when the related features are
  opened or used;
- extension settings, notification state, and locally cached Empire overview
  data;
- an email address, support message, and diagnostic game data only when the
  user chooses to submit the built-in support form;
- an Anti-Captcha API key and captcha image only when the user configures and
  uses the optional Anti-Captcha feature.

IkaEasy V4 does not request or process health information, real-world financial
information, physical location, or general browsing history. It does not track
activity on websites unrelated to Ikariam and the explicitly listed integration
services.

## Local storage

Most information is processed locally in the browser. Settings, cached game
state, timers, synchronization state, and notification state may be stored in
Chrome extension storage or browser local storage. This information is used to
provide the extension's visible features and is not used for advertising or
profiling.

Locally stored information remains until it expires, is replaced, or the user
clears the relevant browser or extension data.

## External services and data transfers

IkaEasy V4 uses encrypted HTTPS connections for its external integrations.
Gameforge, IkaLogs, Anti-Captcha, GitHub, Clip2net, and YouTube are independent
services and are not operated by RandGor.

### Gameforge and Ikariam

The extension reads data from the Ikariam pages selected by the user and sends
game actions to the same Ikariam world as necessary to provide its interface
and management features. These requests are handled by Gameforge under its own
terms and privacy practices.

### IkaLogs

IkaEasy V4 integrates with `ikalogs.ru`. Depending on the feature being used,
the extension may:

- check the user's existing IkaLogs authentication status;
- exchange Ikariam server, world, island, mine, city, player, and alliance map
  information for the map and island features;
- send battle-report data when the user chooses to save a report to IkaLogs;
- send the contents of the support form, optional email address, and optional
  diagnostic game data when the user submits that form.

These features may use the user's existing IkaLogs session cookies. Information
received by IkaLogs is subject to IkaLogs' own data-handling practices.

### Anti-Captcha

If the user enters an Anti-Captcha API key, the API key and captcha image are
sent to `api.anti-captcha.com` to obtain a solution when a supported Pirate
Fortress captcha appears. This integration is optional and is not used without
a configured key.

### GitHub

The extension contacts `api.github.com` to check the official RandGor/IkaEasy
repository for newer releases. IkaEasy V4 does not intentionally include
Ikariam account or game data in these requests.

### Clip2net

When an Ikariam diplomacy message contains a Clip2net link, the extension may
request the linked Clip2net page to display an image preview. The request is
made only for a link already present in the viewed message.

### YouTube

The optional Cinema feature embeds the video supplied by Ikariam using the
YouTube player. Loading the player connects the browser to YouTube, whose own
privacy terms apply.

## Sale, advertising, and unrelated use

IkaEasy V4 does not sell user data. It does not use or transfer user data for
personalized advertising, creditworthiness, lending, or purposes unrelated to
the extension's disclosed Ikariam features. Human access is limited to
information deliberately submitted for support, security or legal obligations,
or information handled by the third-party services described above.

The use of information received from Chrome APIs adheres to the Chrome Web
Store User Data Policy, including the Limited Use requirements.

## User choices

Users can disable individual IkaEasy features in the extension settings, avoid
configuring Anti-Captcha, avoid submitting battle reports or support requests,
and clear locally stored extension or site data through the browser.

## Changes to this policy

This policy may be updated when extension functionality or data practices
change. Material changes will be documented in the repository and, when
required, disclosed through the extension or its Chrome Web Store listing.

## Contact

Questions about this policy can be submitted through the
[official IkaEasy V4 issue tracker](https://github.com/RandGor/IkaEasy/issues).
Do not include passwords, API keys, session cookies, or other secrets in a
public issue.
