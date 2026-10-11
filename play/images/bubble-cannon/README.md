# Bubble Cannon assets

The production PNG set for the P/Q/R mini-game lives in this directory. The
game keeps its CSS and emoji fallbacks so an individual loading failure does
not make the lesson unplayable.

Files used by the game:

- `bubble-cannon-bg.png`
- `bubble-cannon-base.png`
- `bubble-cannon-barrel.png`
- `bubble-cannon-muzzle-flash.png`
- `bubble-cannon-projectile.png`
- `bubble-cannon-projectile-trail.png`
- `bubble-target-01.png`, `bubble-target-02.png`, `bubble-target-03.png`
- `bubble-hit-effect.png`, `bubble-wrong-hit-effect.png`, `bubble-hint-glow.png`
- `bubble-cannon-leaves-01.png`, `bubble-cannon-leaves-02.png`
- `bubble-cannon-cloud-01.png`, `bubble-cannon-cloud-02.png`

Keep transparent artwork in PNG format. Do not place Marius artwork here: the
game uses the shared `renderCharacter()` compositor.

## Source and derived files

The supplied artwork was found at
`2026-09-11/files-pasted-by-the-user-html/outputs/images/` in the adjacent
Codex workspace. The source files are preserved there unchanged.

- Background, cannon base, cannon barrel, both clouds, projectile trail and
  all three feedback effects are direct copies.
- `bubble-target-01.png`, `bubble-target-02.png` and `bubble-target-03.png`
  are lossless crops of the P, Q and R cells in the supplied 3 × 3
  `bubble-target.png` sprite sheet.
- The two leaves files are lossless corner crops from the supplied
  `bubble-cannon-leaves.png` sprite sheet.
- `bubble-cannon-projectile.png` is a lossless crop of the small blue bubble
  in the supplied projectile artwork. The complete supplied projectile
  artwork is used as `bubble-cannon-muzzle-flash.png`.
