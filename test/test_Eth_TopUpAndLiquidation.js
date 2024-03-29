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

contract("Lending contract (Top up ETH collateral function)", function (accounts) {
    before(async () => {
      avaxInstance = await Avax.deployed();
      priceFeedInstance = await PriceFeed.deployed();
      reservesInstance = await Reserves.deployed();
      liquidityPoolInstance = await LiquidityPool.deployed();
      lendingInstance = await Lending.deployed();
    });
  
    it("1. Testing Top up function", async () => {

      //Initialise the Pool
      await liquidityPoolInstance.transferEth({
        from: accounts[0],
        value: oneEth,
      });

      await lendingInstance.borrowEth({ from: accounts[5], value: oneEth });

      let userOriginalCollateral = await lendingInstance.getETHCollateralLedgerAmount({from : accounts[5]});
      userOriginalCollateral = Number(userOriginalCollateral / oneEth);

      let userOriginalBalance = await web3.eth.getBalance(accounts[5]);
      userOriginalBalance  = Number(userOriginalBalance / oneEth);

      //Contract Balance
      let contractBalanceBefore = await web3.eth.getBalance(lendingInstance.address);
      contractBalanceBefore = Number(contractBalanceBefore / oneEth);

      await lendingInstance.topUpETHCollateral({from : accounts[5], value : oneEth});

      //Check whether user balance has been deducted correctly
      let userExpectedBalance = userOriginalBalance - 1;
      userExpectedBalance = Number(userExpectedBalance);

      let userBalanceAfter = await web3.eth.getBalance(accounts[5]);
      userBalanceAfter = Number(userBalanceAfter / oneEth);

      //Check whether the Collateral ledger has been updated
      let userNewCollateral = await lendingInstance.getETHCollateralLedgerAmount({from : accounts[5]});
      userNewCollateral = Number(userNewCollateral/ oneEth);

      let userExpectedCollateral = userOriginalCollateral + 1;
      userExpectedCollateral = Number(userExpectedCollateral); 

      //Whether contract has received the correct amount
      let contractBalanceAfter = await web3.eth.getBalance(lendingInstance.address);
      contractBalanceAfter = Number(contractBalanceAfter / oneEth);

      contractExpectedBalance = contractBalanceBefore + 1;


      await assert.strictEqual(
        Math.floor(userExpectedBalance),
        Math.floor(userBalanceAfter),
        "The User expected Balance is wrong!."
      );

      await assert.strictEqual(
        Math.floor(userExpectedCollateral),
        Math.floor(userNewCollateral),
        "The User expected Collateral is not wrong!."
      );

      await assert.strictEqual(
        Math.floor(contractExpectedBalance),
        Math.floor(contractBalanceAfter),
        "The expected Contract Balance is wrong!."
      );
    });

    it("2. Testing Top up function whether another user can top up the collateral", async () => {

      await truffleAssert.reverts(
        lendingInstance.topUpETHCollateral({ from: accounts[6] , value : oneEth}),
        "You do not have any outstanding debt"
      );
    });

    contract("Lending contract (ETH Liquidation Function)", function (accounts) {
      before(async () => {
        avaxInstance = await Avax.deployed();
        priceFeedInstance = await PriceFeed.deployed();
        reservesInstance = await Reserves.deployed();
        liquidityPoolInstance = await LiquidityPool.deployed();
        lendingInstance = await Lending.deployed();
      });

      it("1. Testing ETH Liquidation function, whether non owners can call the function", async () => {
        await truffleAssert.reverts(
          lendingInstance.liquidateETH({ from: accounts[5] }),
          "Only the Owner can call this function"
        );
      });
    
      it("2. Testing Liquidation function", async () => {

        await liquidityPoolInstance.transferEth({
          from: accounts[0],
          value: oneEth,
        });

        let originalLPBalance = await web3.eth.getBalance(liquidityPoolInstance.address);
        originalLPBalance = Number(originalLPBalance / oneEth);

        await lendingInstance.borrowEth({ from: accounts[5], value: oneEth });
    
        await lendingInstance.liquidateETH({ from: accounts[0] });

        let expectedBalance = originalLPBalance - 0.76 + 0.95;

        let newLPBalance = await web3.eth.getBalance(liquidityPoolInstance.address);
        newLPBalance = Number(newLPBalance/ oneEth);
    
    
        await assert.strictEqual(
          expectedBalance,
          newLPBalance, //User forfeits his collateral
          "The Liquidation function is not working."
        );
    
      });
    
      it("2. Test whether loan records have been removed", async () => {
        await truffleAssert.reverts(
            lendingInstance.repayAVAXDebt({ from: accounts[5] }),
            "You do not have any outstanding debt"
          );
      });

      it("3. Test whether ETH Liquidation Counter has increased", async () => {
        let repaymentCounter = await lendingInstance.getUserTotaETHLiquidationAmount({from : accounts[5]});
        repaymentCounter = Number(repaymentCounter);
    
        expectedCount = Number(1);
        await assert.strictEqual(
          repaymentCounter,
          expectedCount, 
          "The return counter is wrong!"
        );
      });
    });
});