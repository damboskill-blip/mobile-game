import { BALANCE } from '../balance.js';

export function update(world, dt) {
  const p = world.player;
  if (p.state !== 'alive') return;
  const r = BALANCE.player.pickupRadius;
  for (let i = world.register.moneyPiles.length - 1; i >= 0; i--) {
    const pile = world.register.moneyPiles[i];
    const d = Math.hypot(pile.pos.x - p.pos.x, pile.pos.z - p.pos.z);
    if (d <= r) {
      world.money.pocket += pile.amount;
      world.register.moneyPiles.splice(i, 1);
    }
  }
}
