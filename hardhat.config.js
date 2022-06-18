require("dotenv").config();

require("@typechain/hardhat");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("hardhat-contract-sizer");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-solhint");
require("hardhat-tracer");
require("hardhat-spdx-license-identifier");
require("hardhat-docgen");
require("hardhat-dependency-compiler");
require("@atixlabs/hardhat-time-n-mine");
require("hardhat-local-networks-config-plugin");
require("hardhat-log-remover");
require("@tenderly/hardhat-tenderly");
require("@nomiclabs/hardhat-web3");
// require("@nomiclabs/hardhat-solpp");
const { removeConsoleLog } = require("hardhat-preprocessor");

require("./tasks");

// const getNetwork = function () {
// 	const args = process.argv.slice(2);
// 	const networkIndex = args.findIndex((el, i, arr) => {
// 		return arr[i - 1] === "--network";
// 	});
// 	return networkIndex === -1 ? "hardhat" : args[networkIndex];
// };

// const getSolppDefs = function () {
// 	return require("./utils/constants/solpp")(getNetwork());
// };

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const TENDERLY_PROJECT = process.env.TENDERLY_PROJECT || "";
const TENDERLY_USERNAME = process.env.TENDERLY_USERNAME || "";
const HARDHAT_DEPENDENCY_COMPILER_KEEP = (process.env.HARDHAT_DEPENDENCY_COMPILER_KEEP === "true");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
	solidity: {
		compilers: [
			{
				version: "0.8.7",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200
					}
				}
			},
			{
				version: "0.5.16",
				settings: {
					optimizer: {
						enabled: true,
						runs: 200
					}
				}
			}
		]
	},
	namedAccounts: {
		deployer: {
			default: 0
		},
		owner: {
			default: 1
		},
		caller: {
			default: 2
		},
		holder: {
			default: 3
		},
		vzgo: {
			default: 4
		},
		grno: {
			default: 5
		},
		toni: {
			default: 6
		},
		chugun: {
			default: 7
		},
		shumi: {
			default: 8
		},
		arni: {
			default: 9
		},
		minter: {
			default: 10
		},
		treasury: {
			default: 11
		}
	},
	networks: {
		hardhat: {}
	},
	spdxLicenseIdentifier: {
		overwrite: false,
		runOnCompile: false
	},
	dependencyCompiler: {
		paths: ["@openzeppelin/contracts/token/ERC20/IERC20.sol"],
		keep: HARDHAT_DEPENDENCY_COMPILER_KEEP
	},
	docgen: {
		path: "./docgen",
		clear: true,
		runOnCompile: true
	},
	localNetworksConfig: `${process.cwd()}/networks.js`,
	gasReporter: {
		coinmarketcap: COINMARKETCAP_API_KEY,
		enabled: false,
		currency: "USD",
		showMethodSig: false,
		showTimeSpent: true
	},
	etherscan: {
		apiKey: ETHERSCAN_API_KEY
	},
	typechain: {
		outDir: "typechain",
		target: "ethers-v5"
	},
	contractSizer: {
		alphaSort: true,
		runOnCompile: false,
		disambiguatePaths: false
	},
	tenderly: {
		project: TENDERLY_PROJECT,
		username: TENDERLY_USERNAME
	},
	preprocess: {
		eachLine: removeConsoleLog((hre) => hre.network.name !== "hardhat" && hre.network.name !== "localhost")
	},
	// solpp: {
	// 	defs: getSolppDefs(),
	// 	noPreprocessor: true,
	// 	noFlatten: true
	// }
};
