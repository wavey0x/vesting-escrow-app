# @version 0.3.10
from vyper.interfaces import ERC20

implements: ERC20


interface VestingEscrow:
    def owner() -> address: view


event Transfer:
    sender: indexed(address)
    receiver: indexed(address)
    value: uint256


event Approval:
    owner: indexed(address)
    spender: indexed(address)
    value: uint256


balanceOf: public(HashMap[address, uint256])
allowance: public(HashMap[address, HashMap[address, uint256]])
totalSupply: public(uint256)
watched_escrow: public(address)
observed_owner: public(address)
extra_debit: public(uint256)


@external
def transfer(receiver: address, amount: uint256) -> bool:
    if msg.sender == self.watched_escrow:
        self.observed_owner = VestingEscrow(msg.sender).owner()

    debit: uint256 = amount + self.extra_debit
    self.balanceOf[msg.sender] -= debit
    self.balanceOf[receiver] += amount
    log Transfer(msg.sender, receiver, amount)
    return True


@external
def transferFrom(owner: address, receiver: address, amount: uint256) -> bool:
    self.balanceOf[owner] -= amount
    self.balanceOf[receiver] += amount
    self.allowance[owner][msg.sender] -= amount
    log Transfer(owner, receiver, amount)
    log Approval(owner, msg.sender, self.allowance[owner][msg.sender])
    return True


@external
def approve(spender: address, amount: uint256) -> bool:
    self.allowance[msg.sender][spender] = amount
    log Approval(msg.sender, spender, amount)
    return True


@external
def mint(receiver: address, amount: uint256):
    assert receiver != empty(address)
    self.totalSupply += amount
    self.balanceOf[receiver] += amount
    log Transfer(empty(address), receiver, amount)


@external
def configure(watched_escrow: address, extra_debit: uint256):
    self.watched_escrow = watched_escrow
    self.extra_debit = extra_debit
