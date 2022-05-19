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

    uint256 private lastValue;
    uint256 private lastUpdate;
    mapping(address => uint256) private lastValuePerAddress;

    uint256 public allStaked;
    mapping(address => uint256) private balances;
    mapping(address => uint256) private startStaking;

    event Stake(address indexed _from, uint256 _value);
    event Unstake(address indexed _to, uint256 _value);
    event Claim(address indexed _to, uint256 _value);

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
        if (balances[msg.sender] > 0) {
            _claim();
        } else {
            lastValuePerAddress[msg.sender] = lastValue;
        }
        IErc20(lpToken).transferFrom(msg.sender, address(this), _amount);
        balances[msg.sender] += _amount;
        allStaked += _amount;
        startStaking[msg.sender] = block.timestamp;
        emit Stake(msg.sender, _amount);
    }

    function unstake(uint256 _amount) public {
        require(lpToken != address(0), "lpToken not set");
        require(balances[msg.sender] >= _amount, "Not enough balance");
        require(
            startStaking[msg.sender] <= block.timestamp - freezeTime,
            "Tokens still frozen"
        );
        _claim();
        balances[msg.sender] -= _amount;
        allStaked -= _amount;
        IErc20(lpToken).transfer(msg.sender, _amount);
        emit Unstake(msg.sender, _amount);
    }

    function claimable() public view returns(uint256){
        uint256 last = lastValue + pool * (_currentPeriod() - lastUpdate) / allStaked;
        return (last - lastValuePerAddress[msg.sender]) * balanceOf(msg.sender);
    }

    function claim() public {
        require(lpToken != address(0), "lpToken not set");
        require(balances[msg.sender] > 0, "No balance to claim");
        _claim();
    }

    function setLPToken(address _lpToken) public onlyOwnerOrAdmin {
        require(lpToken == address(0), "lpToken already set");
        lpToken = _lpToken;
        startPool = block.timestamp;
    }

    function setPool(uint256 _pool) public onlyOwnerOrAdmin {
        pool = _pool;
    }

    function setAdmin(address _admin) public onlyOwner {
        admin = _admin;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    function _claim() private {
        lastValue += (pool * (_currentPeriod() - lastUpdate)) / allStaked;
        lastUpdate = _currentPeriod();
        uint256 totalClaimed = claimable();
        lastValuePerAddress[msg.sender] = lastValue;
        if (totalClaimed > 0) {
            IMintable(rewardToken).mint(msg.sender, totalClaimed);
            emit Claim(msg.sender, totalClaimed);
        }
    }

    function _currentPeriod() private view returns (uint256) {
        return (block.timestamp - startPool) / coolDown;
    }
}
