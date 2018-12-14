require('dotenv').config();

var HDWalletProvider = require('truffle-hdwallet-provider');
var infuraUrl = 'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY;

module.exports = {
  networks: { 
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: "*"
    }, 
    rinkeby: {
      provider: function() { 
        return new HDWalletProvider(process.env.MNEMONIC, infuraUrl) 
      },
      network_id: 4,
      gas: 4500000,
      gasPrice: 10000000000,      
    }
  }
};