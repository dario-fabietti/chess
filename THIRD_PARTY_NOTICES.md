# Third-party notices

This repository bundles the following third-party components so the app can
run fully offline. Each keeps its original license.

## Stockfish 18 (Lite, WebAssembly build)

- Files: `vendor/stockfish/stockfish-18-lite-single.js`,
  `vendor/stockfish/stockfish-18-lite-single.wasm`
- Source: the [`stockfish` npm package](https://www.npmjs.com/package/stockfish)
  v18.0.8 (stockfish.js by Chess.com / nmrugg), building
  [official Stockfish](https://github.com/official-stockfish/Stockfish) 18
  with the small ("lite") NNUE network, single-threaded.
- License: **GNU GPL v3** — full text in `vendor/stockfish/LICENSE.txt`.
  Distributing this app as a whole is subject to the GPLv3.

## chess.js

- Files: `vendor/chessjs/chess.js` (v1.4.0, ESM build)
- Source: <https://github.com/jhlywa/chess.js>
- License: **BSD-2-Clause** — full text in `vendor/chessjs/LICENSE`.

## Chess piece artwork ("cburnett" set)

- Files: `assets/pieces/*.svg`
- Author: Colin M.L. Burnett (User:Cburnett), obtained via
  [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces)
  as redistributed in the MIT-licensed
  [cm-chessboard](https://github.com/shaack/cm-chessboard) sprite
  (`assets/pieces/standard.svg`), split into individual files.
- License: **CC BY-SA 3.0** —
  <https://creativecommons.org/licenses/by-sa/3.0/>.
