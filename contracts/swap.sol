// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity =0.7.6;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "hardhat/console.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwapExamples {
    ISwapRouter public immutable swapRouter;

    // hardcode 0.3% fee pool (most liquidity fee-tier)
    // can also use 0.05% / = 500 for lower fee but less liquidity 
    uint24 public constant poolFee = 3000; 

    constructor(ISwapRouter _swapRouter) {
        swapRouter = _swapRouter;
    }

    function swapTokenMax(address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256 amountOut) {
        // Transfer the specified amount of `_$` to this contract.
        // note: this contract must first be approved `_$` by msg.sender 
        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);// token, from, to, value
        // approve the router to spend 
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        // The call to `exactInputSingle` executes the swap given the route.
        amountOut = swapRouter.exactInputSingle(ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));
    }
}