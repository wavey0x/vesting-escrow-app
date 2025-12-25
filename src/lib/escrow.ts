import { Escrow, EscrowStatus, LiveEscrowData, IndexedEscrow } from './types';
import { ZERO_ADDRESS } from './constants';

/**
 * Calculate escrow status from live data
 */
export function getEscrowStatus(escrow: Escrow): EscrowStatus {
  const now = Math.floor(Date.now() / 1000);
  const live = escrow.live;

  if (!live) {
    // Without live data, use indexed data for basic status
    const cliffEnd = escrow.vestingStart + escrow.cliffLength;
    const vestingEnd = escrow.vestingStart + escrow.vestingDuration;

    if (now < cliffEnd) return 'cliff';
    if (now < vestingEnd) return 'vesting';
    return 'claimable';
  }

  const endTime = Number(live.endTime);
  const disabledAt = Number(live.disabledAt);
  const startTime = Number(live.startTime);
  const cliffLength = Number(live.cliffLength);
  const cliffEnd = startTime + cliffLength;

  // Check if revoked
  if (disabledAt < endTime) {
    return 'revoked';
  }

  // Check if completed (nothing left to claim or locked)
  // Use Number() to handle both bigint 0n and number 0 from different RPC responses
  if (Number(live.unclaimed) === 0 && Number(live.locked) === 0) {
    return 'completed';
  }

  // Check if still in cliff period
  if (now < cliffEnd) {
    return 'cliff';
  }

  // Check if fully vested (all unlocked, some unclaimed)
  if (Number(live.locked) === 0 && Number(live.unclaimed) > 0) {
    return 'claimable';
  }

  // Still vesting
  return 'vesting';
}

/**
 * Calculate vesting progress percentage
 */
export function getVestingProgress(escrow: Escrow): number {
  const now = Math.floor(Date.now() / 1000);
  const start = escrow.vestingStart;
  const duration = escrow.vestingDuration;
  const end = start + duration;

  if (now <= start) return 0;
  if (now >= end) return 100;

  return ((now - start) / duration) * 100;
}

/**
 * Calculate amounts breakdown
 */
export function getAmountsBreakdown(escrow: Escrow): {
  claimed: bigint;
  claimable: bigint;
  locked: bigint;
  total: bigint;
} {
  const total = BigInt(escrow.amount);

  if (escrow.live) {
    return {
      claimed: escrow.live.totalClaimed,
      claimable: escrow.live.unclaimed,
      locked: escrow.live.locked,
      total,
    };
  }

  // Without live data, estimate based on time
  const now = Math.floor(Date.now() / 1000);
  const start = escrow.vestingStart;
  const duration = escrow.vestingDuration;
  const cliffEnd = start + escrow.cliffLength;
  const end = start + duration;

  if (now < cliffEnd) {
    return { claimed: 0n, claimable: 0n, locked: total, total };
  }

  if (now >= end) {
    return { claimed: 0n, claimable: total, locked: 0n, total };
  }

  const elapsed = BigInt(now - start);
  const durationBig = BigInt(duration);
  const vested = (total * elapsed) / durationBig;
  const locked = total - vested;

  return { claimed: 0n, claimable: vested, locked, total };
}

/**
 * Calculate time remaining until next milestone
 */
export function getTimeToMilestone(escrow: Escrow): {
  milestone: 'cliff' | 'vested' | 'none';
  seconds: number;
} {
  const now = Math.floor(Date.now() / 1000);
  const start = escrow.vestingStart;
  const cliffEnd = start + escrow.cliffLength;
  const vestingEnd = start + escrow.vestingDuration;

  if (escrow.cliffLength > 0 && now < cliffEnd) {
    return { milestone: 'cliff', seconds: cliffEnd - now };
  }

  if (now < vestingEnd) {
    return { milestone: 'vested', seconds: vestingEnd - now };
  }

  return { milestone: 'none', seconds: 0 };
}

/**
 * Check if user can claim
 */
export function canClaim(escrow: Escrow, userAddress?: string): boolean {
  if (!escrow.live || escrow.live.unclaimed === 0n) return false;

  if (!userAddress) return false;

  const isRecipient = escrow.recipient.toLowerCase() === userAddress.toLowerCase();
  const isOpenClaim = escrow.live.openClaim;

  return isRecipient || isOpenClaim;
}

/**
 * Check if user is owner
 */
export function isOwner(escrow: Escrow, userAddress?: string): boolean {
  if (!userAddress || !escrow.live) return false;
  return escrow.live.owner.toLowerCase() === userAddress.toLowerCase();
}

/**
 * Check if user is recipient
 */
export function isRecipient(escrow: Escrow, userAddress?: string): boolean {
  if (!userAddress) return false;
  return escrow.recipient.toLowerCase() === userAddress.toLowerCase();
}

/**
 * Check if escrow can be revoked
 */
export function canRevoke(escrow: Escrow, userAddress?: string): boolean {
  if (!isOwner(escrow, userAddress)) return false;
  if (!escrow.live) return false;

  const now = Math.floor(Date.now() / 1000);
  const endTime = Number(escrow.live.endTime);

  return now < endTime && escrow.live.locked > 0n;
}

/**
 * Check if escrow can be disowned
 */
export function canDisown(escrow: Escrow, userAddress?: string): boolean {
  if (!isOwner(escrow, userAddress)) return false;
  if (!escrow.live) return false;

  return escrow.live.owner !== ZERO_ADDRESS;
}

/**
 * Merge indexed data with live data
 */
export function mergeEscrowData(
  indexed: IndexedEscrow,
  live?: LiveEscrowData
): Escrow {
  const escrow: Escrow = { ...indexed, live };
  escrow.status = getEscrowStatus(escrow);
  return escrow;
}
