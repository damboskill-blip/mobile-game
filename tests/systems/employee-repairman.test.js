import { describe, it, expect } from 'vitest';
import { createWorld } from '../../src/world.js';
import { update as updateEmployee } from '../../src/systems/employee.js';
import { BALANCE } from '../../src/balance.js';

const REPAIRMAN_REACH = 1.2; // mirrors the constant in employee.js

function spawnRepairman(w, x, z) {
  const emp = {
    id: ++w.nextId, type: 'repairman',
    pos: { x, z }, rot: 0,
    state: 'idle', target: null,
  };
  w.employees.push(emp);
  return emp;
}

function damageSegment(world, segId, hp) {
  const seg = world.fence.segments.find(s => s.id === segId);
  seg.hp = hp;
  if (hp <= 0) seg.broken = true;
  return seg;
}

describe('repairman employee', () => {
  it('idle repairman with no damaged segment stays idle', () => {
    const w = createWorld();
    const rep = spawnRepairman(w, 0, 0);
    // All segments at full HP by default
    updateEmployee(w, 0.016);
    expect(rep.state).toBe('idle');
    expect(rep.target).toBeNull();
  });

  it('idle repairman finds the most damaged segment and targets it', () => {
    const w = createWorld();
    const rep = spawnRepairman(w, 0, 0);
    damageSegment(w, 0, 80);
    damageSegment(w, 1, 20); // more damaged
    updateEmployee(w, 0.016);
    expect(rep.state).toBe('going-to-fence');
    expect(rep.target).toBe(1); // segment 1 is most damaged
  });

  it('repairman repairs fence at repairmanRate per second when adjacent', () => {
    const w = createWorld();
    const seg = damageSegment(w, 0, 50);
    const rep = spawnRepairman(w, seg.pos.x, seg.pos.z); // already adjacent
    rep.state = 'repairing';
    rep.target = seg.id;

    const dt = 1.0;
    updateEmployee(w, dt);
    const expectedHp = Math.min(BALANCE.fence.hpPerSegment, 50 + BALANCE.worker.repairmanRate * dt);
    expect(seg.hp).toBeCloseTo(expectedHp, 3);
  });

  it('repairman transitions idle → going-to-fence → repairing', () => {
    const w = createWorld();
    const seg = damageSegment(w, 0, 10);
    // Place repairman far from the segment
    const rep = spawnRepairman(w, 0, 0);

    // Step 1: find segment
    updateEmployee(w, 0.016);
    expect(rep.state).toBe('going-to-fence');
    expect(rep.target).toBe(seg.id);

    // Move repairman right next to the segment to simulate arrival
    rep.pos = { x: seg.pos.x + 0.5, z: seg.pos.z };
    updateEmployee(w, 0.016);
    expect(rep.state).toBe('repairing');
  });

  it('repairman stops repairing and returns to idle when segment reaches full HP', () => {
    const w = createWorld();
    const seg = damageSegment(w, 0, 95);
    const rep = spawnRepairman(w, seg.pos.x, seg.pos.z);
    rep.state = 'repairing';
    rep.target = seg.id;

    // With repairmanRate=25, 0.2s should push 95+5=100 (full)
    updateEmployee(w, 0.2);
    expect(seg.hp).toBe(BALANCE.fence.hpPerSegment);
    expect(seg.broken).toBe(false);
    expect(rep.state).toBe('idle');
    expect(rep.target).toBeNull();
  });

  it('repairman does not overheal fence beyond hpPerSegment', () => {
    const w = createWorld();
    const seg = damageSegment(w, 0, 10);
    const rep = spawnRepairman(w, seg.pos.x, seg.pos.z);
    rep.state = 'repairing';
    rep.target = seg.id;

    // Large dt to ensure overshoot
    updateEmployee(w, 100);
    expect(seg.hp).toBe(BALANCE.fence.hpPerSegment);
  });

  it('repairman re-idles when targeted segment disappears', () => {
    const w = createWorld();
    const seg = damageSegment(w, 0, 50);
    const rep = spawnRepairman(w, 5, 5);
    rep.state = 'repairing';
    rep.target = seg.id;

    // Restore the segment externally (simulating another repairman fixing it)
    seg.hp = BALANCE.fence.hpPerSegment;
    updateEmployee(w, 0.016);
    // hp is full, so repairman should return to idle
    expect(rep.state).toBe('idle');
    expect(rep.target).toBeNull();
  });

  it('repairman re-targets when going-to-fence segment is already fully healed', () => {
    const w = createWorld();
    const seg = damageSegment(w, 0, 50);
    const rep = spawnRepairman(w, 5, 5);
    rep.state = 'going-to-fence';
    rep.target = seg.id;

    // Segment heals externally before repairman arrives
    seg.hp = BALANCE.fence.hpPerSegment;
    updateEmployee(w, 0.016);
    expect(rep.state).toBe('idle');
    expect(rep.target).toBeNull();
  });
});
