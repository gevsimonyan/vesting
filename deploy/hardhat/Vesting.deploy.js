module.exports = async ({
	run,
	ethers: {
		getContractAt,
		getNamedSigners,
		utils: { parseEther }
	}
}) => {
	await run("deploy:vesting");
	
};
module.exports.tags = ["vesting", "Hardhat"];
