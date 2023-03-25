const _deploy_contracts = require("../migrations/2_deploy_contracts");
const truffleAssert = require("truffle-assertions"); //npm install truffle-assertions
const BigNumber = require('bignumber.js'); // npm install bignumber.js
var assert = require("assert");

const oneEth = new BigNumber(1000000000000000000); // 1 eth

var Avax = artifacts.require("../contracts/Avax.sol");
var Reserves = artifacts.require("../contracts/Reserves.sol");
var LiquidityPool =  artifacts.require("../contracts/LiquidityPool.sol");
var PriceFeed = artifacts.require("../contracts/PriceFeed.sol");
var Lending = artifacts.require("../contracts/Lending.sol");

contract("Lending contract (Top up AVAX collateral Function)", function (accounts) {
  before(async () => {
    avaxInstance = await Avax.deployed();
    priceFeedInstance = await PriceFeed.deployed();
    reservesInstance = await Reserves.deployed();
    liquidityPoolInstance = await LiquidityPool.deployed();
    lendingInstance = await Lending.deployed();
  });

  it("1. Testing Top up function", async () => {
    await liquidityPoolInstance.InitialiseLP();
    await avaxInstance.getCredit({ from: accounts[5], value: oneEth });
    await lendingInstance.borrowAVAX(100, { from: accounts[5] });

    let userBalance = await avaxInstance.checkCredit({ from: accounts[5] });
    userBalance = Number(userBalance);
  });

  it("2. Testing Top up function when user does not have enough Avax tokens", async () => {
    await truffleAssert.reverts(
      lendingInstance.topUpAVAXCollateral(100, { from: accounts[5] }),
      "You do not have enough AVAX token!"
    );
  });

  it("3. Testing Top up function, whether Lending contract has updated the new amount", async () => {
    await avaxInstance.getCredit({ from: accounts[5], value: oneEth });
    await lendingInstance.topUpAVAXCollateral(100, { from: accounts[5] });

    let newHoldingCollateral = await lendingInstance.getHoldingAVAXCollateral();
    newHoldingCollateral = Number(newHoldingCollateral);
    await assert.strictEqual(
      newHoldingCollateral,
      195,
      "The amount of Avax received is not correct."
    );
  });
});

contract("Lending contract (AVAX Liquidation Function)", function (accounts) {
  before(async () => {
    avaxInstance = await Avax.deployed();
    priceFeedInstance = await PriceFeed.deployed();
    reservesInstance = await Reserves.deployed();
    liquidityPoolInstance = await LiquidityPool.deployed();
    lendingInstance = await Lending.deployed();
  });

  it("1. Testing Liquidation function", async () => {
    await liquidityPoolInstance.InitialiseLP();
    await avaxInstance.getCredit({ from: accounts[5], value: oneEth });
    await lendingInstance.borrowAVAX(100, { from: accounts[5] });

    await lendingInstance.liquidateAVAX();

    let userBalance = await avaxInstance.checkCredit({ from: accounts[5] });
    userBalance = Number(userBalance);

    await assert.strictEqual(
      userBalance,
      76, //User forfeits his collateral
      "The amount of Avax received is not correct."
    );

    let LPBalance = await liquidityPoolInstance.getAvaxTvl();
    LPBalance = Number(LPBalance);

    await assert.strictEqual(
      LPBalance,
      1019, //Collateral taken was 100, but loaned only 85, upon liquidation, Lending contract absorbs all collateral and sends it back to the LP
      "The amount of Avax received is not correct."
    );
  });

  it("2. Test whether loan records have been removed", async () => {
    await truffleAssert.reverts(
        lendingInstance.repayAVAXDebt({ from: accounts[5] }),
        "You do not have any outstanding debt"
      );
  });
});