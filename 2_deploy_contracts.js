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

const BancorConverter2 = artifacts.require('BancorConverter2');
const BancorConverter3 = artifacts.require('BancorConverter3');

const SmartToken2 = artifacts.require('SmartToken2');
const SmartToken3 = artifacts.require('SmartToken3');

/* eslint-disable prefer-reflect */

const Web3Utils = require('web3-utils');


module.exports = function(deployer, network, accounts) {
    let overwrite = true;
    let retry = false;

    const weight10Percent = 100000;
    const gasPrice = 22000000000;
    const gasPriceBadHigh = 22000000001;

    const WeiToEth = wei =>  Web3Utils.fromWei(wei.toString());

    const printTokenInfo = async (token, holder, holder_name, precision = undefined) => {
        let tokenName = await token.symbol()
        let supplyWEI = await token.totalSupply();
        let balanceWEI = await token.balanceOf(holder);

        let supply = WeiToEth(supplyWEI);
        let balance = WeiToEth(balanceWEI);

        if (precision !== undefined) {
            supply = Math.round(supply * 10**precision) / 10**precision;
            balance = Math.round(balance * 10**precision) / 10**precision;
        }

        console.log(`Total ${tokenName} supply is ${supply}`);
        console.log(`${holder_name} balance of ${tokenName} is ${balance}`);
    };

    let title = (title) => {console.log('~~~~~~~~~~' + title.toString() + '~~~~~~~~~~')};

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
                    let networkContract = contracts['BANCOR_NETWORK'];

                    await trystage( deployer.deploy(BancorConverterFactory).then(async (instance) =>
                        registerContract(instance, 'BANCOR_CONVERTER_FACTORY')
                    ));

                    await trystage( deployer.deploy(BancorConverterUpgrader, contractRegistry.address)
                        .then(async (instance) =>
                            registerContract(instance, 'BANCOR_CONVERTER_UPGRADER')
                        ));

                    let bancorXId = await contractIds.BANCOR_X.call();
                    await contractRegistry.registerAddress(bancorXId, accounts[0]);

                    title('Creating Smart Tokens');

                    await trystage( deployer.deploy(SmartToken, 'Network Dai', 'nDAI', 18)
                        .then(async (instance) =>
                        {
                            contracts['nDAI'] = instance;
                        }));
                    let networkDai = contracts['nDAI'];
                    //Necessary for non-zero initial reserves?
                    await networkDai.issue(accounts[0], 3);

                    await trystage( deployer.deploy(SmartToken2, 'CIC1', 'CIC1', 18)
                        .then(async (instance) =>
                        {
                            contracts['CIC1'] = instance;
                        }));
                    let cic1 = contracts['CIC1'];
                    await cic1.issue(accounts[0], 1000);


                    await trystage( deployer.deploy(SmartToken3, 'CIC2', 'CIC2', 18)
                        .then(async (instance) =>
                        {
                            contracts['CIC2'] = instance;
                        }));

                    let cic2 = contracts['CIC2'];
                    await cic2.issue(accounts[0], 1000);

                    title('Creating Wrapped xDAI Token');
                    await trystage( deployer.deploy(WrappedDai, 'Wrapped DAI', 'wDAI')
                        .then(async (instance) =>
                        {
                            contracts['WRAPPED_DAI'] = instance;
                        }));
                    let wrappedDai = contracts['WRAPPED_DAI'];

                    console.log('Minting Wrapped xDAI from Eth');
                    let weiAmount = Web3Utils.toWei('4');
                    let sendres = await wrappedDai.sendTransaction({from: accounts[0], value: weiAmount});


                    title('Deploying network Converter');
                    await trystage( deployer.deploy(
                        BancorConverter,
                        networkDai.address, contractRegistry.address, 30000, wrappedDai.address, 1000000
                        ).then(async (instance) => {
                            contracts['NETWORK_CONVERTER'] = instance;
                        }));
                    let networkConverter = contracts['NETWORK_CONVERTER'];

                    title('Deploying CIC1 Converter');
                    await trystage( deployer.deploy(
                        BancorConverter2,
                        cic1.address, contractRegistry.address, 30000, networkDai.address, 250000
                    ).then(async (instance) => {
                        contracts['CONVERTER_1'] = instance;
                    }));
                    let converter1 = contracts['CONVERTER_1'];

                    title('Deploying CIC2 Converter');
                    await trystage( deployer.deploy(
                        BancorConverter3,
                        cic2.address, contractRegistry.address, 30000, networkDai.address, 250000
                    ).then(async (instance) => {
                        contracts['CONVERTER_2'] = instance;
                    }));
                    let converter2 = contracts['CONVERTER_2'];

                    title('Transfer reserve token balance to converters')
                    let tr = await wrappedDai.transfer(networkConverter.address,  10);

                    let tr2 = await networkDai.transfer(converter1.address,  10);
                    let tr3 = await networkDai.transfer(converter2.address,  10);

                    await wrappedDai.approve(networkConverter.address, Web3Utils.toWei('1000000'));
                    await wrappedDai.approve(converter1.address, Web3Utils.toWei('1000000'));
                    await wrappedDai.approve(converter2.address, Web3Utils.toWei('1000000'));

                    await networkDai.approve(networkConverter.address, Web3Utils.toWei('1000000'));
                    await networkDai.approve(converter1.address, Web3Utils.toWei('1000000'));
                    await networkDai.approve(converter2.address, Web3Utils.toWei('1000000'));

                    await cic1.approve(networkConverter.address, Web3Utils.toWei('1000000'));
                    await cic1.approve(converter1.address, Web3Utils.toWei('1000000'));
                    await cic1.approve(converter2.address, Web3Utils.toWei('1000000'));

                    await cic2.approve(networkConverter.address, Web3Utils.toWei('1000000'));
                    await cic2.approve(converter1.address, Web3Utils.toWei('1000000'));
                    await cic2.approve(converter2.address, Web3Utils.toWei('1000000'));


                    // let r1 = await cic1.allowance(converter2.address)
                    // console.log('allowance is', r1)

                    title('Transfering CIC ownerships to Converters');

                    await networkDai.transferOwnership(networkConverter.address);
                    await networkConverter.acceptTokenOwnership();

                    await cic1.transferOwnership(converter1.address);
                    await converter1.acceptTokenOwnership();

                    await cic2.transferOwnership(converter2.address);
                    await converter2.acceptTokenOwnership();

                    let nDaiBuyPath = [wrappedDai.address, networkDai.address, networkDai.address];
                    let nDaiSellPath = [networkDai.address, networkDai.address, wrappedDai.address];

                    let cic1BuyPath = [networkDai.address, cic1.address, cic1.address];
                    let cic1SellPath = [cic1.address, cic1.address, networkDai.address];

                    let cic2BuyPath = [networkDai.address, cic2.address, cic2.address];
                    let cic2SellPath = [cic2.address, cic2.address, networkDai.address];

                    title('Testing CIC1 to CIC2 Transfer')
                    let cic1Tocic2Path = [cic1.address, networkDai.address, cic2.address];

                    let purchaseRes3 = await networkContract.convertFor(cic1Tocic2Path, 2, 1, accounts[0], true)
                        .on('data', event => console.log('event is', event));
                    console.log(purchaseRes3)


                    title('CONVERT: Wrapped Dai to network Dai')

                    await printTokenInfo(wrappedDai, networkConverter.address, 'Converter', 4);
                    await printTokenInfo(wrappedDai, accounts[0], 'Account', 4);

                    await printTokenInfo(networkDai, accounts[0], 'Account', 4);

                    let wDaiPayAmmount = Web3Utils.toWei('0.5');
                    console.log('Paid (wDAI): ',Web3Utils.fromWei(wDaiPayAmmount))

                    console.log('##### AFTER #####')

                    let nDaiPurchaseRes = await networkConverter.quickConvert(nDaiBuyPath, wDaiPayAmmount, '1');

                    await printTokenInfo(wrappedDai, networkConverter.address, 'Converter', 4);
                    await printTokenInfo(wrappedDai, accounts[0], 'Account', 4);

                    await printTokenInfo(networkDai, accounts[0], 'Account', 4);



                    title('CONVERT: network Dai to CIC1')
                    await printTokenInfo(networkDai, converter1.address, 'Converter', 4);
                    await printTokenInfo(networkDai, accounts[0], 'Account', 4);

                    await printTokenInfo(cic1, accounts[0], 'Account');

                    let payAmount0 = Web3Utils.toWei('0.1');
                    console.log('Paid (nDAI): ',Web3Utils.fromWei(payAmount0))


                    let purchaseRes0 = await converter1.quickConvert(cic1BuyPath, payAmount0, '1');

                    console.log('##### AFTER #####')
                    await printTokenInfo(cic1, accounts[0], 'Account');
                    await printTokenInfo(networkDai, accounts[0], 'Account', 4);


                    title('CONVERT: CIC1 to network Dai')

                    console.log('Paid (CIC1): ', '0.000000000000007782')
                    let purchaseRes1 = await converter1.quickConvert(cic1SellPath, Web3Utils.toWei('0.000000000000007782'), '1');

                    console.log('##### AFTER #####')
                    await printTokenInfo(cic1, accounts[0], 'Account');
                    await printTokenInfo(networkDai, accounts[0], 'Account', 4);


                    title('CONVERT: network Dai to CIC2')
                    await printTokenInfo(networkDai, converter2.address, 'Converter', 4);
                    await printTokenInfo(networkDai, accounts[0], 'Account', 4);

                    await printTokenInfo(cic2, accounts[0], 'Account');

                    let payAmount2 = Web3Utils.toWei('0.1');
                    console.log('Paid (nDAI): ',Web3Utils.fromWei(payAmount2))

                    let purchaseRes2 = await converter2.quickConvert(cic2BuyPath, payAmount2, '1');

                    console.log('##### AFTER #####')
                    await printTokenInfo(cic2, accounts[0], 'Account');
                    await printTokenInfo(networkDai, accounts[0], 'Account', 4);


                    // console.log('~~~~Testing Transfer 1~~~~~')
                    //
                    // let payAmount = Web3Utils.toWei('1');
                    // let purchaseRes = await converter.convert(smartToken.address, smartToken2.address, payAmount, 1);
                    // let purchaseAmount1 = getConversionAmount(purchaseRes);
                    // console.log('Paid (CC): ', Web3Utils.fromWei(payAmount.toString()))
                    // console.log('Recieved (DAI): ', Web3Utils.fromWei(purchaseAmount1.toString()))
                    //

                    // console.log('~~~~Testing Transfer 2~~~~~')
                    //
                    // let payAmount2 = Web3Utils.toWei('0.1');
                    // let purchaseRes2 = await converter.convert(smartToken.address, connectorToken.address, payAmount2, 1);
                    // let purchaseAmount2 = getConversionAmount(purchaseRes2);
                    // console.log('Paid (CC): ', Web3Utils.fromWei(payAmount2.toString()))
                    // console.log('Recieved (DAI): ', Web3Utils.fromWei(purchaseAmount2.toString()))
                    //
                    // // let purchaseRes2 = await converter.convert(smartToken.address, connectorToken.address, 700, 1);
                    //
                    // console.log('~~~~Testing Transfer 0~~~~~')
                    //
                    // let payAmount0 = Web3Utils.toWei('0.001');
                    // let purchaseRes0 = await converter.convert(connectorToken.address, smartToken.address, payAmount0, 1);
                    // let purchaseAmount0 = getConversionAmount(purchaseRes0);
                    // console.log('Paid (DAI): ', Web3Utils.fromWei(payAmount0.toString()))
                    // console.log('Recieved (CC): ', Web3Utils.fromWei(purchaseAmount0.toString()))
                    // //
                    //
                    // let purchaseRes3 = await converter.convert(connectorToken.address, smartToken.address, 200, 1);

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