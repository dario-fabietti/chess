# Opening Explorer, opening practice & master games

*Paywall: free users see only the first 4 moves deep; full depth from Gold.*

## 1. What the paid feature is

- **Opening Explorer**: browse any opening tree with move statistics
  (frequency, W/D/L) and named openings; free accounts are cut off at
  4 moves deep, premium goes unlimited
  ([membership matrix](https://support.chess.com/en/articles/8562418-what-does-each-level-of-premium-membership-get-me)).
- **Master games in Game Review / analysis**: list of relevant master games
  reaching the current position
  ([Game Review docs](https://support.chess.com/en/articles/8584089-how-does-game-review-work)).
- **Openings practice**: play the engine from a chosen opening position to
  test your handling of it; **Master Games practice**: play out classic
  positions "as" Capablanca/Morphy/Carlsen
  ([features guide](https://www.chess.com/article/view/chesscom-features)).
- **Opening Insights**: your own opening repertoire stats (covered in
  [insights-analytics.md](insights-analytics.md)).

## 2. Replication

The data problem is already solved in the open:

1. **Openings names/ECO**: Lichess's
   [chess-openings](https://github.com/lichess-org/chess-openings) (CC0
   TSV, ~3.5k named lines). Bundle it (~100 KB) → name the current opening
   live, tag Book moves, group Insights by opening.
2. **Explorer statistics**, two options:
   - *Online*: Lichess's **free, keyless Opening Explorer API**
     (`explorer.lichess.ovh` — masters DB, full Lichess DB filtered by
     rating band, or a specific player). One fetch per position; cache
     locally. Needs network, which breaks our offline-first rule — make it
     an optional online feature like the claude.ai hand-off.
   - *Offline*: precompute a book from Lichess's monthly PGN dumps
     (CC0): counts + results for the top ~100k positions, shipped as a
     few-MB JSON/binary. A Claude Code script can regenerate it.
   The rating-band filter of the Lichess API actually *beats* chess.com
   here: you can see what moves win **at your level**, which matches this
   project's ELO-relative philosophy.
3. **Master games list**: the masters endpoint of the same API returns the
   top games (players, year, result) per position; deep-linkable.
4. **Openings practice**: we already have FEN import + play-vs-engine;
   the feature is a curated list of starting FENs per opening + "start game
   here as White/Black". The trainer loop (engine plays the book's most
   popular reply instead of its own best move for the first N moves) needs
   the explorer data from step 2 — that's what makes it feel like opening
   *training* rather than engine sparring.
5. **Repertoire drill (spaced repetition)** — chess.com doesn't even do
   this well (it's Chessable's product): store the user's chosen lines,
   quiz the next move with the board, schedule failures sooner. All local,
   and Claude can explain the *why* behind each repertoire move on demand.
