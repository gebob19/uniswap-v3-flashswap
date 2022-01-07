import { ethers } from "hardhat";

it("flashswaps for a loss lol", async function () {
  const signers = await ethers.getSigners(); 
  const signer = signers[0];
  
  // uniswap addresses 
  const router_addr = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
  const factory_addr = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
  // token addresses 
  const WETH_addr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  const DAI_addr = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
  
  // deploy swap contracts 
  const swap_factory = await ethers.getContractFactory("SwapExamples", signer);
  const swap_contract = await swap_factory.deploy(router_addr);
  await swap_contract.deployed();

  // deploy flash contract -- reference swap contracts address 
  const flash_factory = await ethers.getContractFactory("PairFlash", signer);
  const flash_contract = await flash_factory.deploy(swap_contract.address, factory_addr, WETH_addr);
  await flash_contract.deployed();

  // get some WETH 
  // check it out here: https://etherscan.io/address/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2#code
  const erc_abi = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"guy","type":"address"},{"name":"wad","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"src","type":"address"},{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"wad","type":"uint256"}],"name":"withdraw","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"dst","type":"address"},{"name":"wad","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"guy","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"dst","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"src","type":"address"},{"indexed":false,"name":"wad","type":"uint256"}],"name":"Withdrawal","type":"event"}]
  const WETH_contract = new ethers.Contract(WETH_addr, erc_abi, signer)
  // convert ETH to WETH
  const overrides = {
    value: ethers.utils.parseEther('200'),
    gasLimit: ethers.utils.hexlify(50000), 
  }
  let tx = await WETH_contract.deposit(overrides)
  await tx.wait() 

  // get some DAI 
  // approve swaper to spend 2 WETH
  tx = await WETH_contract.approve(swap_contract.address, ethers.utils.parseEther('2'))
  await tx.wait()
  // swap 2 WETH -> _ DAI 
  tx = await swap_contract.swapTokenMax(WETH_addr, DAI_addr, ethers.utils.parseEther('2'));
  await tx.wait()
  
  const DAI_contract = new ethers.Contract(DAI_addr, erc_abi, signer)
  const balance_before = ethers.utils.formatEther((await DAI_contract.balanceOf(signer.address)))
  // transfer 100 DAI to contract so that it can pay for the fees (bc we flash for a loss lol)
  // extra $$ (after fees) will be payed back 
  tx = await DAI_contract.transfer(flash_contract.address, ethers.utils.parseEther('1000'))
  await tx.wait()
  
  // FLASH SWAP 
  const flash_params = {
    token0: DAI_addr,
    token1: WETH_addr,
    fee1: 500, // flash from the 0.05% fee pool 
    amount0: ethers.utils.parseEther('1000'), // flash borrow this much DAI
    amount1: 0, // flash borrow 0 WETH
  }
  tx = await flash_contract.initFlash(flash_params);
  await tx.wait();  

  // 1 ether = 1 * 10^18 wei 
  console.log('flash gas ether: ', tx.gasPrice.toNumber() / 1e18)

  const balance_after = ethers.utils.formatEther((await DAI_contract.balanceOf(signer.address)))
  console.log('Total Flash Change in Balance: %s DAI', Number(balance_before) - Number(balance_after));
});
