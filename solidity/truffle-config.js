// See <http://truffleframework.com/docs/advanced/configuration>
var HDWalletProvider = require("truffle-hdwallet-provider");

var WALLET_PK = "F1437FDDF08A9684EA73358A5F13AD0E29FAAF6A5CC9D7AFC35779F806DBA8D4";

module.exports = {
    networks: {
        development: {
            host:       "localhost",
            port:       7545,
            network_id: "*",         // Match any network id
            gasPrice:   2000000000, // Gas price used for deploys
            gas:        80000000      // Gas limit used for deploys
        },
        // production: {
        //     host:       "localhost",
        //     port:       7545,
        //     network_id: "*",         // Match any network id
        //     gasPrice:   20000000000, // Gas price used for deploys
        //     gas:        5712388      // Gas limit used for deploys
        // },
        coverage: {     // See <https://www.npmjs.com/package/solidity-coverage#network-configuration>
            host:       "localhost",
            port:       7555,            // Also in .solcover.js
            network_id: "*",             // Match any network id
            gasPrice:   0x1,             // Gas price used for deploys
            gas:        0x1fffffffffffff // Gas limit used for deploys
        },
        POA: {
            provider: new HDWalletProvider(
                WALLET_PK,
                "https://core.poa.network"
            ),
            network_id: "*",             // Match any network id
            gasPrice:   20000000000, // Gas price used for deploys
            gas:        5712388      // Gas limit used for deploys
        },
        SOKOL: {
            provider: new HDWalletProvider(
                WALLET_PK,
                "https://sokol.poa.network"
            ),
            network_id: "*",             // Match any network id
            gasPrice:   2000000000, // Gas price used for deploys
            gas:        8000000,      // Gas limit used for deploys
            skipDryRun: true
        }
    },
    mocha: {
        enableTimeouts: false,
        useColors:      true,
        bail:           true,
        reporter:       "list" // See <https://mochajs.org/#reporters>
    },
    compilers: {
        solc: {
            version: "0.4.24",
            settings: {
                optimizer: {
                    enabled: true,
                    runs:    200
                }
            }
        }

    },
    solc: {
        optimizer: {
            enabled: true,
            runs:    200
        }
    }
};
