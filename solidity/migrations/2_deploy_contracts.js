/* global artifacts */
const NonStandardTokenRegistry = artifacts.require('NonStandardTokenRegistry');
const BancorNetwork = artifacts.require('BancorNetwork');
const ContractIds = artifacts.require('ContractIds');
const BancorConverter = artifacts.require('BancorConverter');
const SmartToken = artifacts.require('SmartToken');
const BancorFormula = artifacts.require('BancorFormula');
const BancorGasPriceLimit = artifacts.require('BancorGasPriceLimit');
const ContractRegistry = artifacts.require('ContractRegistry');
const ContractFeatures = artifacts.require('ContractFeatures');
const TestERC20Token = artifacts.require('TestERC20Token');
const WrappedDai = artifacts.require('WrappedDai');
const TestNonStandardERC20Token = artifacts.require('TestNonStandardERC20Token');
const BancorConverterFactory = artifacts.require('BancorConverterFactory');
const BancorConverterUpgrader = artifacts.require('BancorConverterUpgrader');
/* eslint-disable prefer-reflect */

const Web3Utils = require('web3-utils');


module.exports = function(deployer, network, accounts) {
    let overwrite = true;
    let retry = false;

    const weight10Percent = 100000;
    const gasPrice = 22000000000;
    const gasPriceBadHigh = 22000000001;

    if (network == "production" || network == "SOKOL" || true) {
        deployer.then( async () => {
            let reached = 0;
            let current = 0;

            function getConversionAmount(transaction, logIndex = 0) {
                return transaction.logs[logIndex].args._return.toNumber();
            }

            const trystage = async (method) => {
                current += 1;
                console.log('current stage is ', current);
                console.log('reached stage is ', reached);
                if (reached <= current) {
                    // We haven't passed this stage, so try it

                    if (reached < current) {
                        //    This is the first time we've tried this stage, reset failure counts
                        failures = 0;
                    }

                    reached = current;
                    return method
                }
            };

            const registerContract = async (instance,name) => {
                contracts[name] = instance;
                let contractIds = contracts['CONTRACT_IDS'];
                let contractRegistry = contracts['CONTRACT_REGISTRY'];

                let instance_id = await contractIds[name].call();

                let res = await contractRegistry.registerAddress(instance_id, instance.address);

            };

            let contracts = {};

            let success = false;
            let failures = 0;
            while (!success && failures < 3) {
                current = 0;
                try {


                    await trystage( deployer.deploy(ContractRegistry).then((instance) => {
                        contracts['CONTRACT_REGISTRY'] = instance;
                    }));
                    let contractRegistry = contracts['CONTRACT_REGISTRY'];

                    await trystage( deployer.deploy(ContractIds).then((instance) => {
                        contracts['CONTRACT_IDS'] = instance;
                    }));
                    let contractIds = contracts['CONTRACT_IDS'];

                    await trystage( deployer.deploy(ContractFeatures).then(async (instance) =>
                        registerContract(instance, 'CONTRACT_FEATURES')
                    ));

                    await trystage( deployer.deploy(BancorGasPriceLimit, gasPrice).then(async (instance) =>
                        registerContract(instance, 'BANCOR_GAS_PRICE_LIMIT')
                    ));

                    await trystage( deployer.deploy(BancorFormula).then(async (instance) =>
                        registerContract(instance, 'BANCOR_FORMULA')
                    ));

                    await trystage( deployer.deploy(NonStandardTokenRegistry).then(async (instance) =>
                        registerContract(instance, 'NON_STANDARD_TOKEN_REGISTRY')
                    ));

                    await trystage( deployer.deploy(BancorNetwork, contractRegistry.address)
                        .then(async (instance) =>
                            registerContract(instance, 'BANCOR_NETWORK')
                        )
                        .then(async () =>{
                            let res = await contracts['BANCOR_NETWORK'].setSignerAddress(accounts[0])
                        }));

                    await trystage( deployer.deploy(BancorConverterFactory).then(async (instance) =>
                        registerContract(instance, 'BANCOR_CONVERTER_FACTORY')
                    ));

                    await trystage( deployer.deploy(BancorConverterUpgrader, contractRegistry.address)
                        .then(async (instance) =>
                            registerContract(instance, 'BANCOR_CONVERTER_UPGRADER')
                        ));

                    let bancorXId = await contractIds.BANCOR_X.call();
                    await contractRegistry.registerAddress(bancorXId, accounts[0]);


                    await trystage( deployer.deploy(SmartToken, 'SMART20', 'SM20', 2)
                        .then(async (instance) =>
                        {
                            contracts['SMART_TOKEN'] = instance;
                        }));

                    let smartToken = contracts['SMART_TOKEN'];

                    await trystage( deployer.deploy(WrappedDai, 'Wrapped DAI 2', 'WDAI')
                        .then(async (instance) =>
                        {
                            contracts['CONNECTOR_1'] = instance;
                        }));

                    let connectorToken = contracts['CONNECTOR_1'];

                    let weiAmount = Web3Utils.toWei('0.1');
                    let sendres = await connectorToken.sendTransaction({from: accounts[0], value: weiAmount});

                    await trystage( deployer.deploy(
                        BancorConverter,
                        smartToken.address, contractRegistry.address, 30000, contracts['CONNECTOR_1'].address, 250000
                        ).then(async (instance) => {
                            contracts['CONVERTER'] = instance;
                        }));

                    let converter = contracts['CONVERTER'];

                    let ir = await smartToken.issue(accounts[0], 20000);
                    // console.log('ir res', ir);

                    let tr = await contracts['CONNECTOR_1'].transfer(converter.address, 5000);
                    // console.log('tr res', tr);

                    let t0r = await smartToken.transferOwnership(converter.address);
                    // console.log('t0r res', t0r);

                    let a0r = await converter.acceptTokenOwnership();
                    // console.log('a0r res', a0r);

                    let approveRes = await connectorToken.approve(converter.address, 500000000);

                    console.log('approveRes', approveRes);

                    let purchaseRes = await converter.convert(smartToken.address, connectorToken.address, 500, 1);

                    console.log('purchaseRes', purchaseRes);

                    let purchaseAmount1 = getConversionAmount(purchaseRes);

                    console.log('purchase amount 1', purchaseAmount1)

                    let purchaseRes2 = await converter.convert(smartToken.address, connectorToken.address, 700, 1);

                    console.log('purchaseRes2', purchaseRes2);

                    let purchaseRes3 = await converter.convert(connectorToken.address, smartToken.address, 200, 1);

                    console.log('purchaseRes3', purchaseRes3);

                    success = true
                } catch (e) {
                    if (!retry) {
                        throw e
                    }
                    failures += 1

                    console.log('failure number: ', failures)
                    console.log(e)
                }

            }

        })
    }
};