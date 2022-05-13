//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Erc20my {

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    address public owner;

    mapping(address => uint256) private balances;
    mapping(address => mapping(address => uint256)) private allowed;

    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    modifier onlyOwner {
      require(msg.sender == owner, "Only owner allowed");
      _;
   }

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply) {
        console.log("Deploying a Greeter with greeting:");
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply;
        balances[msg.sender] = totalSupply;
        owner = msg.sender;
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balances[msg.sender] >= _value, "Not enough balance");
        balances[_to] += _value;
        balances[msg.sender] -= _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(balances[_from] >= _value, "Not enough balance");
        require(allowed[_from][msg.sender]>= _value, "Not enough allowance");
        balances[_to] += _value;
        balances[_from] -= _value;
        allowed[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256) {
        return allowed[_owner][_spender];
    }

    function mint(address _to, uint256 _value) public onlyOwner returns (bool) {
        totalSupply += _value;
        balances[_to] += _value;
        emit Transfer(address(this), _to, _value);
        return true;
    }

    function burn(address _from, uint256 _value) public onlyOwner returns (bool) {
        require(balances[_from] >= _value, "Not enough balance");
        totalSupply -= _value;
        balances[_from] -= _value;
        return true;
    }
}
