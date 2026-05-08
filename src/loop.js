const MAX_DT = 1 / 30; // clamp to 30fps minimum to avoid huge jumps after tab-resume

export function startLoop(world, systems, render, onFrame) {
  let lastTime = performance.now();
  let running = true;

  function frame(now) {
    if (!running) return;
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > MAX_DT) dt = MAX_DT;

    world.time.dt = dt;
    world.time.elapsed += dt;
    world.time.frameCount++;

    for (const system of systems) system(world, dt);
    render(world);
    if (onFrame) onFrame(world);

    requestAnimationFrame(frame);
  }

  // pause on visibility change to avoid huge dt on resume
  const onVisibility = () => {
    if (document.hidden) running = false;
    else { running = true; lastTime = performance.now(); requestAnimationFrame(frame); }
  };
  document.addEventListener('visibilitychange', onVisibility);

  requestAnimationFrame(frame);

  return {
    stop() { running = false; document.removeEventListener('visibilitychange', onVisibility); },
  };
}
