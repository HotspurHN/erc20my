//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IMintable {
    function mint(address _to, uint256 _value) external returns (bool);
    function burn(address _from, uint256 _value) external returns (bool);
}