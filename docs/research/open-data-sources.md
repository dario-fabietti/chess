# Open chess data sources — games, openings, puzzles, lessons

*Verified July 2026. Only reputable sources (Lichess, FIDE, Project
Gutenberg, Wikimedia, established community databases). Sizes/counts are
as published on the date above; approximations are marked ~.*

## 1. Game databases

| Source | Contents | Size / count | Format | License |
|---|---|---|---|---|
| [Lichess open database](https://database.lichess.org/) | Every rated Lichess game since 2013, monthly files | 6B+ games; recent months ~30 GB `.zst` each (~) | PGN (+ %eval/%clk comments where analysed) | **CC0** |
| [Lichess puzzle DB](https://database.lichess.org/#puzzles) | see §3 | | | CC0 |
| [Lichess evals DB](https://database.lichess.org/#evals) | **394,669,566** Stockfish-evaluated positions | one JSON per line, `lichess_db_eval.jsonl.zst` | FEN + PVs, depths, knodes | **CC0** |
| [The Week in Chess (TWIC)](https://theweekinchess.com/) | Professional OTB games, weekly since 1994 | ~2–5k games/week | PGN zips, free download | free for personal use (credit Mark Crowther) |
| [Lumbra's Gigabase](https://lumbrasgigabase.com/en/) | Curated OTB (10.3M+) + online 1800+ (7.2M+) games, weekly TWIC updates | ~18M games | PGN / Scid vs PC | free |
| [FICS games DB](https://www.ficsgames.org/) | Free Internet Chess Server games since 1999 | hundreds of millions | PGN by month/rating | free |
| [Chess.com PubAPI](https://support.chess.com/en/articles/9650547-published-data-api) | Any user's full game history | per user | REST JSON + monthly PGN: `api.chess.com/pub/player/{user}/games/{YYYY}/{MM}/pgn` | free, no auth, read-only |
| [Lichess API](https://lichess.org/api) | Any user's games, streamed | per user | NDJSON/PGN, `GET /api/games/user/{user}`; ~20 req/s, respect 429+1min | free, no auth for public data |

Notes: Caissabase was discontinued (~2025); Lumbra's Gigabase is its
practical successor. ChessBase Mega Database is the commercial reference
(~11M curated/annotated OTB games) — listed only for contrast, not usable.

## 2. Openings

| Source | Contents | Format | License |
|---|---|---|---|
| [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) | The canonical named-openings set (ECO A–E), used by Lichess itself | 5 TSV files (`a.tsv`…`e.tsv`): eco, name, pgn | **CC0** |
| [Lichess Opening Explorer API](https://lichess.org/api#tag/Opening-Explorer) | Position stats: `explorer.lichess.ovh/masters` (OTB master games), `/lichess` (online, filterable by **rating band** and speed), `/player` (one player's tree) | JSON per FEN/play params; free, keyless | free service |
| [eco.json](https://github.com/hayatbiralem/eco.json) | ECO codes as JSON (community mirror of the same idea) | JSON | MIT-ish, check repo |
| [Wikibooks Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory) | Move-by-move opening explanations (human prose per line) | wiki/HTML | **CC BY-SA 4.0** (attribution + share-alike) |

The `/lichess` explorer endpoint's rating-band filter ("what do 1200s play
here and how does it score") directly supports our ELO-relative philosophy —
chess.com's explorer can't do that.

## 3. Puzzles

| Source | Contents | Format | License |
|---|---|---|---|
| [Lichess puzzle DB](https://database.lichess.org/#puzzles) | **6,057,356** rated, theme-tagged puzzles (updated 2026-07-05) | one CSV (`.zst`): PuzzleId, FEN, Moves(UCI, first = opponent's), Rating, RatingDeviation, Popularity, NbPlays, Themes, GameUrl, OpeningTags | **CC0** |

That single file covers rated/custom/rush/daily modes offline (see
[puzzle-generation.md](puzzle-generation.md) §3 for a bundling strategy).
Chess.com's 500k puzzle set is proprietary — irrelevant given the above.

## 4. Lessons & instructional content (the scarce category)

No open equivalent of chess.com's 350-lesson library exists. What is
legitimately available:

| Source | Contents | License |
|---|---|---|
| [Project Gutenberg chess shelf](https://www.gutenberg.org/ebooks/subject/1677) | Classic instruction, notably Capablanca's **Chess Fundamentals** (1921) and Edward Lasker's **Chess Strategy** — still-taught fundamentals (opposition, basic endings, planning) | **Public domain** (US) |
| [Wikibooks: Chess](https://en.wikibooks.org/wiki/Chess) + [Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory) | Beginner course + per-line opening prose | **CC BY-SA 4.0 / GFDL** (dual) |
| Wikipedia chess articles | Concept reference (tactics, endgame theory, named games) | CC BY-SA 4.0 |
| Lichess Practice/Study content | Interactive drills exist on-site; **user studies belong to their authors** — don't scrape; the [lila](https://github.com/lichess-org/lila) practice positions are AGPL source | mixed — treat as not bundleable |

Implication (matches [lessons-learning.md](../chesscom/lessons-learning.md)):
lesson *content* is the one category we generate ourselves — Claude writes
lesson text against our per-ELO syllabus, engine-verifies challenge
positions, and PD/CC sources above can seed quotable explanations
(Capablanca's endgame examples are public domain and excellent).

## 5. Endgames — tablebases

| Source | Contents | Size | Access |
|---|---|---|---|
| Syzygy 3-4-5 men | perfect WDL+DTZ | **~7 GB** (290 files) | [mirrors incl. Lichess/sesse](http://tablebase.sesse.net/) |
| Syzygy 6 men | | ~150 GB | same |
| Syzygy 7 men | | ~17 TB | torrent/mirrors; impractical locally |
| [Lichess tablebase API](https://github.com/lichess-org/lila-tablebase) | up to 7-man lookups | — | `tablebase.lichess.ovh/standard?fen=…`, free, keyless |

For an endgame trainer: bundle nothing — call the free API when online, or
optionally let desktop users download the 7 GB 3-4-5 set.

## 6. Ratings & players

| Source | Contents | Format |
|---|---|---|
| [FIDE rating lists](http://ratings.fide.com/download_lists.phtml) | Full monthly rating list, all federations (STD/RPD/BLZ combined ≈ 47 MB) | TXT/XML, free |
| [Kaggle chess datasets](https://www.kaggle.com/datasets/rohanrao/chess-fide-ratings) | Historical FIDE snapshots, misc game sets | CSV, per-dataset license |

## 7. Quick-fetch reference

```sh
# openings names (CC0, ~100 KB total)
curl -LO https://raw.githubusercontent.com/lichess-org/chess-openings/master/{a,b,c,d,e}.tsv

# puzzle database (CC0, ~250 MB .zst → ~900 MB csv)
curl -LO https://database.lichess.org/lichess_db_puzzle.csv.zst

# one month of lichess games (CC0, large!)
curl -LO https://database.lichess.org/standard/lichess_db_standard_rated_2026-06.pgn.zst

# a user's chess.com games for a month (free, no key)
curl https://api.chess.com/pub/player/hikaru/games/2026/06/pgn

# a user's lichess games (NDJSON stream)
curl -H "Accept: application/x-ndjson" "https://lichess.org/api/games/user/DrNykterstein?max=300"

# explorer: what do ~1200s play after 1.e4, and how does it score
curl "https://explorer.lichess.ovh/lichess?variant=standard&speeds=blitz,rapid&ratings=1200&play=e2e4"

# tablebase probe
curl "https://tablebase.lichess.ovh/standard?fen=4k3/8/8/8/8/8/4P3/4K3%20w%20-%20-%200%201"
```

## 8. License summary for bundling decisions

| License | Sources | Can we bundle in this repo? |
|---|---|---|
| CC0 | Lichess games/puzzles/evals/openings | **Yes, unconditionally** |
| Public domain | Gutenberg classics (pre-1930 US) | Yes |
| CC BY-SA 4.0 | Wikibooks/Wikipedia prose | Yes with attribution + same-license for derived text |
| Free service, no license grant | explorer/tablebase APIs, PubAPI, TWIC, Lumbra, FICS | Use at runtime / personal use; don't redistribute dumps without checking |
| Proprietary | chess.com puzzles/lessons/videos, ChessBase | No |
