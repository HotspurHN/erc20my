//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IErc20.sol";
import "./interfaces/IMintable.sol";

contract MyBridge {
    address public immutable token;
    address public otherToken;

    mapping(bytes32 => bool) public processedNonces;
    mapping(address => uint256) public nextNonce;

    event Transfer(
        address from,
        address to,
        uint256 amount,
        uint256 date,
        uint256 nonce,
        bytes signature
    );

    constructor(address _token, address _otherToken) {
        token = _token;
        otherToken = _otherToken;
    }

    function swap(uint256 amount, uint256 nonce) external {
        bytes32 msgHash = keccak256(
            abi.encode(msg.sender, amount, nonce, otherToken, getChainID())
        );
        require(
            processedNonces[msgHash] == false,
            "transfer already processed"
        );
        processedNonces[msgHash] = true;
        if (nextNonce[msg.sender] <= nonce) {
            nextNonce[msg.sender] = nonce + 1;
        }
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
            abi.encode(msg.sender, amount, nonce, token, getChainID())
        );

        require(
            _validSignature(signature, msgHash) == msg.sender,
            "wrong signature"
        );
        require(
            processedNonces[msgHash] == false,
            "transfer already processed"
        );
        processedNonces[msgHash] = true;
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

    function setOtherToken(address _otherToken) external {
        otherToken = _otherToken;
    }

    function _validSignature(bytes memory signature, bytes32 msgHash)
        internal
        pure
        returns (address)
    {
        return ECDSA.recover(ECDSA.toEthSignedMessageHash(msgHash), signature);
    }

    function getChainID() private view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
}
