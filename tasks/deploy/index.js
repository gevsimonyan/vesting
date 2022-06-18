const { task } = require("hardhat/config");
const {
	deployVesting
} = require("./deploy");

task("deploy:vesting", "Deploy Vesting contract", deployVesting);
