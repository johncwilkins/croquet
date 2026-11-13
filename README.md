# Croquet Club

3D croquet for desktop and mobile, with Golf Croquet, Association (club rules), and Nine-Wicket Backyard modes. Includes three settings, computer or local play, natural-wood mallets, tactical AI, a yard ruler, and precision desktop power control.

## Play and publish

The `docs/` folder is the ready-to-publish game. In repository **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/docs**, then **Save**. Publishing is public.

The `dist/` folder contains the same source assets. No build step, API key, or server is required. Serve either folder with a local static web server to develop.

## Checks

Run with Node.js:

```sh
node tests/scoring.mjs
node tests/tactics.mjs
node tests/variants.mjs
node tests/shot-control.mjs
```

The in-game Help describes each ruleset and the club-play simplifications.
