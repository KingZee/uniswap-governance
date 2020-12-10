import { BigInt, Address, ethereum, log } from "@graphprotocol/graph-ts"
import {
  ProposalCanceled,
  ProposalCreated,
  ProposalExecuted,
  ProposalQueued,
  VoteCast
} from "../generated/GovernorAlpha/GovernorAlpha"
import {
  Uni,
  DelegateChanged,
  DelegateVotesChanged,
} from "../generated/Uni/Uni"
import { Account, Proposal, Vote } from "../generated/schema"

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.BALLOT_TYPEHASH(...)
  // - contract.DOMAIN_TYPEHASH(...)
  // - contract.getActions(...)
  // - contract.getReceipt(...)
  // - contract.latestProposalIds(...)
  // - contract.name(...)
  // - contract.proposalCount(...)
  // - contract.proposalMaxOperations(...)
  // - contract.proposalThreshold(...)
  // - contract.proposals(...)
  // - contract.propose(...)
  // - contract.quorumVotes(...)
  // - contract.state(...)
  // - contract.timelock(...)
  // - contract.uni(...)
  // - contract.votingDelay(...)
  // - contract.votingPeriod(...)

export function handleProposalCreated(event: ProposalCreated): void {
  let proposalData = event.params
  let proposal = new Proposal(proposalData.id.toString())
  proposal.proposer = proposalData.proposer.toHexString()
  proposal.startBlock = proposalData.startBlock
  proposal.endBlock = proposalData.endBlock
  proposal.description = proposalData.description

  let stringArr = [] as string[]
  for(let i = 0; i < proposalData.targets.length; i++){
    let x = proposalData.targets
    stringArr.push(x[i].toHexString())
  }

  proposal.targets = stringArr.slice() //proposalData.targets.map(x => x.toString()) //.map() doesn't work
  proposal.values = proposalData.values.slice()
  proposal.signatures = proposalData.signatures.slice()
  proposal.calldatas = proposalData.calldatas.slice()
  proposal.queued = false
  proposal.canceled = false
  proposal.executed = false
  proposal.voteAgainst = BigInt.fromI32(0)
  proposal.voteFor = BigInt.fromI32(0)
  proposal.save()
}

export function handleProposalCanceled(event: ProposalCanceled): void {
  let proposal = Proposal.load(event.params.id.toString())
  proposal.canceled = true
  proposal.save()
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposal = Proposal.load(event.params.id.toString())
  proposal.executed = true
  proposal.save()
}

export function handleProposalQueued(event: ProposalQueued): void {
  let proposal = Proposal.load(event.params.id.toString())
  proposal.queued = true
  proposal.executionETA = event.params.eta
  proposal.save()
}

/* //Was used for tracking proposal "status", is extremely slow and inefficient

export function blockHandler(block: ethereum.Block): void {
  let i = 1
  let done = false
  let QUORUM = BigInt.fromI32(10).pow(25).times(BigInt.fromI32(4))  //40000000000000000000000000

  while(!done){
    let proposal = Proposal.load(i.toString())
    
    if(proposal == null){
      done = true
    }

    if(proposal.status == "Pending" && proposal.endBlock.lt(block.number)){
      if(proposal.voteFor.minus(proposal.voteAgainst).gt(QUORUM))
        proposal.status = "Passed"
      else
        proposal.status = "Failed"
    }
    i++
  }
}
*/

export function handleVoteCast(event: VoteCast): void {
  let voteData = event.params

  let vote = new Vote(event.transaction.hash.toHexString())
  vote.proposal = voteData.proposalId.toString()
  vote.voter = getOrCreateAccount(voteData.voter).id
  vote.support = voteData.support
  vote.amount = voteData.votes
  vote.save()

  let proposal = Proposal.load(voteData.proposalId.toString())
  if(vote.support) {
    proposal.voteFor = proposal.voteFor.plus(vote.amount)
  } else {
    proposal.voteAgainst = proposal.voteAgainst.plus(vote.amount)
  }
  proposal.save()
}

export function handleDelegateChanged(event: DelegateChanged): void {
  let eventData = event.params
  let delegator = getOrCreateAccount(eventData.delegator)
  delegator.delegatedTo = eventData.toDelegate.toHexString()
  delegator.save()
}

export function handleDelegateVotesChanged(event: DelegateVotesChanged): void {
  let eventData = event.params
  let account = getOrCreateAccount(eventData.delegate)
  account.votingPower = eventData.newBalance
  account.save()
}

//Returns an account depending on its address
function getOrCreateAccount(address: Address) : Account {
  let account = Account.load(address.toHexString())
  if(account == null) {
    let contract = Uni.bind(address)
    account = new Account(address.toHexString())
    
    let voteCount = contract.try_getCurrentVotes(address)
    if(voteCount.reverted)
      account.votingPower = BigInt.fromI32(0)
    else account.votingPower = voteCount.value

    let delegate = contract.try_delegates(address)
    if(delegate.reverted)
      account.delegatedTo = address.toHexString()
    else account.delegatedTo = delegate.value.toHexString()

    account.save()
    return account as Account
  } else return account as Account
}

