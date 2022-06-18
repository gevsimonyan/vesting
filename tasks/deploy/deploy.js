async function deployVesting({ msg }, { deployments: { deploy }, ethers: { getNamedSigners, getContract, utils } }) {
	const { deployer } = await getNamedSigners();

	await deploy("Vesting", {
		from: deployer.address,
		contract: "Vesting",
		args: [],
		log: true
	});

	const vesting = await getContract("Vesting");
	
	return vesting;
}


module.exports = {
	deployVesting
};
