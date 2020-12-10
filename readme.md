# Uniswap Governance Subgraph

[Uni](https://uniswap.org/vote) is a governance token for the Uniswap decentralized exchange.

This subgraph tracks proposals for this governance token. It also tracks every vote made by every user, and the delegates of these addresses.

## Installation

This repo is using npm. After cloning, run :

```
$ npm install && npm run codegen
```

## Key Entity Overviews

#### Proposal

Contains data concerning proposals, and derives an array of every vote on each.

#### Account

Contains information concerning each account and its voting power, with circular reference to its delegates.

#### Vote

Contains data on a specific vote.

## Example Queries

### Querying Aggregated Uniswap Data

This query fetches information about the Dharma Deployer address, the delegates to it, the proposals it voted on, with its support and with how much amount.

```graphql
{
  account(id: "0x7e4a8391c728fed9069b2962699ab416628b19fa") {
    id
    votingPower
    votes {
      proposal {
        description
      }
      support
      amount
    }
    delegates {
      id
    }
  }
}
```
