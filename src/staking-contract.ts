import {
  EmergencyWithdrawn as EmergencyWithdrawnEvent,
  RewardsClaimed as RewardsClaimedEvent,
  Staked as StakedEvent,
  Withdrawn as WithdrawnEvent,
  RewardRateUpdated as RewardRateUpdatedEvent,
  StakingInitialized as StakingInitializedEvent,
} from "../generated/StakingContract/StakingContract";
import {
  EmergencyWithdrawn,
  RewardRateUpdated,
  RewardsClaimed,
  Staked,
  StakingInitialized,
  Withdrawn,
  User,
  ProtocolStats,
} from "../generated/schema";

import { BigInt, Bytes } from "@graphprotocol/graph-ts";

function getOrCreateUser(address: Bytes): User {
  let user = User.load(address);
  if (!user) {
    user = new User(address);
    user.totalStaked = BigInt.fromI32(0);
    user.totalWithdrawn = BigInt.fromI32(0);
    user.totalRewardsClaimed = BigInt.fromI32(0);
    user.totalEmergencyWithdrawals = BigInt.fromI32(0);
    user.stakingCount = BigInt.fromI32(0);
    user.withdrawalCount = BigInt.fromI32(0);
    user.firstStakeTimestamp = BigInt.fromI32(0);
    user.lastActivityTimestamp = BigInt.fromI32(0);
  }
  return user;
}

function getOrCreateProtocolStats(): ProtocolStats {
  let stats = ProtocolStats.load("protocol-stats");
  if (!stats) {
    stats = new ProtocolStats("protocol-stats");
    stats.totalStaked = BigInt.fromI32(0);
    stats.currentRewardRate = BigInt.fromI32(0);
    stats.totalUsers = BigInt.fromI32(0);
    stats.totalTransactions = BigInt.fromI32(0);
    stats.totalVolumeStaked = BigInt.fromI32(0);
    stats.totalVolumeWithdrawn = BigInt.fromI32(0);
    stats.totalRewardsPaid = BigInt.fromI32(0);
    stats.lastUpdatedTimestamp = BigInt.fromI32(0);
    stats.lastUpdatedBlock = BigInt.fromI32(0);
  }
  return stats;
}

export function handleEmergencyWithdrawn(event: EmergencyWithdrawnEvent): void {
  let entity = new EmergencyWithdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.user = event.params.user;
  entity.amount = event.params.amount;
  entity.penalty = event.params.penalty;
  entity.timestamp = event.params.timestamp;
  entity.newTotalStaked = event.params.newTotalStaked;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update user aggregate
  let user = getOrCreateUser(event.params.user);
  user.totalEmergencyWithdrawals = user.totalEmergencyWithdrawals.plus(event.params.amount);
  user.lastActivityTimestamp = event.params.timestamp;
  user.save();

   // Update protocol stats
  let stats = getOrCreateProtocolStats();
  stats.totalStaked = event.params.newTotalStaked;
  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1));
  stats.totalVolumeWithdrawn = stats.totalVolumeWithdrawn.plus(event.params.amount);
  stats.lastUpdatedTimestamp = event.params.timestamp;
  stats.lastUpdatedBlock = event.block.number;
  stats.save();
}

export function handleRewardRateUpdated(event: RewardRateUpdatedEvent): void {
  let entity = new RewardRateUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.oldRate = event.params.oldRate;
  entity.newRate = event.params.newRate;
  entity.timestamp = event.params.timestamp;
  entity.totalStaked = event.params.totalStaked;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update protocol stats with new rate
  let stats = getOrCreateProtocolStats();
  stats.totalStaked = event.params.totalStaked;
  stats.currentRewardRate = event.params.newRate; // Update current rate
  stats.lastUpdatedTimestamp = event.params.timestamp;
  stats.lastUpdatedBlock = event.block.number;
  stats.save();
}

export function handleRewardsClaimed(event: RewardsClaimedEvent): void {
  
  let entity = new RewardsClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.amount = event.params.amount
  entity.timestamp = event.params.timestamp
  entity.newPendingRewards = event.params.newPendingRewards
  entity.totalStaked = event.params.totalStaked
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  
  let user = getOrCreateUser(event.params.user)
  user.totalRewardsClaimed = user.totalRewardsClaimed.plus(event.params.amount)
  user.lastActivityTimestamp = event.params.timestamp
  user.save()

  
  let stats = getOrCreateProtocolStats()
  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1))
  stats.totalRewardsPaid = stats.totalRewardsPaid.plus(event.params.amount)
  stats.lastUpdatedTimestamp = event.params.timestamp
  stats.lastUpdatedBlock = event.block.number
  stats.save()
}

export function handleStaked(event: StakedEvent): void {
  let entity = new Staked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.user = event.params.user;
  entity.amount = event.params.amount;
  entity.timestamp = event.params.timestamp;
  entity.newTotalStaked = event.params.newTotalStaked;
  entity.currentRewardRate = event.params.currentRewardRate;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  let user = getOrCreateUser(event.params.user);
  user.totalStaked = user.totalStaked.plus(event.params.amount);
  user.stakingCount = user.stakingCount.plus(BigInt.fromI32(1));
  if (user.firstStakeTimestamp.equals(BigInt.fromI32(0))) {
    user.firstStakeTimestamp = event.params.timestamp;
  }
  user.lastActivityTimestamp = event.params.timestamp;
  user.save();

  let stats = getOrCreateProtocolStats();
  stats.totalStaked = event.params.newTotalStaked;
  stats.currentRewardRate = event.params.currentRewardRate;
  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1));
  stats.totalVolumeStaked = stats.totalVolumeStaked.plus(event.params.amount);
  stats.lastUpdatedTimestamp = event.params.timestamp;
  stats.lastUpdatedBlock = event.block.number;

  if (user.stakingCount.equals(BigInt.fromI32(1))) {
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1));
  }
  stats.save();
}

export function handleStakingInitialized(event: StakingInitializedEvent): void {
  let entity = new StakingInitialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.stakingToken = event.params.stakingToken;
  entity.initialRewardRate = event.params.initialRewardRate;
  entity.timestamp = event.params.timestamp;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleWithdrawn(event: WithdrawnEvent): void {
  
  let entity = new Withdrawn(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.user = event.params.user
  entity.amount = event.params.amount
  entity.timestamp = event.params.timestamp
  entity.newTotalStaked = event.params.newTotalStaked
  entity.currentRewardRate = event.params.currentRewardRate
  entity.rewardsAccrued = event.params.rewardsAccrued
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  
  let user = getOrCreateUser(event.params.user)
  user.totalWithdrawn = user.totalWithdrawn.plus(event.params.amount)
  user.withdrawalCount = user.withdrawalCount.plus(BigInt.fromI32(1))
  user.lastActivityTimestamp = event.params.timestamp
  user.save()

  
  let stats = getOrCreateProtocolStats()
  stats.totalStaked = event.params.newTotalStaked
  stats.currentRewardRate = event.params.currentRewardRate
  stats.totalTransactions = stats.totalTransactions.plus(BigInt.fromI32(1))
  stats.totalVolumeWithdrawn = stats.totalVolumeWithdrawn.plus(event.params.amount)
  stats.lastUpdatedTimestamp = event.params.timestamp
  stats.lastUpdatedBlock = event.block.number
  stats.save()
}