export function setupHud(container = document.body) {
  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.style.cssText = `
    position: fixed;
    top: env(safe-area-inset-top, 0px);
    left: env(safe-area-inset-left, 0px);
    right: env(safe-area-inset-right, 0px);
    padding: 12px 16px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 18px;
    font-weight: 600;
    pointer-events: none;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    text-shadow: 0 1px 2px rgba(0,0,0,0.6);
  `;
  const moneyEl = document.createElement('div');
  moneyEl.id = 'hud-money';
  moneyEl.textContent = '💰 $0';
  hud.appendChild(moneyEl);

  const hpEl = document.createElement('div');
  hpEl.id = 'hud-hp';
  hpEl.textContent = '❤️ 100';
  hud.appendChild(hpEl);

  container.appendChild(hud);

  return {
    update(world) {
      moneyEl.textContent = `💰 $${world.money.pocket}`;
      hpEl.textContent = `❤️ ${Math.max(0, Math.round(world.player.hp))}`;
    },
  };
}
