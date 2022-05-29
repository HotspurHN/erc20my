//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IErc20.sol";
import "./interfaces/IMintable.sol";

contract MyBridge {
    address public token;

    mapping(address => mapping(uint256 => bool)) public processedNoncesIn;
    mapping(address => mapping(uint256 => bool)) public processedNoncesOut;
    mapping(address => uint256) public nextNonce;

    event Transfer(
        address from,
        address to,
        uint256 amount,
        uint256 date,
        uint256 nonce,
        bytes signature
    );

    constructor(address _token) {
        token = _token;
    }

    function swap(
        uint256 amount,
        uint256 nonce
    ) external {
        require(
            processedNoncesIn[msg.sender][nonce] == false,
            "transfer already processed"
        );
        bytes32 msgHash = keccak256(abi.encode(msg.sender, amount, nonce));
        processedNoncesIn[msg.sender][nonce] = true;
        nextNonce[msg.sender] = nonce + 1;
        IMintable(token).burn(msg.sender, amount);
        emit Transfer(
            msg.sender,
            address(this),
            amount,
            block.timestamp,
            nonce,
            abi.encodePacked(msgHash)
        );
    }

    function redeem(
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external {
        bytes32 msgHash = keccak256(
            abi.encode(msg.sender, amount, nonce)
        );

        require(_validSignature(signature, msgHash) == msg.sender, "wrong signature");
        require(
            processedNoncesOut[msg.sender][nonce] == false,
            "transfer already processed"
        );
        processedNoncesOut[msg.sender][nonce] = true;
        IMintable(token).mint(msg.sender, amount);
        emit Transfer(
            address(this),
            msg.sender,
            amount,
            block.timestamp,
            nonce,
            signature
        );
    }

    function _validSignature(bytes memory signature, bytes32 msgHash) internal pure returns (address) {
        return ECDSA.recover(ECDSA.toEthSignedMessageHash(msgHash), signature);
    }
}
