var MyContract = web3.eth.contract(abi);
var myContractInstance = MyContract.at('0x78e97bcc5b5dd9ed228fed7a4887c0d7287344a9');
// watch for an event with {some: 'args'}
var myEvent = myContractInstance.myEvent({some: 'args'}, {fromBlock: 0, toBlock: 'latest'});
myEvent.watch(function(error, result){
...
});
// would get all past logs again.
var myResults = myEvent.get(function(error, logs){ ... });
...
// would stop and uninstall the filter
myEvent.stopWatching();