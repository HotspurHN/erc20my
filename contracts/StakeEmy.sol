//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./interfaces/IErc20.sol";
import "./interfaces/IMintable.sol";

contract StakeEmy {
    address private owner;
    address private admin;
    address public lpToken;
    address public rewardToken;

    uint256 public pool;
    uint256 public coolDown;
    uint256 public startPool;
    uint256 public freezeTime;

    uint256 public allStaked;
    uint256 private lastPeriod;
    address[] public accountsInPool;
    mapping(address => uint256) private balances;
    mapping(address => uint256) private claimed;
    mapping(uint256 => Shares) private sharesPerPeriod;
    mapping(address => uint256) private startStaking;
    
    event Stake(address indexed _from, uint256 _value);
    event Unstake(address indexed _to, uint256 _value);
    event Claim(address indexed _to, uint256 _value);

    struct Share {
        address account;
        uint256 amount;
        bool claimed;
    }

    struct Shares {
        uint256 claimed;
        uint256 allShares;
        uint256 pool;
        mapping(address => Share) shares;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }
    modifier onlyOwnerOrAdmin() {
        require(
            msg.sender == owner || msg.sender == admin,
            "Only owner or admin allowed"
        );
        _;
    }

    constructor(
        address _rewarToken,
        uint256 _pool,
        uint256 _coolDown,
        uint256 _freezeTime
    ) {
        rewardToken = _rewarToken;
        pool = _pool;
        coolDown = _coolDown;
        owner = msg.sender;
        freezeTime = _freezeTime;
    }

    function stake(uint256 _amount) public {
        require(lpToken != address(0), "lpToken not set");
        require(
            IErc20(lpToken).balanceOf(msg.sender) >= _amount,
            "Not enough balance"
        );
        require(
            IErc20(lpToken).allowance(msg.sender, address(this)) >= _amount,
            "Not enough allowance"
        );
        _updateShares();
        _updateAccountInPool(msg.sender);
        balances[msg.sender] += _amount;
        allStaked += _amount;
        startStaking[msg.sender] = block.timestamp;
        IErc20(lpToken).transferFrom(msg.sender, address(this), _amount);
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint256 _amount) public {
        require(lpToken != address(0), "lpToken not set");
        require(balances[msg.sender] >= _amount, "Not enough balance");
        require(startStaking[msg.sender] <= block.timestamp - freezeTime, "Tokens still frozen");
        _updateShares();
        _excludeAccountFromPool(msg.sender);
        _claim();
        balances[msg.sender] -= _amount;
        allStaked -= _amount;
        IErc20(lpToken).transfer(msg.sender, _amount);
        emit Unstake(msg.sender, _amount);
    }

    function claim() public {
        require(lpToken != address(0), "lpToken not set");
        require(coolDown > 0, "Cooldown is not set");
        require(balances[msg.sender] > 0, "No balance to claim");
        _updateShares();
        _claim();
    }

    function setCooldown(uint256 _coolDown) public onlyOwnerOrAdmin {
        _updateShares();
        coolDown = _coolDown;
    }

    function setLPToken(address _lpToken) public onlyOwnerOrAdmin {
        require(lpToken == address(0), "lpToken already set");
        lpToken = _lpToken;
        startPool = block.timestamp;
    }

    function setPool(uint256 _pool) public onlyOwnerOrAdmin {
        _updateShares();
        pool = _pool;
    }

    function setAdmin(address _admin) public onlyOwner {
        admin = _admin;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    receive() external payable {}

    function _updateShares() private {
        uint256 periods = (block.timestamp - startPool) / coolDown;
        if (lastPeriod < periods) {
            for (uint256 j = 0; j < accountsInPool.length; j++) {
                uint256 shareValue = (balances[accountsInPool[j]] * pool) / allStaked;
                for (uint256 i = lastPeriod; i < periods; i++) {
                    sharesPerPeriod[i].allShares++;
                    sharesPerPeriod[i].pool = pool;
                    sharesPerPeriod[i].shares[accountsInPool[j]] = Share(
                        accountsInPool[j],
                        shareValue,
                        false
                    );
                }
            }
        }
        lastPeriod = periods;
    }

    function _claim() private {
        uint256 totalClaimed = 0;
        for (uint256 i = claimed[msg.sender]; i < lastPeriod; i++) {
            uint256 toClaimValue = 0;
            Shares storage shares = sharesPerPeriod[i];
            if (!shares.shares[msg.sender].claimed && shares.shares[msg.sender].amount > 0) {
                if (shares.claimed + 1 == shares.allShares) {
                    toClaimValue = shares.pool;
                } else {
                    toClaimValue = shares.shares[msg.sender].amount;
                }
                shares.pool -= toClaimValue;
                shares.shares[msg.sender].claimed = true;
                shares.claimed++;
                totalClaimed += toClaimValue;
            }
        }
        claimed[msg.sender] = lastPeriod;
        if (totalClaimed > 0) {
            IMintable(rewardToken).mint(msg.sender, totalClaimed);
            emit Unstake(msg.sender, totalClaimed);
        }
    }

    function _excludeAccountFromPool(address exclude) private {
        for (uint256 i = 0; i < accountsInPool.length; i++) {
            if (accountsInPool[i] == exclude) {
                accountsInPool[i] = accountsInPool[accountsInPool.length - 1];
                accountsInPool.pop();
                break;
            }
        }
    }

    function _addAccountToPool(address account) private {
        accountsInPool.push(account);
    }

    function _updateAccountInPool(address account) private {
        _excludeAccountFromPool(account);
        _addAccountToPool(account);
    }
}
