//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IErc20.sol";
import "./interfaces/IMintable.sol";

contract MyBridge {
    mapping(address => address) public otherTokens;
    mapping(bytes32 => bool) public processedHashes;
    mapping(address => uint256) public nextNonce;

    event Swap(
        address from,
        uint256 amount,
        uint256 date,
        uint256 nonce,
        uint256 chainId,
        bytes signature
    );
    event Redeem(
        address to,
        uint256 amount,
        uint256 date,
        uint256 nonce,
        uint256 chainId,
        bytes signature
    );

    constructor() {
    }

    function swap(uint256 amount, uint256 nonce, address token) external {
        require(otherTokens[token] != address(0), "Token not supported");
        uint256 chainId = getChainID();
        bytes32 msgHash = keccak256(
            abi.encode(msg.sender, amount, nonce, otherTokens[token], chainId)
        );
        require(
            processedHashes[msgHash] == false,
            "transfer already processed"
        );
        processedHashes[msgHash] = true;
        if (nextNonce[msg.sender] <= nonce) {
            nextNonce[msg.sender] = nonce + 1;
        }
        IMintable(token).burn(msg.sender, amount);
        emit Swap(
            msg.sender,
            amount,
            block.timestamp,
            nonce,
            chainId,
            abi.encodePacked(msgHash)
        );
    }

    function redeem(
        uint256 amount,
        uint256 nonce,
        uint256 chainId,
        address token,
        bytes calldata signature
    ) external {
        bytes32 msgHash = keccak256(
            abi.encode(msg.sender, amount, nonce, token, chainId)
        );

        require(
            _validSignature(signature, msgHash) == msg.sender,
            "wrong signature"
        );
        require(
            processedHashes[msgHash] == false,
            "transfer already processed"
        );
        processedHashes[msgHash] = true;
        IMintable(token).mint(msg.sender, amount);
        emit Redeem(
            address(this),
            amount,
            block.timestamp,
            nonce,
            getChainID(),
            signature
        );
    }

    function addOtherToken(address _sourceToken, address _otherToken) external {
        otherTokens[_sourceToken] = _otherToken;
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
